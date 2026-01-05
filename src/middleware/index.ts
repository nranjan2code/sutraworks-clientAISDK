/**
 * Middleware system for Sutraworks Client AI SDK
 * Provides extensible request/response transformation pipeline
 * @module middleware
 */

import type {
  Middleware,
  MiddlewareContext,
  RequestMiddleware,
  ResponseMiddleware,
  ErrorMiddleware,
  ChatRequest,
  ChatResponse,
  ProviderName,
} from '../types';
import { SutraError } from '../types';
import { Encryption } from '../keys/encryption';

/**
 * Middleware manager for handling request/response pipelines
 */
export class MiddlewareManager {
  private middleware: Middleware[] = [];

  /**
   * Add middleware to the pipeline
   */
  use(middleware: Middleware): this {
    this.middleware.push(middleware);
    this.sortMiddleware();
    return this;
  }

  /**
   * Remove middleware by name
   */
  remove(name: string): boolean {
    const index = this.middleware.findIndex(m => m.name === name);
    if (index >= 0) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable or disable middleware by name
   */
  toggle(name: string, enabled: boolean): boolean {
    const mw = this.middleware.find(m => m.name === name);
    if (mw) {
      mw.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get middleware by name
   */
  get(name: string): Middleware | undefined {
    return this.middleware.find(m => m.name === name);
  }

  /**
   * List all middleware names
   */
  list(): string[] {
    return this.middleware.map(m => m.name);
  }

  /**
   * Clear all middleware
   */
  clear(): void {
    this.middleware = [];
  }

  /**
   * Sort middleware by priority (lower runs first)
   */
  private sortMiddleware(): void {
    this.middleware.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  /**
   * Create a new middleware context
   */
  createContext(): MiddlewareContext {
    return {
      requestId: Encryption.generateUUID(),
      startTime: Date.now(),
      data: new Map(),
      abortController: new AbortController(),
    };
  }

  /**
   * Execute request middleware pipeline
   */
  async executeRequestMiddleware(
    request: ChatRequest,
    context: MiddlewareContext
  ): Promise<ChatRequest> {
    let currentRequest = { ...request };

    for (const mw of this.middleware) {
      if (mw.enabled === false) continue;
      if (!mw.beforeRequest) continue;

      try {
        currentRequest = await mw.beforeRequest(currentRequest, context);
      } catch (error) {
        throw new SutraError(
          `Middleware "${mw.name}" failed in beforeRequest: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MIDDLEWARE_ERROR',
          {
            cause: error instanceof Error ? error : undefined,
            details: { middleware: mw.name, phase: 'beforeRequest' },
          }
        );
      }
    }

    return currentRequest;
  }

  /**
   * Execute response middleware pipeline (in reverse order)
   */
  async executeResponseMiddleware(
    response: ChatResponse,
    context: MiddlewareContext
  ): Promise<ChatResponse> {
    let currentResponse = { ...response };

    // Execute in reverse order
    for (let i = this.middleware.length - 1; i >= 0; i--) {
      const mw = this.middleware[i];
      if (mw.enabled === false) continue;
      if (!mw.afterResponse) continue;

      try {
        currentResponse = await mw.afterResponse(currentResponse, context);
      } catch (error) {
        throw new SutraError(
          `Middleware "${mw.name}" failed in afterResponse: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MIDDLEWARE_ERROR',
          {
            cause: error instanceof Error ? error : undefined,
            details: { middleware: mw.name, phase: 'afterResponse' },
          }
        );
      }
    }

    return currentResponse;
  }

  /**
   * Execute error middleware pipeline
   * Returns modified error or recovery response
   */
  async executeErrorMiddleware(
    error: SutraError,
    context: MiddlewareContext
  ): Promise<SutraError | ChatResponse> {
    let currentError: SutraError | ChatResponse = error;

    for (const mw of this.middleware) {
      if (mw.enabled === false) continue;
      if (!mw.onError) continue;

      try {
        // If already recovered to a response, stop processing
        if ('choices' in currentError) {
          return currentError;
        }

        currentError = await mw.onError(currentError, context);
      } catch (newError) {
        // If error handler throws, wrap it
        currentError = new SutraError(
          `Middleware "${mw.name}" failed in onError: ${newError instanceof Error ? newError.message : 'Unknown error'}`,
          'MIDDLEWARE_ERROR',
          {
            cause: newError instanceof Error ? newError : undefined,
            details: { middleware: mw.name, phase: 'onError', originalError: error },
          }
        );
      }
    }

    return currentError;
  }
}

// ============================================================================
// Built-in Middleware
// ============================================================================

/**
 * Logging middleware - logs requests and responses (never logs sensitive data)
 */
export function createLoggingMiddleware(options?: {
  logRequest?: boolean;
  logResponse?: boolean;
  logErrors?: boolean;
  logger?: (message: string, data?: unknown) => void;
}): Middleware {
  const log = options?.logger ?? console.log;
  const logRequest = options?.logRequest ?? true;
  const logResponse = options?.logResponse ?? true;
  const logErrors = options?.logErrors ?? true;

  return {
    name: 'logging',
    priority: 1, // Run early for request logging

    beforeRequest: async (request, context) => {
      if (logRequest) {
        log(`[${context.requestId}] Request to ${request.provider}/${request.model}`, {
          messageCount: request.messages.length,
          temperature: request.temperature,
          maxTokens: request.max_tokens,
        });
      }
      return request;
    },

    afterResponse: async (response, context) => {
      if (logResponse) {
        const duration = Date.now() - context.startTime;
        log(`[${context.requestId}] Response in ${duration}ms`, {
          model: response.model,
          usage: response.usage,
          finishReason: response.choices[0]?.finish_reason,
        });
      }
      return response;
    },

    onError: async (error, context) => {
      if (logErrors) {
        log(`[${context.requestId}] Error: ${error.code}`, {
          message: error.message,
          provider: error.provider,
          retryable: error.retryable,
        });
      }
      return error;
    },
  };
}

/**
 * Retry middleware - adds retry logic with exponential backoff
 */
export function createRetryMiddleware(options?: {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryOn?: SutraError['code'][];
}): Middleware {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 30000;
  const retryOn = options?.retryOn ?? ['RATE_LIMITED', 'TIMEOUT', 'NETWORK_ERROR', 'REQUEST_FAILED'];

  return {
    name: 'retry',
    priority: 10,

    onError: async (error, context) => {
      const attempt = (context.data.get('retryAttempt') as number) ?? 0;

      if (attempt >= maxRetries || !retryOn.includes(error.code)) {
        return error;
      }

      // Calculate delay
      const delay = error.retryAfter ?? Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      
      // Store retry info
      context.data.set('retryAttempt', attempt + 1);
      context.data.set('retryDelay', delay);
      context.data.set('shouldRetry', true);

      return error;
    },
  };
}

/**
 * Rate limiting middleware - client-side rate limiting
 */
export function createRateLimitMiddleware(options: {
  requestsPerMinute: number;
  tokensPerMinute?: number;
}): Middleware {
  const requestTimes: number[] = [];
  const tokenCounts: Array<{ time: number; tokens: number }> = [];
  const { requestsPerMinute, tokensPerMinute } = options;

  const cleanOldEntries = () => {
    const oneMinuteAgo = Date.now() - 60000;
    while (requestTimes.length > 0 && requestTimes[0] < oneMinuteAgo) {
      requestTimes.shift();
    }
    while (tokenCounts.length > 0 && tokenCounts[0].time < oneMinuteAgo) {
      tokenCounts.shift();
    }
  };

  return {
    name: 'rate-limit',
    priority: 5, // Run before most middleware

    beforeRequest: async (request, _context) => {
      cleanOldEntries();

      // Check request rate
      if (requestTimes.length >= requestsPerMinute) {
        const waitTime = 60000 - (Date.now() - requestTimes[0]);
        throw new SutraError(
          `Rate limit exceeded: ${requestsPerMinute} requests per minute`,
          'RATE_LIMITED',
          { retryable: true, retryAfter: waitTime }
        );
      }

      // Check token rate (if configured and estimatable)
      if (tokensPerMinute) {
        const totalTokens = tokenCounts.reduce((sum, t) => sum + t.tokens, 0);
        if (totalTokens >= tokensPerMinute) {
          const waitTime = 60000 - (Date.now() - tokenCounts[0].time);
          throw new SutraError(
            `Token rate limit exceeded: ${tokensPerMinute} tokens per minute`,
            'RATE_LIMITED',
            { retryable: true, retryAfter: waitTime }
          );
        }
      }

      requestTimes.push(Date.now());
      return request;
    },

    afterResponse: async (response, _context) => {
      if (response.usage) {
        tokenCounts.push({
          time: Date.now(),
          tokens: response.usage.total_tokens,
        });
      }
      return response;
    },
  };
}

/**
 * Timeout middleware - adds request timeout
 */
export function createTimeoutMiddleware(timeoutMs: number): Middleware {
  return {
    name: 'timeout',
    priority: 2,

    beforeRequest: async (request, context) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        context.abortController.abort();
      }, timeoutMs);

      // Store timeout ID for cleanup
      context.data.set('timeoutId', timeoutId);

      // Ensure request uses our abort signal
      return {
        ...request,
        signal: context.abortController.signal,
      };
    },

    afterResponse: async (response, context) => {
      // Clear timeout
      const timeoutId = context.data.get('timeoutId') as ReturnType<typeof setTimeout>;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return response;
    },

    onError: async (error, context) => {
      // Clear timeout
      const timeoutId = context.data.get('timeoutId') as ReturnType<typeof setTimeout>;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return error;
    },
  };
}

/**
 * Content filter middleware - filters/sanitizes request and response content
 */
export function createContentFilterMiddleware(options: {
  filterRequest?: (content: string) => string;
  filterResponse?: (content: string) => string;
  blockedPatterns?: RegExp[];
}): Middleware {
  const { filterRequest, filterResponse, blockedPatterns } = options;

  const checkBlocked = (content: string): void => {
    if (!blockedPatterns) return;
    for (const pattern of blockedPatterns) {
      if (pattern.test(content)) {
        throw new SutraError(
          'Content blocked by filter',
          'CONTENT_FILTERED',
          { details: { pattern: pattern.toString() } }
        );
      }
    }
  };

  return {
    name: 'content-filter',
    priority: 3,

    beforeRequest: async (request, _context) => {
      if (!filterRequest && !blockedPatterns) return request;

      const filteredMessages = request.messages.map(msg => {
        if (typeof msg.content === 'string') {
          checkBlocked(msg.content);
          return {
            ...msg,
            content: filterRequest ? filterRequest(msg.content) : msg.content,
          };
        }
        return msg;
      });

      return { ...request, messages: filteredMessages };
    },

    afterResponse: async (response, _context) => {
      if (!filterResponse && !blockedPatterns) return response;

      const filteredChoices = response.choices.map(choice => {
        const content = choice.message.content;
        if (typeof content === 'string') {
          checkBlocked(content);
          return {
            ...choice,
            message: {
              ...choice.message,
              content: filterResponse ? filterResponse(content) : content,
            },
          };
        }
        return choice;
      });

      return { ...response, choices: filteredChoices };
    },
  };
}

/**
 * Fallback middleware - switches to fallback provider on error
 */
export function createFallbackMiddleware(options: {
  fallbacks: Array<{ provider: ProviderName; model: string }>;
  fallbackOn?: SutraError['code'][];
}): Middleware {
  const { fallbacks, fallbackOn } = options;
  const defaultFallbackOn: SutraError['code'][] = [
    'RATE_LIMITED',
    'REQUEST_FAILED',
    'TIMEOUT',
    'NETWORK_ERROR',
    'QUOTA_EXCEEDED',
  ];

  return {
    name: 'fallback',
    priority: 90, // Run late

    onError: async (error, context) => {
      const shouldFallback = (fallbackOn ?? defaultFallbackOn).includes(error.code);
      if (!shouldFallback) return error;

      const attemptedProviders = (context.data.get('attemptedProviders') as string[]) ?? [];
      const nextFallback = fallbacks.find(
        f => !attemptedProviders.includes(`${f.provider}:${f.model}`)
      );

      if (nextFallback) {
        attemptedProviders.push(`${nextFallback.provider}:${nextFallback.model}`);
        context.data.set('attemptedProviders', attemptedProviders);
        context.data.set('fallbackProvider', nextFallback.provider);
        context.data.set('fallbackModel', nextFallback.model);
        context.data.set('shouldFallback', true);
      }

      return error;
    },
  };
}

/**
 * Metrics middleware - collects performance metrics
 */
export function createMetricsMiddleware(options?: {
  onMetrics?: (metrics: {
    requestId: string;
    provider: ProviderName;
    model: string;
    duration: number;
    inputTokens: number;
    outputTokens: number;
    success: boolean;
    error?: string;
  }) => void;
}): Middleware {
  return {
    name: 'metrics',
    priority: 0, // Run first

    beforeRequest: async (request, context) => {
      context.data.set('metricsProvider', request.provider);
      context.data.set('metricsModel', request.model);
      return request;
    },

    afterResponse: async (response, context) => {
      if (options?.onMetrics) {
        options.onMetrics({
          requestId: context.requestId,
          provider: context.data.get('metricsProvider') as ProviderName,
          model: context.data.get('metricsModel') as string,
          duration: Date.now() - context.startTime,
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          success: true,
        });
      }
      return response;
    },

    onError: async (error, context) => {
      if (options?.onMetrics) {
        options.onMetrics({
          requestId: context.requestId,
          provider: context.data.get('metricsProvider') as ProviderName,
          model: context.data.get('metricsModel') as string,
          duration: Date.now() - context.startTime,
          inputTokens: 0,
          outputTokens: 0,
          success: false,
          error: error.code,
        });
      }
      return error;
    },
  };
}

// Export types
export type {
  Middleware,
  MiddlewareContext,
  RequestMiddleware,
  ResponseMiddleware,
  ErrorMiddleware,
};
