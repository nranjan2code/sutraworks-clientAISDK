/**
 * Groq provider adapter
 * @module providers/groq
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
 * Groq provider implementation
 * Uses OpenAI-compatible API format with ultra-fast inference
 */
export class GroqProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'groq';
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
      case 'tools':
        return true;
      case 'embeddings':
      case 'vision':
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
        id: 'llama-3.1-70b-versatile',
        name: 'Llama 3.1 70B Versatile',
        provider: this.name,
        type: 'chat',
        context_window: 131072,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.00000059,
        output_cost_per_token: 0.00000079,
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: this.name,
        type: 'chat',
        context_window: 131072,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.00000005,
        output_cost_per_token: 0.00000008,
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        provider: this.name,
        type: 'chat',
        context_window: 32768,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.00000024,
        output_cost_per_token: 0.00000024,
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B',
        provider: this.name,
        type: 'chat',
        context_window: 8192,
        supports_streaming: true,
        input_cost_per_token: 0.0000002,
        output_cost_per_token: 0.0000002,
      },
      {
        id: 'llama-guard-3-8b',
        name: 'Llama Guard 3 8B',
        provider: this.name,
        type: 'chat',
        context_window: 8192,
        supports_streaming: true,
        input_cost_per_token: 0.0000002,
        output_cost_per_token: 0.0000002,
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
    if (request.tools !== undefined) body.tools = request.tools;
    if (request.tool_choice !== undefined) body.tool_choice = request.tool_choice;
    if (request.response_format !== undefined) body.response_format = request.response_format;
    if (request.seed !== undefined) body.seed = request.seed;
    if (request.user !== undefined) body.user = request.user;

    return body;
  }
}
