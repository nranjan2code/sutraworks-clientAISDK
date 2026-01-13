/**
 * Anthropic (Claude) provider adapter
 * @module providers/anthropic
 */

import type {
  ProviderName,
  ProviderConfig,
  ChatRequest,
  ChatResponse,
  ChatStreamDelta,
  ModelInfo,
  Message,
} from '../types';
import { BaseProvider } from './base';
import { EventEmitter } from '../utils/events';
import { parseSSEStream, parseSSEData } from '../streaming/parser';

/**
 * Anthropic API types
 */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop' | 'ping' | 'error';
  message?: AnthropicResponse;
  index?: number;
  content_block?: { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown };
  delta?: { type: 'text_delta'; text: string } | { type: 'input_json_delta'; partial_json: string } | { stop_reason: string; stop_sequence: string | null };
  usage?: { output_tokens: number };
  error?: { type: string; message: string };
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'anthropic';
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
      case 'vision':
      case 'tools':
        return true;
      case 'embeddings':
        return false;
      default:
        return false;
    }
  }

  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    this.emitRequestStart(requestId, request.model);

    try {
      const response = await this.retry(async () => {
        return this.makeRequest<AnthropicResponse>('/messages', {
          body: this.buildChatBody(request),
          signal: request.signal,
        });
      }, request.signal);

      const result = this.transformChatResponse(response as AnthropicResponse);
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
    let messageId = '';
    let model = request.model;
    let abortHandler: (() => void) | null = null;
    let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const response = await this.makeRequest<Response>('/messages', {
        body: { ...this.buildChatBody(request), stream: true },
        signal: request.signal,
        stream: true,
      });

      const body = (response as Response).body;
      if (!body) {
        throw new Error('No response body');
      }

      // Track reader for cleanup
      streamReader = body.getReader();

      // Setup abort handler for graceful cleanup
      if (request.signal) {
        abortHandler = () => {
          streamReader?.cancel().catch(() => { });
        };
        request.signal.addEventListener('abort', abortHandler);
      }

      // Re-wrap reader as stream for parser
      const readerStream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await streamReader!.read();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(value);
          }
        },
        cancel() {
          streamReader?.cancel().catch(() => { });
        }
      });

      for await (const sseEvent of parseSSEStream(readerStream)) {
        const event = parseSSEData<AnthropicStreamEvent>(sseEvent.data);
        if (!event) continue;

        if (event.type === 'message_start' && event.message) {
          messageId = event.message.id;
          model = event.message.model;
        }

        if (event.type === 'content_block_delta' && event.delta) {
          chunkCount++;
          yield this.transformStreamEvent(event, messageId, model);
        }

        if (event.type === 'message_delta' && event.delta) {
          yield this.transformMessageDelta(event, messageId, model);
        }

        if (event.type === 'error' && event.error) {
          throw new Error(event.error.message);
        }
      }

      this.emitStreamEnd(requestId, request.model, chunkCount);
    } catch (error) {
      this.emitStreamError(requestId, request.model, error as Error);
      throw error;
    } finally {
      // Always cleanup: remove abort listener and cancel reader
      if (abortHandler && request.signal) {
        request.signal.removeEventListener('abort', abortHandler);
      }
      if (streamReader) {
        try {
          await streamReader.cancel();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    // Anthropic doesn't have a models endpoint, return known models
    return [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: this.name,
        type: 'chat',
        context_window: 200000,
        max_output_tokens: 4096,
        supports_vision: true,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.000015,
        output_cost_per_token: 0.000075,
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: this.name,
        type: 'chat',
        context_window: 200000,
        max_output_tokens: 4096,
        supports_vision: true,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.000003,
        output_cost_per_token: 0.000015,
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: this.name,
        type: 'chat',
        context_window: 200000,
        max_output_tokens: 4096,
        supports_vision: true,
        supports_tools: true,
        supports_streaming: true,
        input_cost_per_token: 0.00000025,
        output_cost_per_token: 0.00000125,
      },
      {
        id: 'claude-2.1',
        name: 'Claude 2.1',
        provider: this.name,
        type: 'chat',
        context_window: 200000,
        max_output_tokens: 4096,
        supports_vision: false,
        supports_tools: false,
        supports_streaming: true,
      },
    ];
  }

  private buildChatBody(request: ChatRequest): Record<string, unknown> {
    const { messages, systemMessage } = this.extractSystemMessage(request.messages);

    const body: Record<string, unknown> = {
      model: request.model,
      messages: this.transformMessages(messages),
      max_tokens: request.max_tokens ?? 4096,
    };

    if (systemMessage) {
      body.system = systemMessage;
    }

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.top_p !== undefined) body.top_p = request.top_p;
    if (request.stop !== undefined) {
      body.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop];
    }

    // Transform tools to Anthropic format
    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters,
      }));
    }

    return body;
  }

  private extractSystemMessage(messages: Message[]): { messages: Message[]; systemMessage?: string } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const systemMessage = systemMessages
      .map((m) => (typeof m.content === 'string' ? m.content : ''))
      .join('\n');

    return {
      messages: otherMessages,
      systemMessage: systemMessage || undefined,
    };
  }

  private transformMessages(messages: Message[]): AnthropicMessage[] {
    return messages.map((message) => {
      if (typeof message.content === 'string') {
        return {
          role: message.role as 'user' | 'assistant',
          content: message.content,
        };
      }

      // Handle multimodal content
      const content = message.content.map((part) => {
        if (part.type === 'text' && part.text) {
          return { type: 'text' as const, text: part.text };
        }
        if (part.type === 'image_base64' && part.image_base64) {
          return {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: part.image_base64.media_type,
              data: part.image_base64.data,
            },
          };
        }
        return { type: 'text' as const, text: '' };
      });

      return {
        role: message.role as 'user' | 'assistant',
        content,
      };
    });
  }

  private transformChatResponse(response: AnthropicResponse): ChatResponse {
    const textContent = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const toolCalls = response.content
      .filter((block): block is { type: 'tool_use'; id: string; name: string; input: unknown } => block.type === 'tool_use')
      .map((block) => ({
        id: block.id,
        type: 'function' as const,
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      }));

    return {
      id: response.id,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: response.model,
      provider: this.name,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: textContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          },
          finish_reason: this.mapStopReason(response.stop_reason),
        },
      ],
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  private transformStreamEvent(
    event: AnthropicStreamEvent,
    messageId: string,
    model: string
  ): ChatStreamDelta {
    let content = '';

    if (event.delta && 'text' in event.delta) {
      content = event.delta.text;
    }

    return {
      id: messageId,
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
          finish_reason: null,
        },
      ],
    };
  }

  private transformMessageDelta(
    event: AnthropicStreamEvent,
    messageId: string,
    model: string
  ): ChatStreamDelta {
    const delta = event.delta as { stop_reason?: string } | undefined;

    return {
      id: messageId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model,
      provider: this.name,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: delta?.stop_reason
            ? this.mapStopReason(delta.stop_reason as AnthropicResponse['stop_reason'])
            : null,
        },
      ],
      usage: event.usage
        ? {
          prompt_tokens: 0,
          completion_tokens: event.usage.output_tokens,
          total_tokens: event.usage.output_tokens,
        }
        : undefined,
    };
  }

  private mapStopReason(
    reason: AnthropicResponse['stop_reason']
  ): ChatResponse['choices'][0]['finish_reason'] {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      default:
        return null;
    }
  }
}
