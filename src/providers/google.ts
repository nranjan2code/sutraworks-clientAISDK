/**
 * Google Gemini provider adapter
 * @module providers/google
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
 * Google Gemini API types
 */
interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      role: string;
      parts: Array<{ text: string }>;
    };
    finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
    safetyRatings?: Array<{ category: string; probability: string }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiStreamChunk {
  candidates: Array<{
    content: {
      role: string;
      parts: Array<{ text: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

interface GeminiModel {
  name: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
}

/**
 * Google Gemini provider implementation
 */
export class GoogleProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'google';
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
      case 'vision':
      case 'embeddings':
        return true;
      case 'tools':
        return true;
      default:
        return false;
    }
  }

  protected getAuthHeaders(_apiKey: string): Record<string, string> {
    // Google uses API key in query params, not headers
    return {};
  }

  private async makeGeminiRequest<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      signal?: AbortSignal;
      stream?: boolean;
    } = {}
  ): Promise<T | Response> {
    const apiKey = await this.getApiKey();
    const baseUrl = this.config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
    const url = `${baseUrl}${endpoint}?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout ?? 60000);

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
        return this.makeGeminiRequest<GeminiResponse>(
          `/models/${request.model}:generateContent`,
          {
            body: this.buildChatBody(request),
            signal: request.signal,
          }
        );
      }, request.signal);

      const result = this.transformChatResponse(response as GeminiResponse, request.model);
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
      const response = await this.makeGeminiRequest<Response>(
        `/models/${request.model}:streamGenerateContent`,
        {
          body: this.buildChatBody(request),
          signal: request.signal,
          stream: true,
        }
      );

      const body = (response as Response).body;
      if (!body) {
        throw new Error('No response body');
      }

      for await (const chunk of parseNDJSONStream<GeminiStreamChunk>(body)) {
        chunkCount++;
        yield this.transformStreamChunk(chunk, request.model);
      }

      this.emitStreamEnd(requestId, request.model, chunkCount);
    } catch (error) {
      this.emitStreamError(requestId, request.model, error as Error);
      throw error;
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || 'embedding-001';
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const embeddings: number[][] = [];

    for (const input of inputs) {
      const response = await this.retry(async () => {
        return this.makeGeminiRequest<GeminiEmbeddingResponse>(
          `/models/${model}:embedContent`,
          {
            body: {
              model: `models/${model}`,
              content: { parts: [{ text: input }] },
            },
            signal: request.signal,
          }
        );
      }, request.signal);

      embeddings.push((response as GeminiEmbeddingResponse).embedding.values);
    }

    return {
      object: 'list',
      data: embeddings.map((embedding, index) => ({
        object: 'embedding',
        index,
        embedding,
      })),
      model,
      provider: this.name,
      usage: {
        prompt_tokens: 0, // Google doesn't return token counts for embeddings
        total_tokens: 0,
      },
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await this.makeGeminiRequest<{ models: GeminiModel[] }>('/models', {
      method: 'GET',
    });

    return (response as { models: GeminiModel[] }).models
      .filter((model) => model.supportedGenerationMethods.includes('generateContent'))
      .map((model) => this.transformModelInfo(model));
  }

  private buildChatBody(request: ChatRequest): Record<string, unknown> {
    const { contents, systemInstruction } = this.transformMessages(request.messages);

    const body: Record<string, unknown> = {
      contents,
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const generationConfig: Record<string, unknown> = {};
    if (request.temperature !== undefined) generationConfig.temperature = request.temperature;
    if (request.top_p !== undefined) generationConfig.topP = request.top_p;
    if (request.max_tokens !== undefined) generationConfig.maxOutputTokens = request.max_tokens;
    if (request.stop !== undefined) {
      generationConfig.stopSequences = Array.isArray(request.stop) ? request.stop : [request.stop];
    }

    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    return body;
  }

  private transformMessages(messages: Message[]): {
    contents: GeminiContent[];
    systemInstruction?: string;
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const systemInstruction = systemMessages
      .map((m) => (typeof m.content === 'string' ? m.content : ''))
      .join('\n');

    const contents: GeminiContent[] = otherMessages.map((message) => {
      const role = message.role === 'assistant' ? 'model' : 'user';

      if (typeof message.content === 'string') {
        return {
          role,
          parts: [{ text: message.content }],
        };
      }

      // Handle multimodal content
      const parts = message.content.map((part) => {
        if (part.type === 'text' && part.text) {
          return { text: part.text };
        }
        if (part.type === 'image_base64' && part.image_base64) {
          return {
            inlineData: {
              mimeType: part.image_base64.media_type,
              data: part.image_base64.data,
            },
          };
        }
        return { text: '' };
      });

      return { role, parts };
    });

    return {
      contents,
      systemInstruction: systemInstruction || undefined,
    };
  }

  private transformChatResponse(response: GeminiResponse, model: string): ChatResponse {
    const candidate = response.candidates[0];

    return {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      provider: this.name,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: candidate.content.parts.map((p) => p.text).join(''),
          },
          finish_reason: this.mapFinishReason(candidate.finishReason),
        },
      ],
      usage: response.usageMetadata
        ? {
            prompt_tokens: response.usageMetadata.promptTokenCount,
            completion_tokens: response.usageMetadata.candidatesTokenCount,
            total_tokens: response.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  private transformStreamChunk(chunk: GeminiStreamChunk, model: string): ChatStreamDelta {
    const candidate = chunk.candidates[0];
    const content = candidate?.content?.parts?.map((p) => p.text).join('') ?? '';

    return {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      provider: this.name,
      choices: [
        {
          index: 0,
          delta: {
            content,
          },
          finish_reason: candidate?.finishReason
            ? this.mapFinishReason(candidate.finishReason as GeminiResponse['candidates'][0]['finishReason'])
            : null,
        },
      ],
      usage: chunk.usageMetadata
        ? {
            prompt_tokens: chunk.usageMetadata.promptTokenCount,
            completion_tokens: chunk.usageMetadata.candidatesTokenCount,
            total_tokens: chunk.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  private mapFinishReason(
    reason: GeminiResponse['candidates'][0]['finishReason']
  ): ChatResponse['choices'][0]['finish_reason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
        return 'content_filter';
      default:
        return null;
    }
  }

  private transformModelInfo(model: GeminiModel): ModelInfo {
    const isEmbedding = model.supportedGenerationMethods.includes('embedContent');

    return {
      id: model.name.replace('models/', ''),
      name: model.displayName,
      provider: this.name,
      type: isEmbedding ? 'embedding' : 'chat',
      context_window: model.inputTokenLimit,
      max_output_tokens: model.outputTokenLimit,
      supports_vision: model.name.includes('vision') || model.name.includes('gemini-pro'),
      supports_tools: model.supportedGenerationMethods.includes('generateContent'),
      supports_streaming: true,
    };
  }
}
