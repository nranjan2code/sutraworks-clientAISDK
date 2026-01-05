/**
 * OpenAI provider adapter
 * @module providers/openai
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
} from '../types';
import { BaseProvider } from './base';
import { EventEmitter } from '../utils/events';
import { parseJSONStream } from '../streaming/parser';

/**
 * OpenAI API response types
 */
interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'openai';
  }

  supports(_feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    return true; // OpenAI supports all features
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    this.emitRequestStart(requestId, request.model);

    try {
      const response = await this.retry(async () => {
        return this.makeRequest<OpenAIChatResponse>('/chat/completions', {
          body: this.buildChatBody(request),
          signal: request.signal,
        });
      }, request.signal);

      const result = this.transformChatResponse(response as OpenAIChatResponse);
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
      const response = await this.makeRequest<Response>('/chat/completions', {
        body: { ...this.buildChatBody(request), stream: true },
        signal: request.signal,
        stream: true,
      });

      const body = (response as Response).body;
      if (!body) {
        throw new Error('No response body');
      }

      for await (const chunk of parseJSONStream<OpenAIStreamChunk>(body)) {
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
    const response = await this.retry(async () => {
      return this.makeRequest<OpenAIEmbeddingResponse>('/embeddings', {
        body: {
          model: request.model,
          input: request.input,
          encoding_format: request.encoding_format,
          dimensions: request.dimensions,
          user: request.user,
        },
        signal: request.signal,
      });
    }, request.signal);

    return this.transformEmbeddingResponse(response as OpenAIEmbeddingResponse);
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await this.makeRequest<{ data: OpenAIModel[] }>('/models', {
      method: 'GET',
    });

    return (response as { data: OpenAIModel[] }).data
      .filter((model) => model.id.startsWith('gpt') || model.id.includes('embedding'))
      .map((model) => this.transformModelInfo(model));
  }

  private buildChatBody(request: ChatRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.top_p !== undefined) body.top_p = request.top_p;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.stop !== undefined) body.stop = request.stop;
    if (request.presence_penalty !== undefined) body.presence_penalty = request.presence_penalty;
    if (request.frequency_penalty !== undefined) body.frequency_penalty = request.frequency_penalty;
    if (request.tools !== undefined) body.tools = request.tools;
    if (request.tool_choice !== undefined) body.tool_choice = request.tool_choice;
    if (request.response_format !== undefined) body.response_format = request.response_format;
    if (request.seed !== undefined) body.seed = request.seed;
    if (request.user !== undefined) body.user = request.user;

    return body;
  }

  private transformChatResponse(response: OpenAIChatResponse): ChatResponse {
    return {
      id: response.id,
      object: 'chat.completion',
      created: response.created,
      model: response.model,
      provider: this.name,
      choices: response.choices.map((choice) => ({
        index: choice.index,
        message: {
          role: choice.message.role as 'assistant',
          content: choice.message.content ?? '',
          tool_calls: choice.message.tool_calls?.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: tc.function,
          })),
        },
        finish_reason: choice.finish_reason as ChatResponse['choices'][0]['finish_reason'],
      })),
      usage: response.usage,
      system_fingerprint: response.system_fingerprint,
    };
  }

  private transformStreamChunk(chunk: OpenAIStreamChunk): ChatStreamDelta {
    return {
      id: chunk.id,
      object: 'chat.completion.chunk',
      created: chunk.created,
      model: chunk.model,
      provider: this.name,
      choices: chunk.choices.map((choice) => ({
        index: choice.index,
        delta: {
          role: choice.delta.role as 'assistant' | undefined,
          content: choice.delta.content,
          tool_calls: choice.delta.tool_calls?.map((tc) => ({
            id: tc.id ?? '',
            type: 'function' as const,
            function: {
              name: tc.function?.name ?? '',
              arguments: tc.function?.arguments ?? '',
            },
          })),
        },
        finish_reason: choice.finish_reason as ChatStreamDelta['choices'][0]['finish_reason'],
      })),
      usage: chunk.usage,
    };
  }

  private transformEmbeddingResponse(response: OpenAIEmbeddingResponse): EmbeddingResponse {
    return {
      object: 'list',
      data: response.data.map((item) => ({
        object: 'embedding',
        index: item.index,
        embedding: item.embedding,
      })),
      model: response.model,
      provider: this.name,
      usage: response.usage,
    };
  }

  private transformModelInfo(model: OpenAIModel): ModelInfo {
    const isEmbedding = model.id.includes('embedding');
    const isGpt4 = model.id.includes('gpt-4');

    return {
      id: model.id,
      name: model.id,
      provider: this.name,
      type: isEmbedding ? 'embedding' : 'chat',
      context_window: isGpt4 ? 128000 : 16385,
      supports_vision: model.id.includes('vision') || model.id.includes('gpt-4-turbo'),
      supports_tools: !isEmbedding,
      supports_streaming: !isEmbedding,
    };
  }
}
