/**
 * Stream handler for processing AI responses v2.0
 * Enhanced with proper cleanup, abort handling, and memory management
 * @module streaming/handler
 */

import type {
  ChatStreamDelta,
  ChatResponse,
  ChatChoice,
  Message,
  Usage,
  ProviderName,
} from '../types';
import { SutraError } from '../types';
import { EventEmitter, EventFactory } from '../utils/events';

/**
 * Options for stream handling
 */
export interface StreamHandlerOptions {
  requestId: string;
  provider: ProviderName;
  model: string;
  events: EventEmitter;
  onChunk?: (chunk: ChatStreamDelta) => void;
  onProgress?: (progress: StreamProgress) => void;
  signal?: AbortSignal;
  timeout?: number;
  maxChunks?: number;
  maxTokens?: number;
}

/**
 * Stream progress information
 */
export interface StreamProgress {
  chunkCount: number;
  totalTokens: number;
  contentLength: number;
  duration: number;
  tokensPerSecond: number;
}

/**
 * Accumulated stream state
 */
export interface StreamState {
  id: string;
  model: string;
  provider: ProviderName;
  choices: Map<number, AccumulatedChoice>;
  usage?: Usage;
  chunkCount: number;
  startTime: number;
  endTime?: number;
  totalContentLength: number;
}

/**
 * Accumulated choice data
 */
interface AccumulatedChoice {
  content: string;
  role?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  finishReason: string | null;
}

/**
 * Stream statistics
 */
export interface StreamStats {
  chunkCount: number;
  totalDuration: number;
  averageChunkSize: number;
  tokensPerSecond: number;
  firstTokenTime?: number;
  timeToLastToken?: number;
}

/**
 * Stream handler for accumulating and processing streaming responses
 * Provides proper cleanup, abort handling, and memory management
 */
export class StreamHandler {
  private state: StreamState;
  private options: StreamHandlerOptions;
  private aborted = false;
  private abortReason?: string;
  private timeoutId?: ReturnType<typeof setTimeout>;
  private abortListener?: () => void;
  private firstChunkTime?: number;
  private cleaned = false;

  constructor(options: StreamHandlerOptions) {
    this.options = options;
    this.state = {
      id: '',
      model: options.model,
      provider: options.provider,
      choices: new Map(),
      chunkCount: 0,
      startTime: Date.now(),
      totalContentLength: 0,
    };

    // Setup abort signal listener
    if (options.signal) {
      this.abortListener = () => {
        this.abort('Signal aborted');
      };
      options.signal.addEventListener('abort', this.abortListener, { once: true });
    }

    // Setup timeout
    if (options.timeout && options.timeout > 0) {
      this.timeoutId = setTimeout(() => {
        this.abort('Stream timeout exceeded');
      }, options.timeout);
    }
  }

  /**
   * Process a streaming chunk
   */
  processChunk(chunk: ChatStreamDelta): void {
    if (this.aborted || this.cleaned) return;

    // Record first chunk time for time-to-first-token metric
    if (!this.firstChunkTime) {
      this.firstChunkTime = Date.now();
    }

    // Check max chunks limit
    if (this.options.maxChunks && this.state.chunkCount >= this.options.maxChunks) {
      this.abort('Maximum chunk count exceeded');
      return;
    }

    this.state.chunkCount++;

    // Update state from chunk
    if (chunk.id) {
      this.state.id = chunk.id;
    }
    if (chunk.model) {
      this.state.model = chunk.model;
    }
    if (chunk.usage) {
      this.state.usage = chunk.usage;

      // Check max tokens limit
      if (this.options.maxTokens && chunk.usage.total_tokens > this.options.maxTokens) {
        this.abort('Maximum token count exceeded');
        return;
      }
    }

    // Process each choice
    for (const choice of chunk.choices) {
      this.processChoice(choice);
    }

    // Update timing
    this.state.endTime = Date.now();

    // Emit chunk event
    this.options.events.emit(
      EventFactory.streamChunk(
        this.options.requestId,
        this.options.provider,
        this.options.model,
        chunk
      )
    );

    // Call user callbacks
    this.options.onChunk?.(chunk);

    // Report progress
    if (this.options.onProgress) {
      const duration = Date.now() - this.state.startTime;
      const totalTokens = this.state.usage?.total_tokens ?? 0;
      this.options.onProgress({
        chunkCount: this.state.chunkCount,
        totalTokens,
        contentLength: this.state.totalContentLength,
        duration,
        tokensPerSecond: duration > 0 ? (totalTokens / duration) * 1000 : 0,
      });
    }
  }

