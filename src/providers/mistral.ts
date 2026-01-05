/**
 * Mistral AI provider adapter
 * @module providers/mistral
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
 * Mistral provider implementation
 * Uses OpenAI-compatible API format
 */
export class MistralProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'mistral';
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
      case 'embeddings':
      case 'tools':
        return true;
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

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const response = await this.retry(async () => {
      return this.makeRequest<EmbeddingResponse>('/embeddings', {
        body: {
          model: request.model,
          input: request.input,
          encoding_format: request.encoding_format,
        },
        signal: request.signal,
      });
    }, request.signal);

    return { ...(response as EmbeddingResponse), provider: this.name };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        provider: this.name,
        type: 'chat',
        context_window: 32768,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.000004,
        output_cost_per_token: 0.000012,
      },
      {
        id: 'mistral-medium-latest',
        name: 'Mistral Medium',
        provider: this.name,
        type: 'chat',
        context_window: 32768,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.0000027,
        output_cost_per_token: 0.0000081,
      },
      {
        id: 'mistral-small-latest',
        name: 'Mistral Small',
        provider: this.name,
        type: 'chat',
        context_window: 32768,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.000001,
        output_cost_per_token: 0.000003,
      },
      {
        id: 'open-mistral-7b',
        name: 'Mistral 7B',
        provider: this.name,
        type: 'chat',
        context_window: 32768,
        supports_streaming: true,
        input_cost_per_token: 0.00000025,
        output_cost_per_token: 0.00000025,
      },
      {
        id: 'open-mixtral-8x7b',
        name: 'Mixtral 8x7B',
        provider: this.name,
        type: 'chat',
        context_window: 32768,
        supports_streaming: true,
        input_cost_per_token: 0.0000007,
        output_cost_per_token: 0.0000007,
      },
      {
        id: 'mistral-embed',
        name: 'Mistral Embed',
        provider: this.name,
        type: 'embedding',
        input_cost_per_token: 0.0000001,
        output_cost_per_token: 0,
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
    if (request.tools !== undefined) body.tools = request.tools;
    if (request.tool_choice !== undefined) body.tool_choice = request.tool_choice;
    if (request.response_format !== undefined) body.response_format = request.response_format;

    return body;
  }
}
