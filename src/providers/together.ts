/**
 * Together AI provider adapter
 * @module providers/together
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
 * Together AI provider implementation
 * Uses OpenAI-compatible API format
 */
export class TogetherProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'together';
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
      case 'embeddings':
        return true;
      case 'vision':
      case 'tools':
        return true;
      default:
        return false;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    this.emitRequestStart(requestId, request.model);

    try {
      const response = await this.retry(async () => {
        return this.makeRequest<ChatResponse>('/chat/completions', {
          body: this.buildChatBody(request),
          signal: request.signal,
        });
      }, request.signal);

      const result = { ...(response as ChatResponse), provider: this.name };
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

      for await (const chunk of parseJSONStream<ChatStreamDelta>(body)) {
        chunkCount++;
        yield { ...chunk, provider: this.name };
      }

      this.emitStreamEnd(requestId, request.model, chunkCount);
    } catch (error) {
      this.emitStreamError(requestId, request.model, error as Error);
      throw error;
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await this.retry(async () => {
      return this.makeRequest<EmbeddingResponse>('/embeddings', {
        body: {
          model: request.model,
          input: request.input,
        },
        signal: request.signal,
      });
    }, request.signal);

    return { ...(response as EmbeddingResponse), provider: this.name };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
        name: 'Llama 3.1 405B Instruct Turbo',
        provider: this.name,
        type: 'chat',
        context_window: 130815,
        supports_tools: true,
        supports_streaming: true,
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        name: 'Llama 3.1 70B Instruct Turbo',
        provider: this.name,
        type: 'chat',
        context_window: 130815,
        supports_tools: true,
        supports_streaming: true,
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        name: 'Llama 3.1 8B Instruct Turbo',
        provider: this.name,
        type: 'chat',
        context_window: 130815,
        supports_tools: true,
        supports_streaming: true,
      },
      {
        id: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
        name: 'Mixtral 8x22B Instruct',
        provider: this.name,
        type: 'chat',
        context_window: 65536,
        supports_streaming: true,
      },
      {
        id: 'Qwen/Qwen2-72B-Instruct',
        name: 'Qwen 2 72B Instruct',
        provider: this.name,
        type: 'chat',
        context_window: 32768,
        supports_streaming: true,
      },
      {
        id: 'togethercomputer/m2-bert-80M-8k-retrieval',
        name: 'M2 BERT 80M',
        provider: this.name,
        type: 'embedding',
      },
    ];
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

    return body;
  }
}