  /**
   * Process a single choice from a chunk
   */
  private processChoice(choice: ChatStreamDelta['choices'][0]): void {
    let accumulated = this.state.choices.get(choice.index);

    if (!accumulated) {
      accumulated = {
        content: '',
        finishReason: null,
      };
      this.state.choices.set(choice.index, accumulated);
    }

    // Accumulate content
    if (choice.delta.content) {
      accumulated.content += choice.delta.content;
      this.state.totalContentLength += choice.delta.content.length;
    }

    // Track role
    if (choice.delta.role) {
      accumulated.role = choice.delta.role;
    }

    // Accumulate tool calls
    if (choice.delta.tool_calls) {
      this.accumulateToolCalls(accumulated, choice.delta.tool_calls);
    }

    // Update finish reason
    if (choice.finish_reason) {
      accumulated.finishReason = choice.finish_reason;
    }
  }

  /**
   * Accumulate tool calls from delta
   */
  private accumulateToolCalls(
    accumulated: AccumulatedChoice,
    toolCalls: NonNullable<ChatStreamDelta['choices'][0]['delta']['tool_calls']>
  ): void {
    if (!accumulated.toolCalls) {
      accumulated.toolCalls = [];
    }

    for (const toolCall of toolCalls) {
      // Find existing tool call by index or id
      const existingIndex = accumulated.toolCalls.findIndex(
        tc => tc.id === toolCall.id || (toolCall.index !== undefined && accumulated.toolCalls!.length > toolCall.index)
      );

      if (existingIndex >= 0) {
        // Append to existing
        const existing = accumulated.toolCalls[existingIndex];
        if (toolCall.function?.name) {
          existing.function.name = toolCall.function.name;
        }
        if (toolCall.function?.arguments) {
          existing.function.arguments += toolCall.function.arguments;
        }
      } else {
        // New tool call
        accumulated.toolCalls.push({
          id: toolCall.id,
          type: 'function',
          function: {
            name: toolCall.function?.name ?? '',
            arguments: toolCall.function?.arguments ?? '',
          },
        });
      }
    }
  }

  /**
   * Get the accumulated response
   */
  getResponse(): ChatResponse {
    const choices: ChatChoice[] = [];

    // Convert accumulated state to choices
    for (const [index, accumulated] of this.state.choices) {
      const message: Message = {
        role: (accumulated.role as Message['role']) ?? 'assistant',
        content: accumulated.content,
      };

      if (accumulated.toolCalls && accumulated.toolCalls.length > 0) {
        message.tool_calls = accumulated.toolCalls;
      }

      choices.push({
        index,
        message,
        finish_reason: accumulated.finishReason as ChatChoice['finish_reason'],
      });
    }

    // Sort by index
    choices.sort((a, b) => a.index - b.index);

    // If no choices, add an empty one
    if (choices.length === 0) {
      choices.push({
        index: 0,
        message: { role: 'assistant', content: '' },
        finish_reason: this.aborted ? 'stop' : null,
      });
    }

    return {
      id: this.state.id || `stream_${this.options.requestId}`,
      object: 'chat.completion',
      created: Math.floor(this.state.startTime / 1000),
      model: this.state.model,
      provider: this.state.provider,
      choices,
      usage: this.state.usage,
      timing: {
        startTime: this.state.startTime,
        endTime: this.state.endTime ?? Date.now(),
        duration: (this.state.endTime ?? Date.now()) - this.state.startTime,
        timeToFirstToken: this.firstChunkTime 
          ? this.firstChunkTime - this.state.startTime 
          : undefined,
      },
    };
  }

