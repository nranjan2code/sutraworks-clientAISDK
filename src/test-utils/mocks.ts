/**
 * Test utilities and mocks for Sutraworks Client AI SDK
 * @module test-utils/mocks
 */

import { vi, type Mock } from 'vitest';
import type {
  ChatResponse,
  ChatStreamDelta,
  EmbeddingResponse,
  ModelInfo,
  ProviderName,
} from '../types';

/**
 * Creates a mock fetch function for testing
 */
export function createMockFetch(): Mock {
  return vi.fn();
}

/**
 * Mock response factory for chat completions
 */
export function createMockChatResponse(overrides: Partial<ChatResponse> = {}): ChatResponse {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4-turbo',
    provider: 'openai',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'This is a test response.',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 15,
      total_tokens: 25,
    },
    ...overrides,
  };
}

/**
 * Mock response factory for streaming deltas
 */
export function createMockStreamDelta(
  content: string,
  options: {
    id?: string;
    model?: string;
    provider?: ProviderName;
    finishReason?: 'stop' | 'length' | null;
    index?: number;
  } = {}
): ChatStreamDelta {
  return {
    id: options.id || `chatcmpl-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: options.model || 'gpt-4-turbo',
    provider: options.provider || 'openai',
    choices: [
      {
        index: options.index || 0,
        delta: { content },
        finish_reason: options.finishReason ?? null,
      },
    ],
  };
}

/**
 * Mock response factory for embeddings
 */
export function createMockEmbeddingResponse(
  overrides: Partial<EmbeddingResponse> = {}
): EmbeddingResponse {
  return {
    object: 'list',
    data: [
      {
        object: 'embedding',
        index: 0,
        embedding: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      },
    ],
    model: 'text-embedding-3-small',
    provider: 'openai',
    usage: {
      prompt_tokens: 10,
      total_tokens: 10,
    },
    ...overrides,
  };
}

/**
 * Mock response factory for model list
 */
export function createMockModelInfo(
  id: string,
  provider: ProviderName,
  overrides: Partial<ModelInfo> = {}
): ModelInfo {
  return {
    id,
    name: id,
    provider,
    type: 'chat',
    context_window: 4096,
    supports_streaming: true,
    supports_tools: true,
    ...overrides,
  };
}

/**
 * Creates a mock HTTP response
 */
export function createMockResponse<T>(
  body: T,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    clone: () => createMockResponse(body, options),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    redirected: false,
    type: 'basic',
    url: '',
  } as Response;
}

/**
 * Creates a mock error response
 */
export function createMockErrorResponse(
  status: number,
  errorBody: {
    error?: { message: string; type?: string; code?: string };
    message?: string;
    detail?: string;
    retry_after?: number;
  }
): Response {
  const statusText = status === 400 ? 'Bad Request'
    : status === 401 ? 'Unauthorized'
      : status === 403 ? 'Forbidden'
        : status === 404 ? 'Not Found'
          : status === 429 ? 'Too Many Requests'
            : status === 500 ? 'Internal Server Error'
              : 'Error';

  return createMockResponse(errorBody, { status, statusText });
}

/**
 * Creates a mock SSE stream response for testing streaming
 */
export function createMockSSEStream(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'text/event-stream' }),
    body: stream,
    bodyUsed: false,
    json: () => Promise.reject(new Error('Stream cannot be read as JSON')),
    text: () => Promise.reject(new Error('Stream cannot be read as text')),
    clone: () => createMockSSEStream(chunks),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    redirected: false,
    type: 'basic',
    url: '',
  } as Response;
}

/**
 * Creates mock SSE chunks for OpenAI-style streaming
 */
export function createMockOpenAIStreamChunks(content: string): string[] {
  const words = content.split(' ');
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = i === 0 ? words[i] : ' ' + words[i];
    chunks.push(
      JSON.stringify({
        id: 'chatcmpl-123',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4-turbo',
        choices: [
          {
            index: 0,
            delta: { content: word },
            finish_reason: null,
          },
        ],
      })
    );
  }

  // Final chunk with finish reason
  chunks.push(
    JSON.stringify({
      id: 'chatcmpl-123',
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4-turbo',
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
    })
  );

  return chunks;
}

/**
 * Creates mock SSE chunks for Anthropic-style streaming
 */
export function createMockAnthropicStreamChunks(content: string): string[] {
  const words = content.split(' ');
  const chunks: string[] = [];

  // Message start
  chunks.push(
    JSON.stringify({
      type: 'message_start',
      message: {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-3-opus-20240229',
        content: [],
        usage: { input_tokens: 10, output_tokens: 0 },
      },
    })
  );

  // Content block start
  chunks.push(
    JSON.stringify({
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' },
    })
  );

  // Content deltas
  for (let i = 0; i < words.length; i++) {
    const word = i === 0 ? words[i] : ' ' + words[i];
    chunks.push(
      JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: word },
      })
    );
  }

  // Content block stop
  chunks.push(
    JSON.stringify({
      type: 'content_block_stop',
      index: 0,
    })
  );

  // Message delta (final)
  chunks.push(
    JSON.stringify({
      type: 'message_delta',
      delta: { stop_reason: 'end_turn' },
      usage: { output_tokens: words.length * 2 },
    })
  );

  // Message stop
  chunks.push(
    JSON.stringify({
      type: 'message_stop',
    })
  );

  return chunks;
}

/**
 * Test API keys that pass validation (minimum 10 chars)
 */
export const TEST_KEYS = {
  openai: 'sk-test-key-openai-12345',
  anthropic: 'sk-ant-api03-test-12345',
  google: 'AIza-test-key-google-12345',
  ollama: '', // Ollama doesn't need a key
  mistral: 'mistral-test-key-12345',
  groq: 'gsk-test-key-groq-12345',
  cohere: 'cohere-test-key-12345',
  together: 'together-test-key-12345',
  fireworks: 'fw-test-key-fireworks-12345',
  perplexity: 'pplx-test-key-12345',
};

/**
 * Helper to wait for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to capture console output
 */
export function captureConsole(): {
  logs: string[];
  errors: string[];
  warnings: string[];
  restore: () => void;
} {
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  console.warn = (...args) => warnings.push(args.join(' '));

  return {
    logs,
    errors,
    warnings,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

/**
 * Helper to create a mock EventEmitter for testing
 */
export function createMockEventEmitter() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  return {
    on: vi.fn((event: string, callback: (...args: any[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(callback);
      return () => listeners.get(event)?.delete(callback);
    }),
    off: vi.fn((event: string, callback: (...args: any[]) => void) => {
      listeners.get(event)?.delete(callback);
    }),
    emit: vi.fn((eventData: { type: string;[key: string]: any }) => {
      const eventListeners = listeners.get(eventData.type);
      if (eventListeners) {
        for (const callback of eventListeners) {
          callback(eventData);
        }
      }
    }),
    once: vi.fn((event: string, callback: (...args: any[]) => void) => {
      const wrappedCallback = (...args: unknown[]) => {
        listeners.get(event)?.delete(wrappedCallback);
        callback(...args);
      };
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(wrappedCallback);
    }),
    removeAllListeners: vi.fn((event?: string) => {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    }),
    listenerCount: vi.fn((event: string) => {
      return listeners.get(event)?.size ?? 0;
    }),
    _getListeners: () => listeners,
  };
}
