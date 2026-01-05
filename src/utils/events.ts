/**
 * Event system for Sutraworks Client AI SDK
 * @module utils/events
 */

import type {
  SutraEventType,
  SutraEventBase,
  SutraEventListener,
  RequestEvent,
  StreamEvent,
  ProviderName,
  Usage,
  ChatStreamDelta,
} from '../types';

/**
 * Event emitter for SDK events
 * Allows monitoring of requests, streams, and key operations
 * without exposing sensitive data
 */
export class EventEmitter {
  private listeners: Map<SutraEventType, Set<SutraEventListener>> = new Map();
  private allListeners: Set<SutraEventListener> = new Set();

  /**
   * Subscribe to a specific event type
   */
  on<T extends SutraEventBase>(type: SutraEventType, listener: SutraEventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as SutraEventListener);

    // Return unsubscribe function
    return () => this.off(type, listener);
  }

  /**
   * Subscribe to all events
   */
  onAll(listener: SutraEventListener): () => void {
    this.allListeners.add(listener);
    return () => this.allListeners.delete(listener);
  }

  /**
   * Unsubscribe from a specific event type
   */
  off<T extends SutraEventBase>(type: SutraEventType, listener: SutraEventListener<T>): void {
    this.listeners.get(type)?.delete(listener as SutraEventListener);
  }

  /**
   * Emit an event
   */
  emit<T extends SutraEventBase>(event: T): void {
    // Call type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      }
    }

    // Call all-event listeners
    for (const listener of this.allListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(type?: SutraEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
      this.allListeners.clear();
    }
  }

  /**
   * Get listener count for a type
   */
  listenerCount(type?: SutraEventType): number {
    if (type) {
      return (this.listeners.get(type)?.size ?? 0) + this.allListeners.size;
    }
    let count = this.allListeners.size;
    for (const listeners of this.listeners.values()) {
      count += listeners.size;
    }
    return count;
  }
}

/**
 * Helper functions for creating events
 */
export const EventFactory = {
  /**
   * Create a request start event
   */
  requestStart(
    requestId: string,
    provider: ProviderName,
    model: string
  ): RequestEvent {
    return {
      type: 'request:start',
      timestamp: Date.now(),
      requestId,
      provider,
      model,
    };
  },

  /**
   * Create a request end event
   */
  requestEnd(
    requestId: string,
    provider: ProviderName,
    model: string,
    duration: number,
    usage?: Usage
  ): RequestEvent {
    return {
      type: 'request:end',
      timestamp: Date.now(),
      requestId,
      provider,
      model,
      duration,
      usage,
    };
  },

  /**
   * Create a request error event
   */
  requestError(
    requestId: string,
    provider: ProviderName,
    model: string,
    error: Error,
    duration?: number
  ): RequestEvent {
    return {
      type: 'request:error',
      timestamp: Date.now(),
      requestId,
      provider,
      model,
      error,
      duration,
    };
  },

  /**
   * Create a stream start event
   */
  streamStart(
    requestId: string,
    provider: ProviderName,
    model: string
  ): StreamEvent {
    return {
      type: 'stream:start',
      timestamp: Date.now(),
      requestId,
      provider,
      model,
    };
  },

  /**
   * Create a stream chunk event
   */
  streamChunk(
    requestId: string,
    provider: ProviderName,
    model: string,
    chunk: ChatStreamDelta
  ): StreamEvent {
    return {
      type: 'stream:chunk',
      timestamp: Date.now(),
      requestId,
      provider,
      model,
      chunk,
    };
  },

  /**
   * Create a stream end event
   */
  streamEnd(
    requestId: string,
    provider: ProviderName,
    model: string,
    totalChunks: number
  ): StreamEvent {
    return {
      type: 'stream:end',
      timestamp: Date.now(),
      requestId,
      provider,
      model,
      totalChunks,
    };
  },

  /**
   * Create a stream error event
   */
  streamError(
    requestId: string,
    provider: ProviderName,
    model: string,
    error: Error
  ): StreamEvent {
    return {
      type: 'stream:error',
      timestamp: Date.now(),
      requestId,
      provider,
      model,
      error,
    };
  },

  /**
   * Create a key set event (never includes actual key)
   */
  keySet(provider: ProviderName): SutraEventBase {
    return {
      type: 'key:set',
      timestamp: Date.now(),
      provider,
    };
  },

  /**
   * Create a key remove event
   */
  keyRemove(provider: ProviderName): SutraEventBase {
    return {
      type: 'key:remove',
      timestamp: Date.now(),
      provider,
    };
  },

  /**
   * Create a key expired event
   */
  keyExpired(provider: ProviderName): SutraEventBase {
    return {
      type: 'key:expired',
      timestamp: Date.now(),
      provider,
    };
  },

  /**
   * Create a cache hit event
   */
  cacheHit(provider: ProviderName, model: string): SutraEventBase {
    return {
      type: 'cache:hit',
      timestamp: Date.now(),
      provider,
      model,
    };
  },

  /**
   * Create a cache miss event
   */
  cacheMiss(provider: ProviderName, model: string): SutraEventBase {
    return {
      type: 'cache:miss',
      timestamp: Date.now(),
      provider,
      model,
    };
  },

  /**
   * Create a retry attempt event
   */
  retryAttempt(
    provider: ProviderName,
    model: string,
    attempt: number,
    maxAttempts: number
  ): SutraEventBase & { attempt: number; maxAttempts: number } {
    return {
      type: 'retry:attempt',
      timestamp: Date.now(),
      provider,
      model,
      attempt,
      maxAttempts,
    };
  },
};

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