  /**
   * Get current accumulated content for first choice
   */
  getCurrentContent(): string {
    const firstChoice = this.state.choices.get(0);
    return firstChoice?.content ?? '';
  }

  /**
   * Get total chunk count
   */
  getChunkCount(): number {
    return this.state.chunkCount;
  }

  /**
   * Get stream statistics
   */
  getStats(): StreamStats {
    const endTime = this.state.endTime ?? Date.now();
    const totalDuration = endTime - this.state.startTime;
    const totalTokens = this.state.usage?.total_tokens ?? 0;

    return {
      chunkCount: this.state.chunkCount,
      totalDuration,
      averageChunkSize: this.state.chunkCount > 0
        ? this.state.totalContentLength / this.state.chunkCount
        : 0,
      tokensPerSecond: totalDuration > 0
        ? (totalTokens / totalDuration) * 1000
        : 0,
      firstTokenTime: this.firstChunkTime
        ? this.firstChunkTime - this.state.startTime
        : undefined,
      timeToLastToken: this.state.endTime
        ? this.state.endTime - this.state.startTime
        : undefined,
    };
  }

  /**
   * Check if stream was aborted
   */
  isAborted(): boolean {
    return this.aborted;
  }

  /**
   * Get abort reason if aborted
   */
  getAbortReason(): string | undefined {
    return this.abortReason;
  }

  /**
   * Abort the stream
   */
  abort(reason?: string): void {
    if (this.aborted) return;

    this.aborted = true;
    this.abortReason = reason;
    this.state.endTime = Date.now();

    // Emit abort event
    this.options.events.emit({
      type: 'stream:abort',
      timestamp: Date.now(),
      requestId: this.options.requestId,
      provider: this.options.provider,
      model: this.options.model,
      reason,
    });
  }

  /**
   * Clean up resources
   * IMPORTANT: Always call this when done with the handler
   */
  cleanup(): void {
    if (this.cleaned) return;
    this.cleaned = true;

    // Clear timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    // Remove abort listener
    if (this.options.signal && this.abortListener) {
      this.options.signal.removeEventListener('abort', this.abortListener);
      this.abortListener = undefined;
    }

    // Clear state to free memory
    this.state.choices.clear();
  }
}

/**
 * Create an async iterable that yields accumulated content strings
 * With proper cleanup on break/return
 */
export async function* streamContent(
  chunks: AsyncIterable<ChatStreamDelta>,
  options?: { signal?: AbortSignal }
): AsyncGenerator<string> {
  try {
    for await (const chunk of chunks) {
      // Check for abort
      if (options?.signal?.aborted) {
        break;
      }

      for (const choice of chunk.choices) {
        const content = choice.delta.content;
        if (typeof content === 'string' && content) {
          yield content;
        }
      }
    }
  } finally {
    // Generator cleanup happens here
    // Any resources tied to the chunks iterable will be cleaned up
  }
}

/**
 * Collect all chunks and return final response
 * With proper timeout and abort handling
 */
export async function collectStream(
  chunks: AsyncIterable<ChatStreamDelta>,
  options: Omit<StreamHandlerOptions, 'onChunk'>
): Promise<ChatResponse> {
  const handler = new StreamHandler(options);

  try {
    for await (const chunk of chunks) {
      handler.processChunk(chunk);

      // Check if aborted (timeout, max chunks, etc.)
      if (handler.isAborted()) {
        const reason = handler.getAbortReason();
        throw new SutraError(
          `Stream aborted: ${reason ?? 'Unknown reason'}`,
          'STREAM_ERROR',
          {
            provider: options.provider,
            requestId: options.requestId,
            details: {
              model: options.model,
              chunkCount: handler.getChunkCount(),
            },
          }
        );
      }
    }

    return handler.getResponse();
  } finally {
    // ALWAYS cleanup, even on error
    handler.cleanup();
  }
}

