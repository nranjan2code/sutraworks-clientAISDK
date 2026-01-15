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
import {
  createErrorFromResponse,
  createErrorFromException,
} from '../utils/errors';

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
   * Supports request cancellation via AbortSignal
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

    /**
     * Header merge order (later values override earlier):
     * 1. Default Content-Type (lowest priority)
     * 2. Provider auth headers (e.g., Authorization, x-api-key)
     * 3. Provider config headers (from SutraConfig.providers[name].headers)
     * 4. Request-specific headers (highest priority, from ChatRequest.headers)
     * 
     * This allows request-level headers to override config-level headers,
     * which in turn override default headers.
     */
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

    // Link to external signal if provided, with proper cleanup
    let abortHandler: (() => void) | null = null;
    if (options.signal) {
      abortHandler = () => controller.abort();
      options.signal.addEventListener('abort', abortHandler);
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

      throw createErrorFromException(error, this.name);
    } finally {
      // Always remove abort listener to prevent memory leaks
      if (abortHandler && options.signal) {
        options.signal.removeEventListener('abort', abortHandler);
      }
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
   * Uses centralized error handling for consistent error creation
   */
  protected async handleErrorResponse(response: Response, requestId?: string): Promise<never> {
    throw await createErrorFromResponse(response, this.name, requestId);
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
