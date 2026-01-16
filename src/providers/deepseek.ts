/**
 * DeepSeek provider adapter
 * @module providers/deepseek
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
 * DeepSeek provider implementation
 * Uses OpenAI-compatible API format with advanced reasoning capabilities
 * 
 * Features:
 * - DeepSeek V4 with Silent Reasoning module
 * - DeepSeek R1 open-source reasoning model
 * - DeepSeek Coder for code generation
 * - Extremely cost-effective pricing
 */
export class DeepSeekProvider extends BaseProvider {
  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    super(config, events, getApiKey);
  }

  get name(): ProviderName {
    return 'deepseek';
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
      case 'tools':
        return true;
      case 'embeddings':
      case 'vision':
        return false; // DeepSeek doesn't support these yet
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
    let abortHandler: (() => void) | null = null;
    let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

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

      // Track reader for cleanup
      streamReader = body.getReader();

      // Setup abort handler for graceful cleanup
      if (request.signal) {
        abortHandler = () => {
          streamReader?.cancel().catch(() => { }); // Ignore cancel errors
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

      for await (const chunk of parseJSONStream<ChatStreamDelta>(readerStream)) {
        chunkCount++;
        yield { ...chunk, provider: this.name };
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
    // Return models from our registry - DeepSeek doesn't have a public models endpoint
    return [
      {
        id: 'deepseek-v4',
        name: 'DeepSeek V4',
        provider: this.name,
        type: 'chat',
        context_window: 128000,
        supports_tools: true,
        supports_streaming: true,
      },
      {
        id: 'deepseek-r1',
        name: 'DeepSeek R1',
        provider: this.name,
        type: 'chat',
        context_window: 128000,
        supports_tools: true,
        supports_streaming: true,
      },
      {
        id: 'deepseek-v3-2',
        name: 'DeepSeek V3.2',
        provider: this.name,
        type: 'chat',
        context_window: 128000,
        supports_tools: true,
        supports_streaming: true,
      },
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: this.name,
        type: 'chat',
        context_window: 64000,
        supports_tools: true,
        supports_streaming: true,
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        provider: this.name,
        type: 'chat',
        context_window: 64000,
        supports_tools: true,
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
}