/**
 * Create a buffered stream that collects chunks before yielding
 * Useful for reducing UI updates
 * Properly cleans up resources on early termination
 */
export async function* bufferedStream(
  chunks: AsyncIterable<ChatStreamDelta>,
  options: {
    bufferSize?: number;
    bufferTimeout?: number;
    signal?: AbortSignal;
  } = {}
): AsyncGenerator<ChatStreamDelta> {
  const { bufferSize = 5, bufferTimeout = 50, signal } = options;
  let buffer: ChatStreamDelta[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let pendingResolve: ((value: ChatStreamDelta[] | null) => void) | undefined;

  const clearPendingTimeout = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const flush = (): ChatStreamDelta[] => {
    const result = buffer;
    buffer = [];
    clearPendingTimeout();
    return result;
  };

  const mergeChunks = (chunks: ChatStreamDelta[]): ChatStreamDelta | null => {
    if (chunks.length === 0) return null;
    if (chunks.length === 1) return chunks[0];

    // Merge multiple chunks into one
    const merged: ChatStreamDelta = {
      id: chunks[chunks.length - 1].id,
      object: 'chat.completion.chunk',
      created: chunks[0].created,
      model: chunks[chunks.length - 1].model,
      provider: chunks[chunks.length - 1].provider,
      choices: [],
    };

    // Merge choices by index
    const choiceMap = new Map<number, ChatStreamDelta['choices'][0]>();

    for (const chunk of chunks) {
      for (const choice of chunk.choices) {
        const existing = choiceMap.get(choice.index);
        if (existing) {
          // Merge content - handle string types only
          const existingContent = existing.delta.content;
          const choiceContent = choice.delta.content;
          if (typeof existingContent === 'string' && typeof choiceContent === 'string') {
            existing.delta.content = existingContent + choiceContent;
          } else if (typeof choiceContent === 'string') {
            existing.delta.content = choiceContent;
          }
          // Keep latest finish_reason
          if (choice.finish_reason) {
            existing.finish_reason = choice.finish_reason;
          }
        } else {
          choiceMap.set(choice.index, { ...choice, delta: { ...choice.delta } });
        }
      }
    }

    merged.choices = Array.from(choiceMap.values());
    return merged;
  };

  try {
    for await (const chunk of chunks) {
      if (signal?.aborted) break;

      buffer.push(chunk);

      if (buffer.length >= bufferSize) {
        const merged = mergeChunks(flush());
        if (merged) yield merged;
      } else if (timeoutId === undefined) {
        // Set timeout for partial buffer flush
        timeoutId = setTimeout(() => {
          timeoutId = undefined;
          if (pendingResolve) {
            pendingResolve(flush());
            pendingResolve = undefined;
          }
        }, bufferTimeout);
      }
    }

    // Flush remaining buffer
    const merged = mergeChunks(flush());
    if (merged) yield merged;
  } finally {
    // CRITICAL: Always clean up timeout on generator termination
    // This handles break, return, throw, and normal completion
    clearPendingTimeout();
    buffer = []; // Clear buffer to free memory
    pendingResolve = undefined;
  }
}

/**
 * Transform stream to add timing information
 */
export async function* timedStream(
  chunks: AsyncIterable<ChatStreamDelta>
): AsyncGenerator<ChatStreamDelta & { timing: { elapsed: number; chunkIndex: number } }> {
  const startTime = Date.now();
  let chunkIndex = 0;

  for await (const chunk of chunks) {
    yield {
      ...chunk,
      timing: {
        elapsed: Date.now() - startTime,
        chunkIndex: chunkIndex++,
      },
    };
  }
}
