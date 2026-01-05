/**
 * Cohere provider adapter
 * @module providers/cohere
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
 * Cohere API types
 */
interface CohereChatResponse {
  response_id: string;
  text: string;
  generation_id: string;
  finish_reason: 'COMPLETE' | 'MAX_TOKENS' | 'ERROR' | 'ERROR_TOXIC';
  meta?: {
    api_version: { version: string };
    billed_units?: { input_tokens: number; output_tokens: number };
    tokens?: { input_tokens: number; output_tokens: number };
  };
}

interface CohereStreamEvent {
  event_type: 'stream-start' | 'text-generation' | 'stream-end';
  text?: string;
  is_finished?: boolean;
  finish_reason?: string;
  response?: CohereChatResponse;
}

interface CohereEmbedResponse {
  id: string;
  embeddings: number[][];
  texts: string[];
  meta?: { api_version: { version: string }; billed_units?: { input_tokens: number } };
}

/**
 * Cohere provider implementation
 */
export class CohereProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'cohere';
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
      case 'embeddings':
        return true;
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
        return this.makeRequest<CohereChatResponse>('/chat', {
          body: this.buildChatBody(request),
          signal: request.signal,
        });
      }, request.signal);

      const result = this.transformChatResponse(response as CohereChatResponse, request.model);
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
      const response = await this.makeRequest<Response>('/chat', {
        body: { ...this.buildChatBody(request), stream: true },
        signal: request.signal,
        stream: true,
      });

      const body = (response as Response).body;
      if (!body) {
        throw new Error('No response body');
      }

      for await (const event of parseNDJSONStream<CohereStreamEvent>(body)) {
        if (event.event_type === 'text-generation' && event.text) {
          chunkCount++;
          yield this.transformStreamEvent(event, request.model);
        }
        if (event.event_type === 'stream-end' && event.response) {
          yield this.transformStreamEnd(event, request.model);
        }
      }

      this.emitStreamEnd(requestId, request.model, chunkCount);
    } catch (error) {
      this.emitStreamError(requestId, request.model, error as Error);
      throw error;
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const texts = Array.isArray(request.input) ? request.input : [request.input];

    const response = await this.retry(async () => {
      return this.makeRequest<CohereEmbedResponse>('/embed', {
        body: {
          model: request.model || 'embed-english-v3.0',
          texts,
          input_type: 'search_document',
        },
        signal: request.signal,
      });
    }, request.signal);

    return this.transformEmbedResponse(response as CohereEmbedResponse, request.model);
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'command-r-plus',
        name: 'Command R+',
        provider: this.name,
        type: 'chat',
        context_window: 128000,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.000003,
        output_cost_per_token: 0.000015,
      },
      {
        id: 'command-r',
        name: 'Command R',
        provider: this.name,
        type: 'chat',
        context_window: 128000,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.0000005,
        output_cost_per_token: 0.0000015,
      },
      {
        id: 'command',
        name: 'Command',
        provider: this.name,
        type: 'chat',
        context_window: 4096,
        supports_streaming: true,
        input_cost_per_token: 0.000001,
        output_cost_per_token: 0.000002,
      },
      {
        id: 'command-light',
        name: 'Command Light',
        provider: this.name,
        type: 'chat',
        context_window: 4096,
        supports_streaming: true,
        input_cost_per_token: 0.0000003,
        output_cost_per_token: 0.0000006,
      },
      {
        id: 'embed-english-v3.0',
        name: 'Embed English v3',
        provider: this.name,
        type: 'embedding',
        input_cost_per_token: 0.0000001,
        output_cost_per_token: 0,
      },
      {
        id: 'embed-multilingual-v3.0',
        name: 'Embed Multilingual v3',
        provider: this.name,
        type: 'embedding',
        input_cost_per_token: 0.0000001,
        output_cost_per_token: 0,
      },
    ];
  }

  private buildChatBody(request: ChatRequest): Record<string, unknown> {
    const { preamble, chatHistory, userMessage } = this.transformMessages(request.messages);

    const body: Record<string, unknown> = {
      model: request.model,
      message: userMessage,
    };

    if (preamble) body.preamble = preamble;
    if (chatHistory.length > 0) body.chat_history = chatHistory;

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.stop !== undefined) {
      body.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop];
    }

    return body;
  }

  private transformMessages(messages: Message[]): {
    preamble?: string;
    chatHistory: Array<{ role: 'USER' | 'CHATBOT'; message: string }>;
    userMessage: string;
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const preamble = systemMessages
      .map((m) => (typeof m.content === 'string' ? m.content : ''))
      .join('\n');

    // All messages except the last one go into chat_history
    const historyMessages = otherMessages.slice(0, -1);
    const lastMessage = otherMessages[otherMessages.length - 1];

    const chatHistory = historyMessages.map((m) => ({
      role: m.role === 'assistant' ? ('CHATBOT' as const) : ('USER' as const),
      message: typeof m.content === 'string' ? m.content : '',
    }));

    const userMessage = typeof lastMessage?.content === 'string' ? lastMessage.content : '';

    return {
      preamble: preamble || undefined,
      chatHistory,
      userMessage,
    };
  }

  private transformChatResponse(response: CohereChatResponse, model: string): ChatResponse {
    const tokens = response.meta?.tokens || response.meta?.billed_units;

    return {
      id: response.response_id,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      provider: this.name,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.text,
          },
          finish_reason: this.mapFinishReason(response.finish_reason),
        },
      ],
      usage: tokens
        ? {
            prompt_tokens: tokens.input_tokens,
            completion_tokens: tokens.output_tokens,
            total_tokens: tokens.input_tokens + tokens.output_tokens,
          }
        : undefined,
    };
  }

  private transformStreamEvent(event: CohereStreamEvent, model: string): ChatStreamDelta {
    return {
      id: `cohere-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      provider: this.name,
      choices: [
        {
          index: 0,
          delta: {
            content: event.text || '',
          },
          finish_reason: null,
        },
      ],
    };
  }

  private transformStreamEnd(event: CohereStreamEvent, model: string): ChatStreamDelta {
    const response = event.response;
    const tokens = response?.meta?.tokens || response?.meta?.billed_units;

    return {
      id: response?.response_id || `cohere-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      provider: this.name,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: response?.finish_reason
            ? this.mapFinishReason(response.finish_reason)
            : 'stop',
        },
      ],
      usage: tokens
        ? {
            prompt_tokens: tokens.input_tokens,
            completion_tokens: tokens.output_tokens,
            total_tokens: tokens.input_tokens + tokens.output_tokens,
          }
        : undefined,
    };
  }

  private transformEmbedResponse(response: CohereEmbedResponse, model: string): EmbeddingResponse {
    return {
      object: 'list',
      data: response.embeddings.map((embedding, index) => ({
        object: 'embedding',
        index,
        embedding,
      })),
      model: model || 'embed-english-v3.0',
      provider: this.name,
      usage: {
        prompt_tokens: response.meta?.billed_units?.input_tokens ?? 0,
        total_tokens: response.meta?.billed_units?.input_tokens ?? 0,
      },
    };
  }

  private mapFinishReason(
    reason: CohereChatResponse['finish_reason']
  ): ChatResponse['choices'][0]['finish_reason'] {
    switch (reason) {
      case 'COMPLETE':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'ERROR_TOXIC':
        return 'content_filter';
      default:
        return null;
    }
  }
}
