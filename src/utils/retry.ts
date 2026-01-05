/**
 * Retry logic with exponential backoff and Retry-After support
 * @module utils/retry
 */

import { SutraError } from '../types';
import type { ProviderName } from '../types';

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Jitter factor (0-1) */
  jitter?: number;
  /** Retry condition function */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback on retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  /** Abort signal */
  signal?: AbortSignal;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'signal' | 'onRetry' | 'shouldRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 60000, // Increased to 60 seconds
  jitter: 0.2, // Increased jitter for better distribution
};

/**
 * Default retry condition - retry on network errors and rate limits
 */
export function defaultShouldRetry(error: unknown, _attempt: number): boolean {
  if (error instanceof SutraError) {
    return error.canRetry();
  }

  // Retry on network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Retry on specific HTTP status codes
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('429') || // Rate limited
      message.includes('500') || // Server error
      message.includes('502') || // Bad gateway
      message.includes('503') || // Service unavailable
      message.includes('504') || // Gateway timeout
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('etimedout')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 * Respects Retry-After header if available
 */
export function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  jitter: number,
  retryAfter?: number
): number {
  // If Retry-After is specified, use it (with some jitter)
  if (retryAfter !== undefined && retryAfter > 0) {
    const jitterRange = retryAfter * jitter;
    const actualJitter = Math.random() * jitterRange;
    return Math.min(retryAfter + actualJitter, maxDelay);
  }

  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  
  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  // Add jitter (decorrelated jitter for better distribution)
  const jitterRange = cappedDelay * jitter;
  const actualJitter = (Math.random() * 2 - 1) * jitterRange;
  
  return Math.max(0, Math.round(cappedDelay + actualJitter));
}

/**
 * Extract Retry-After from response headers or error
 */
export function extractRetryAfter(error: unknown): number | undefined {
  // From SutraError
  if (error instanceof SutraError && error.retryAfter) {
    return error.retryAfter;
  }

  // From error details
  if (error instanceof SutraError && error.details) {
    const details = error.details as Record<string, unknown>;
    
    // Check for retry_after in response body
    if (typeof details.retry_after === 'number') {
      return details.retry_after * 1000; // Convert to ms
    }
    
    // Check for Retry-After header
    if (typeof details.headers === 'object' && details.headers) {
      const headers = details.headers as Record<string, string>;
      const retryAfter = headers['retry-after'] || headers['Retry-After'];
      if (retryAfter) {
        // Can be a number of seconds or an HTTP date
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) {
          return seconds * 1000;
        }
        // Try parsing as date
        const date = new Date(retryAfter);
        if (!isNaN(date.getTime())) {
          return Math.max(0, date.getTime() - Date.now());
        }
      }
    }
  }

  return undefined;
}

/**
 * Sleep for a given duration with abort support
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new SutraError('Request aborted', 'ABORTED'));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    const abortHandler = () => {
      clearTimeout(timeout);
      reject(new SutraError('Request aborted', 'ABORTED'));
    };

    signal?.addEventListener('abort', abortHandler, { once: true });

    // Cleanup listener after timeout completes
    const originalResolve = resolve;
    resolve = () => {
      signal?.removeEventListener('abort', abortHandler);
      originalResolve();
    };
  });
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let lastRetryAfter: number | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Check abort signal
      if (opts.signal?.aborted) {
        throw new SutraError('Request aborted', 'ABORTED');
      }

      return await fn();
    } catch (error) {
      lastError = error;

      // Extract retry-after for next delay calculation
      lastRetryAfter = extractRetryAfter(error);

      // Don't retry on final attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Check if we should retry
      const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;
      if (!shouldRetry(error, attempt)) {
        break;
      }

      // Calculate delay
      const delay = calculateDelay(
        attempt,
        opts.baseDelay,
        opts.maxDelay,
        opts.jitter,
        lastRetryAfter
      );

      // Call retry callback
      opts.onRetry?.(error, attempt + 1, delay);

      // Wait before retrying
      await sleep(delay, opts.signal);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper for provider requests
 */
export function createRetryWrapper(
  maxRetries: number,
  provider: ProviderName,
  onRetry?: (provider: ProviderName, attempt: number, maxAttempts: number, delay: number) => void
) {
  return async function <T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return withRetry(fn, {
      maxRetries,
      signal,
      onRetry: (_error, attempt, delay) => {
        onRetry?.(provider, attempt, maxRetries, delay);
      },
    });
  };
}

/**
 * Retry with circuit breaker pattern
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private halfOpenSuccesses: number = 0;
  
  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeout: number = 30000,
    private readonly halfOpenRequests: number = 3
  ) {}

  /**
   * Check if circuit is allowing requests
   */
  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      // Check if we should transition to half-open
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'half-open';
        this.halfOpenSuccesses = 0;
        return true;
      }
      return false;
    }

    // Half-open - allow limited requests
    return true;
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.halfOpenSuccesses++;
      // After enough successful requests, close the circuit
      if (this.halfOpenSuccesses >= this.halfOpenRequests) {
        this.failures = 0;
        this.halfOpenSuccesses = 0;
        this.state = 'closed';
      }
    } else {
      this.failures = 0;
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      // Any failure in half-open returns to open
      this.state = 'open';
      this.halfOpenSuccesses = 0;
    } else if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  /**
   * Get current circuit state
   */
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.halfOpenSuccesses = 0;
    this.state = 'closed';
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new SutraError(
        'Circuit breaker is open - too many recent failures',
        'REQUEST_FAILED',
        { retryable: true, retryAfter: this.resetTimeout - (Date.now() - this.lastFailureTime) }
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}
