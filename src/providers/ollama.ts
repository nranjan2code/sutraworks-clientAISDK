/**
 * Ollama local model provider adapter
 * @module providers/ollama
 */

import type {
  ProviderName,
  ProviderConfig,
  ChatRequest,
  ChatResponse,
  ChatStreamDelta,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  Message,
} from '../types';
import { BaseProvider } from './base';
import { EventEmitter } from '../utils/events';
import { parseNDJSONStream } from '../streaming/parser';

/**
 * Ollama API types
 */
interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * Ollama provider implementation
 * Connects to local Ollama instance for running open-source models
 */
export class OllamaProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    // Ollama doesn't require an API key by default
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'ollama';
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
      case 'embeddings':
        return true;
      case 'vision':
        return true; // Supported by some models like llava
      case 'tools':
        return false; // Not natively supported yet
      default:
        return false;
    }
  }

  protected getAuthHeaders(_apiKey: string): Record<string, string> {
    // Ollama typically doesn't require authentication
    return {};
  }

  private async makeOllamaRequest<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      signal?: AbortSignal;
      stream?: boolean;
    } = {}
  ): Promise<T | Response> {
    const baseUrl = this.config.baseUrl ?? 'http://localhost:11434/api';
    const url = `${baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout ?? 120000); // Longer timeout for local models

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        method: options.method ?? 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (options.stream) {
        return response;
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    this.emitRequestStart(requestId, request.model);

    try {
      const response = await this.retry(async () => {
        return this.makeOllamaRequest<OllamaChatResponse>('/chat', {
          body: this.buildChatBody(request, false),
          signal: request.signal,
        });
      }, request.signal);

      const result = this.transformChatResponse(response as OllamaChatResponse);
      const duration = Date.now() - startTime;
      this.emitRequestEnd(requestId, request.model, duration, result.usage);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.emitRequestError(requestId, request.model, error as Error, duration);
      throw error;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatStreamDelta> {
    const requestId = this.generateRequestId();
    this.emitStreamStart(requestId, request.model);

    let chunkCount = 0;

    try {
      const response = await this.makeOllamaRequest<Response>('/chat', {
        body: this.buildChatBody(request, true),
        signal: request.signal,
        stream: true,
      });

      const body = (response as Response).body;
      if (!body) {
        throw new Error('No response body');
      }

      for await (const chunk of parseNDJSONStream<OllamaStreamChunk>(body)) {
        chunkCount++;
        yield this.transformStreamChunk(chunk);
      }

      this.emitStreamEnd(requestId, request.model, chunkCount);
    } catch (error) {
      this.emitStreamError(requestId, request.model, error as Error);
      throw error;
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const embeddings: number[][] = [];

    for (const input of inputs) {
      const response = await this.retry(async () => {
        return this.makeOllamaRequest<OllamaEmbeddingResponse>('/embeddings', {
          body: {
            model: request.model,
            prompt: input,
          },
          signal: request.signal,
        });
      }, request.signal);

      embeddings.push((response as OllamaEmbeddingResponse).embedding);
    }

    return {
      object: 'list',
      data: embeddings.map((embedding, index) => ({
        object: 'embedding',
        index,
        embedding,
      })),
      model: request.model,
      provider: this.name,
      usage: {
        prompt_tokens: 0, // Ollama doesn't return token counts for embeddings
        total_tokens: 0,
      },
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await this.makeOllamaRequest<{ models: OllamaModel[] }>('/tags', {
      method: 'GET',
    });

    return (response as { models: OllamaModel[] }).models.map((model) =>
      this.transformModelInfo(model)
    );
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void> {
    const response = await this.makeOllamaRequest<Response>('/pull', {
      body: { name: modelName },
      stream: true,
    });

    const body = (response as Response).body;
    if (!body) return;

    for await (const chunk of parseNDJSONStream<{ status: string; completed?: number; total?: number }>(body)) {
      if (chunk.completed && chunk.total && onProgress) {
        onProgress(chunk.completed / chunk.total);
      }
    }
  }

  /**
   * Check if Ollama server is running
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.makeOllamaRequest<unknown>('/tags', { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }

  private buildChatBody(request: ChatRequest, stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: this.transformMessages(request.messages),
      stream,
    };

    const options: Record<string, unknown> = {};
    if (request.temperature !== undefined) options.temperature = request.temperature;
    if (request.top_p !== undefined) options.top_p = request.top_p;
    if (request.max_tokens !== undefined) options.num_predict = request.max_tokens;
    if (request.stop !== undefined) {
      options.stop = Array.isArray(request.stop) ? request.stop : [request.stop];
    }
    if (request.presence_penalty !== undefined) options.presence_penalty = request.presence_penalty;
    if (request.frequency_penalty !== undefined) options.frequency_penalty = request.frequency_penalty;

    if (Object.keys(options).length > 0) {
      body.options = options;
    }

    return body;
  }

  private transformMessages(messages: Message[]): OllamaMessage[] {
    return messages.map((message) => {
      const ollamaMessage: OllamaMessage = {
        role: message.role as 'system' | 'user' | 'assistant',
        content: typeof message.content === 'string' ? message.content : '',
      };

      // Handle multimodal content
      if (Array.isArray(message.content)) {
        const textParts: string[] = [];
        const images: string[] = [];

        for (const part of message.content) {
          if (part.type === 'text' && part.text) {
            textParts.push(part.text);
          }
          if (part.type === 'image_base64' && part.image_base64) {
            images.push(part.image_base64.data);
          }
        }

        ollamaMessage.content = textParts.join('\n');
        if (images.length > 0) {
          ollamaMessage.images = images;
        }
      }

      return ollamaMessage;
    });
  }

  private transformChatResponse(response: OllamaChatResponse): ChatResponse {
    return {
      id: `ollama-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(new Date(response.created_at).getTime() / 1000),
      model: response.model,
      provider: this.name,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.message.content,
          },
          finish_reason: response.done ? 'stop' : null,
        },
      ],
      usage: {
        prompt_tokens: response.prompt_eval_count ?? 0,
        completion_tokens: response.eval_count ?? 0,
        total_tokens: (response.prompt_eval_count ?? 0) + (response.eval_count ?? 0),
      },
    };
  }

  private transformStreamChunk(chunk: OllamaStreamChunk): ChatStreamDelta {
    return {
      id: `ollama-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(new Date(chunk.created_at).getTime() / 1000),
      model: chunk.model,
      provider: this.name,
      choices: [
        {
          index: 0,
          delta: {
            content: chunk.message.content,
            role: chunk.message.role as 'assistant',
          },
          finish_reason: chunk.done ? 'stop' : null,
        },
      ],
      usage: chunk.done
        ? {
          prompt_tokens: chunk.prompt_eval_count ?? 0,
          completion_tokens: chunk.eval_count ?? 0,
          total_tokens: (chunk.prompt_eval_count ?? 0) + (chunk.eval_count ?? 0),
        }
        : undefined,
    };
  }

  private transformModelInfo(model: OllamaModel): ModelInfo {
    const isEmbedding = model.name.includes('embed');

    return {
      id: model.name,
      name: model.name,
      provider: this.name,
      type: isEmbedding ? 'embedding' : 'chat',
      context_window: this.estimateContextWindow(model),
      supports_vision: model.details.families?.includes('clip') ?? false,
      supports_tools: true, // Enable tool support
      supports_streaming: true,
    };
  }

  private estimateContextWindow(model: OllamaModel): number {
    // Estimate based on model family
    const family = model.details.family?.toLowerCase() ?? '';
    if (family.includes('llama-3')) return 8192;
    if (family.includes('llama')) return 4096;
    if (family.includes('mistral')) return 32768;
    if (family.includes('mixtral')) return 32768;
    if (family.includes('phi')) return 2048;
    if (family.includes('gemma')) return 8192;
    return 4096; // Default
  }
}
