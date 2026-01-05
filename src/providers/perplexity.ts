/**
 * Perplexity AI provider adapter
 * @module providers/perplexity
 */

import type {
  ProviderName,
  ProviderConfig,
  ChatRequest,
  ChatResponse,
  ChatStreamDelta,
  ModelInfo,
} from '../types';
import { BaseProvider } from './base';
import { EventEmitter } from '../utils/events';
import { parseJSONStream } from '../streaming/parser';

/**
 * Perplexity AI provider implementation
 * Uses OpenAI-compatible API format with real-time web search
 */
export class PerplexityProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'perplexity';
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
        return true;
      case 'embeddings':
      case 'vision':
      case 'tools':
        return false;
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

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'llama-3.1-sonar-huge-128k-online',
        name: 'Sonar Huge 128K Online',
        provider: this.name,
        type: 'chat',
        context_window: 127072,
        supports_streaming: true,
      },
      {
        id: 'llama-3.1-sonar-large-128k-online',
        name: 'Sonar Large 128K Online',
        provider: this.name,
        type: 'chat',
        context_window: 127072,
        supports_streaming: true,
      },
      {
        id: 'llama-3.1-sonar-small-128k-online',
        name: 'Sonar Small 128K Online',
        provider: this.name,
        type: 'chat',
        context_window: 127072,
        supports_streaming: true,
      },
      {
        id: 'llama-3.1-sonar-large-128k-chat',
        name: 'Sonar Large 128K Chat',
        provider: this.name,
        type: 'chat',
        context_window: 131072,
        supports_streaming: true,
      },
      {
        id: 'llama-3.1-sonar-small-128k-chat',
        name: 'Sonar Small 128K Chat',
        provider: this.name,
        type: 'chat',
        context_window: 131072,
        supports_streaming: true,
      },
      {
        id: 'llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        provider: this.name,
        type: 'chat',
        context_window: 131072,
        supports_streaming: true,
      },
      {
        id: 'llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        provider: this.name,
        type: 'chat',
        context_window: 131072,
        supports_streaming: true,
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
    if (request.presence_penalty !== undefined) body.presence_penalty = request.presence_penalty;
    if (request.frequency_penalty !== undefined) body.frequency_penalty = request.frequency_penalty;

    return body;
  }
}
