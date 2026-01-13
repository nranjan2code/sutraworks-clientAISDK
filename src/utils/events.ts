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
 * Default max listeners before warning
 */
const DEFAULT_MAX_LISTENERS_WARNING = 10;

/**
 * Hard limit for max listeners per event type
 */
const DEFAULT_MAX_LISTENERS_HARD = 100;

/**
 * Event emitter for SDK events
 * Allows monitoring of requests, streams, and key operations
 * without exposing sensitive data
 */
export class EventEmitter {
  private readonly listeners: Map<SutraEventType, Set<SutraEventListener>> = new Map();
  private readonly allListeners: Set<SutraEventListener> = new Set();
  private maxListenersWarning: number = DEFAULT_MAX_LISTENERS_WARNING;
  private maxListenersHard: number = DEFAULT_MAX_LISTENERS_HARD;
  private warningEmitted: Set<SutraEventType> = new Set();

  /**
   * Subscribe to a specific event type
   * @throws SutraError if max listeners hard limit exceeded
   */
  on<T extends SutraEventBase>(type: SutraEventType, listener: SutraEventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const typeListeners = this.listeners.get(type)!;
    const currentCount = typeListeners.size;

    // Check hard limit
    if (currentCount >= this.maxListenersHard) {
      throw new Error(
        `Max listeners (${this.maxListenersHard}) exceeded for event "${type}". ` +
        'This may indicate a memory leak. Use setMaxListeners() to increase limit if intentional.'
      );
    }

    // Emit warning at threshold (only once per event type)
    if (currentCount >= this.maxListenersWarning && !this.warningEmitted.has(type)) {
      this.warningEmitted.add(type);
      console.warn(
        `EventEmitter: ${currentCount + 1} listeners added for "${type}" event. ` +
        'This may indicate a memory leak. Use setMaxListeners() to suppress this warning.'
      );
    }

    typeListeners.add(listener as SutraEventListener);

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

  /**
   * Set the maximum number of listeners before warning
   * @param n - Max listeners (0 for unlimited warnings)
   */
  setMaxListeners(n: number): this {
    this.maxListenersWarning = Math.max(0, n);
    this.warningEmitted.clear();
    return this;
  }

  /**
   * Set the hard limit for maximum listeners (throws if exceeded)
   * @param n - Hard limit (0 for unlimited)
   */
  setMaxListenersHard(n: number): this {
    this.maxListenersHard = n <= 0 ? Infinity : n;
    return this;
  }

  /**
   * Get the current max listeners warning threshold
   */
  getMaxListeners(): number {
    return this.maxListenersWarning;
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

  /**
   * Create a key error event (for key operation failures)
   */
  keyError(
    provider: ProviderName,
    operation: 'set' | 'get' | 'remove' | 'validate' | 'rotate',
    error: Error
  ): SutraEventBase & { operation: string; error: Error } {
    return {
      type: 'key:error',
      timestamp: Date.now(),
      provider,
      operation,
      error,
    };
  },

  /**
   * Create a key rotation event
   */
  keyRotate(provider: ProviderName): SutraEventBase {
    return {
      type: 'key:rotate',
      timestamp: Date.now(),
      provider,
    };
  },

  /**
   * Create a key validation event
   */
  keyValidate(
    provider: ProviderName,
    valid: boolean,
    reason?: string
  ): SutraEventBase & { valid: boolean; reason?: string } {
    return {
      type: 'key:validate',
      timestamp: Date.now(),
      provider,
      valid,
      reason,
    };
  },

  /**
   * Create a security warning event
   */
  securityWarning(
    message: string,
    provider?: ProviderName
  ): SutraEventBase & { message: string } {
    return {
      type: 'security:warning',
      timestamp: Date.now(),
      provider,
      message,
    };
  },
};

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
