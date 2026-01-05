/**
 * Base provider class for all AI providers
 * @module providers/base
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
import { SutraError } from '../types';
import { createRetryWrapper } from '../utils/retry';
import { EventEmitter, EventFactory, generateRequestId } from '../utils/events';

/**
 * Abstract base class for AI provider adapters
 */
export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected events: EventEmitter;
  protected getApiKey: () => Promise<string>;
  protected retry: <T>(fn: () => Promise<T>, signal?: AbortSignal) => Promise<T>;

  constructor(
    config: ProviderConfig,
    events: EventEmitter,
    getApiKey: () => Promise<string>
  ) {
    this.config = config;
    this.events = events;
    this.getApiKey = getApiKey;
    this.retry = createRetryWrapper(
      config.maxRetries ?? 3,
      config.name,
      (provider, attempt, max) => {
        this.events.emit(EventFactory.retryAttempt(provider, '', attempt, max));
      }
    );
  }

  /**
   * Provider name
   */
  abstract get name(): ProviderName;

  /**
   * Execute a chat completion
   */
  abstract chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Execute a streaming chat completion
   */
  abstract chatStream(request: ChatRequest): AsyncIterable<ChatStreamDelta>;

  /**
   * Get embeddings (if supported)
   */
  async embed(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new SutraError(
      `Embeddings not supported by ${this.name}`,
      'PROVIDER_NOT_FOUND',
      { provider: this.name }
    );
  }

  /**
   * List available models
   */
  abstract listModels(): Promise<ModelInfo[]>;

  /**
   * Check if provider supports a feature
   */
  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    switch (feature) {
      case 'streaming':
        return true;
      case 'embeddings':
      case 'vision':
      case 'tools':
        return false;
      default:
        return false;
    }
  }

  /**
   * Make an HTTP request to the provider
   */
  protected async makeRequest<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      stream?: boolean;
    } = {}
  ): Promise<T | Response> {
    const apiKey = await this.getApiKey();
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(apiKey),
      ...this.config.headers,
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout ?? 60000);

    // Link to external signal if provided
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        method: options.method ?? 'POST',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Return raw response for streaming
      if (options.stream) {
        return response;
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof SutraError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new SutraError('Request timeout', 'TIMEOUT', {
            provider: this.name,
            retryable: true,
          });
        }

        throw new SutraError(error.message, 'NETWORK_ERROR', {
          provider: this.name,
          retryable: true,
          cause: error,
        });
      }

      throw new SutraError('Unknown error', 'UNKNOWN_ERROR', {
        provider: this.name,
        details: error,
      });
    }
  }

  /**
   * Get authorization headers for the provider
   */
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }

  /**
   * Handle error responses from the provider
   */
  protected async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorDetails: unknown;

    try {
      const errorBody = await response.json();
      errorDetails = errorBody;
      
      // Extract message from common error formats
      if (errorBody.error?.message) {
        errorMessage = errorBody.error.message;
      } else if (errorBody.message) {
        errorMessage = errorBody.message;
      } else if (typeof errorBody.error === 'string') {
        errorMessage = errorBody.error;
      }
    } catch {
      // Use default error message
    }

    const errorCode = this.mapHttpStatusToErrorCode(response.status);
    const retryable = response.status === 429 || response.status >= 500;

    throw new SutraError(errorMessage, errorCode, {
      provider: this.name,
      statusCode: response.status,
      retryable,
      details: errorDetails,
    });
  }

  /**
   * Map HTTP status codes to error codes
   */
  protected mapHttpStatusToErrorCode(status: number): import('../types').SutraErrorCode {
    switch (status) {
      case 401:
        return 'KEY_INVALID';
      case 403:
        return 'KEY_INVALID';
      case 404:
        return 'MODEL_NOT_FOUND';
      case 429:
        return 'RATE_LIMITED';
      case 408:
        return 'TIMEOUT';
      default:
        if (status >= 500) {
          return 'REQUEST_FAILED';
        }
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Generate a request ID
   */
  protected generateRequestId(): string {
    return generateRequestId();
  }

  /**
   * Emit request start event
   */
  protected emitRequestStart(requestId: string, model: string): void {
    this.events.emit(EventFactory.requestStart(requestId, this.name, model));
  }

  /**
   * Emit request end event
   */
  protected emitRequestEnd(
    requestId: string,
    model: string,
    duration: number,
    usage?: import('../types').Usage
  ): void {
    this.events.emit(EventFactory.requestEnd(requestId, this.name, model, duration, usage));
  }

  /**
   * Emit request error event
   */
  protected emitRequestError(
    requestId: string,
    model: string,
    error: Error,
    duration?: number
  ): void {
    this.events.emit(EventFactory.requestError(requestId, this.name, model, error, duration));
  }

  /**
   * Emit stream start event
   */
  protected emitStreamStart(requestId: string, model: string): void {
    this.events.emit(EventFactory.streamStart(requestId, this.name, model));
  }

  /**
   * Emit stream end event
   */
  protected emitStreamEnd(requestId: string, model: string, totalChunks: number): void {
    this.events.emit(EventFactory.streamEnd(requestId, this.name, model, totalChunks));
  }

  /**
   * Emit stream error event
   */
  protected emitStreamError(requestId: string, model: string, error: Error): void {
    this.events.emit(EventFactory.streamError(requestId, this.name, model, error));
  }
}
