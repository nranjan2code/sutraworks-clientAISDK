/**
 * Unified AI client for Sutraworks Client AI SDK v2.0
 * Enhanced with middleware, batching, deduplication, and lifecycle management
 * @module core/client
 */

import type {
  SutraConfig,
  ProviderName,
  ChatRequest,
  ChatResponse,
  ChatStreamDelta,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  SutraEventType,
  SutraEventListener,
  SutraEventBase,
  KeyStorageOptions,
  BatchRequest,
  BatchResponse,
  Middleware,
  PromptTemplate,
  MiddlewareContext,
} from '../types';
import { SutraError } from '../types';
import { ConfigManager } from './config';
import { ProviderRegistry } from './registry';
import { KeyManager } from '../keys/manager';
import { EventEmitter, EventFactory } from '../utils/events';
import { collectStream } from '../streaming/handler';
import { MemoryCache, generateCacheKey, generateCacheKeyAsync } from '../utils/cache';
import { TokenCounter, estimateMessagesTokens, estimateCost } from '../utils/tokens';
import { MiddlewareManager, createValidationMiddleware } from '../middleware';
import { sleep } from '../utils/retry';

/**
 * Main SutraAI client class
 * Provides a unified interface for interacting with multiple AI providers
 * with BYOK (Bring Your Own Key) architecture
 */
export class SutraAI {
  private config: ConfigManager;
  private events: EventEmitter;
  private keyManager: KeyManager;
  private registry: ProviderRegistry;
  private cache: MemoryCache<ChatResponse> | null;
  private tokenCounter: TokenCounter;
  private middlewareManager: MiddlewareManager;
  private templates: Map<string, PromptTemplate> = new Map();
  private pendingRequests: Map<string, Promise<ChatResponse>> = new Map();
  private destroyed = false;
  private readonly deduplicateRequests: boolean;
  private readonly enableValidation: boolean;

  constructor(config?: SutraConfig & { enableValidation?: boolean }) {
    this.config = new ConfigManager(config);
    this.events = new EventEmitter();
    this.keyManager = new KeyManager(
      this.config.getKeyStorageOptions(),
      this.events
    );
    this.registry = new ProviderRegistry(
      this.config,
      this.events,
      (provider) => this.keyManager.requireKey(provider),
      { useCircuitBreaker: true }
    );

    // Initialize cache
    const cacheOptions = this.config.getCacheOptions();
    this.cache = cacheOptions.enabled ? new MemoryCache<ChatResponse>(cacheOptions) : null;

    // Initialize token counter
    this.tokenCounter = new TokenCounter();

    // Initialize middleware
    this.middlewareManager = new MiddlewareManager();

    // Add validation middleware by default (enterprise-grade)
    this.enableValidation = config?.enableValidation ?? true;
    if (this.enableValidation) {
      this.middlewareManager.use(createValidationMiddleware({ strict: true }));
    }

    // Add user-provided middleware
    if (config?.middleware) {
      for (const mw of config.middleware) {
        this.middlewareManager.use(mw);
      }
    }

    // Request deduplication
    this.deduplicateRequests = config?.deduplicateRequests ?? true;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Destroy the client and clean up all resources
   */
  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;

    // Clear pending requests
    this.pendingRequests.clear();

    // Clear cache
    this.cache?.clear();

    // Clear key manager
    await this.keyManager.destroy();

    // Clear event listeners
    this.events.removeAllListeners();

    // Clear middleware
    this.middlewareManager.clear();

    // Clear templates
    this.templates.clear();

    // Clear registry cache
    this.registry.clearCache();
  }

  /**
   * Check if client has been destroyed
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Ensure client is not destroyed
   */
  private ensureNotDestroyed(): void {
    if (this.destroyed) {
      throw new SutraError(
        'Client has been destroyed. Create a new instance.',
        'VALIDATION_ERROR'
      );
    }
  }

  // ============================================================================
  // Key Management
  // ============================================================================

  /**
   * Set an API key for a provider
   * Keys are stored client-side only, never sent to any server
   */
  async setKey(provider: ProviderName, key: string): Promise<void> {
    this.ensureNotDestroyed();
    await this.keyManager.setKey(provider, key);
  }

  /**
   * Set multiple API keys at once
   */
  async setKeys(keys: Partial<Record<ProviderName, string>>): Promise<void> {
    this.ensureNotDestroyed();
    await this.keyManager.setKeys(keys);
  }

  /**
   * Check if a key is set for a provider
   */
  async hasKey(provider: ProviderName): Promise<boolean> {
    return this.keyManager.hasKey(provider);
  }

  /**
   * Remove an API key
   */
  async removeKey(provider: ProviderName): Promise<void> {
    await this.keyManager.removeKey(provider);
  }

  /**
   * Clear all stored API keys
   */
  async clearKeys(): Promise<void> {
    await this.keyManager.clearAllKeys();
  }

  /**
   * List providers with stored keys
   */
  async listStoredKeys(): Promise<ProviderName[]> {
    return this.keyManager.listProviders();
  }

  /**
   * Update key storage options
   */
  async updateKeyStorage(options: Partial<KeyStorageOptions>): Promise<void> {
    const currentOptions = this.config.getKeyStorageOptions();
    const newOptions = { ...currentOptions, ...options };
    this.config.setKeyStorageOptions(newOptions);
    await this.keyManager.updateStorage(newOptions);
  }

  // ============================================================================
  // Middleware Management
  // ============================================================================

  /**
   * Add middleware to the request pipeline
   */
  use(middleware: Middleware): this {
    this.ensureNotDestroyed();
    this.middlewareManager.use(middleware);
    return this;
  }

  /**
   * Remove middleware by name
   */
  removeMiddleware(name: string): boolean {
    return this.middlewareManager.remove(name);
  }

  /**
   * Enable or disable middleware
   */
  toggleMiddleware(name: string, enabled: boolean): boolean {
    return this.middlewareManager.toggle(name, enabled);
  }

  /**
   * List all middleware names
   */
  listMiddleware(): string[] {
    return this.middlewareManager.list();
  }

  // ============================================================================
  // Chat Completions
  // ============================================================================

  /**
   * Execute a chat completion
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.ensureNotDestroyed();

    // Create middleware context
    const context = this.middlewareManager.createContext();

    try {
      // Execute request middleware
      const processedRequest = await this.middlewareManager.executeRequestMiddleware(
        request,
        context
      );

      // Check cache first (unless skipCache is set)
      if (this.cache && !processedRequest.stream && !processedRequest.skipCache) {
        const cacheKey = await this.getCacheKey(processedRequest);
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.events.emit(EventFactory.cacheHit(processedRequest.provider, processedRequest.model));
          // Still run response middleware on cached responses
          return this.middlewareManager.executeResponseMiddleware(cached, context);
        }
        this.events.emit(EventFactory.cacheMiss(processedRequest.provider, processedRequest.model));
      }

      // Request deduplication
      if (this.deduplicateRequests && !processedRequest.stream) {
        const cacheKey = await this.getCacheKey(processedRequest);
        const pending = this.pendingRequests.get(cacheKey);
        if (pending) {
          // Return existing promise (deduplicated)
          return pending;
        }

        const requestPromise = this.executeChat(processedRequest, context);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
          return await requestPromise;
        } finally {
          this.pendingRequests.delete(cacheKey);
        }
      }

      return this.executeChat(processedRequest, context);
    } catch (error) {
      // Execute error middleware
      if (error instanceof SutraError) {
        const result = await this.middlewareManager.executeErrorMiddleware(error, context);

        // Check if middleware recovered with a response
        if ('choices' in result) {
          return result;
        }

        // Check if middleware wants retry
        if (context.data.get('shouldRetry')) {
          const delay = (context.data.get('retryDelay') as number) ?? 1000;
          await sleep(delay);
          return this.chat(request);
        }

        // Check if middleware wants fallback
        if (context.data.get('shouldFallback')) {
          const fallbackProvider = context.data.get('fallbackProvider') as ProviderName;
          const fallbackModel = context.data.get('fallbackModel') as string;
          return this.chat({
            ...request,
            provider: fallbackProvider,
            model: fallbackModel,
          });
        }

        throw result;
      }
      throw error;
    }
  }

  /**
   * Execute chat request (internal)
   * Protected by circuit breaker for resilience
   */
  private async executeChat(
    request: ChatRequest,
    context: MiddlewareContext
  ): Promise<ChatResponse> {
    // Get provider
    const provider = this.registry.getProvider(request.provider);

    // Execute request with circuit breaker protection
    const response = await this.registry.executeWithCircuitBreaker(
      request.provider,
      () => provider.chat(request)
    );

    // Track tokens
    if (response.usage) {
      this.tokenCounter.record(
        response.model,
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );
    }

    // Add timing info
    const enrichedResponse: ChatResponse = {
      ...response,
      timing: {
        startTime: context.startTime,
        endTime: Date.now(),
        duration: Date.now() - context.startTime,
      },
    };

    // Execute response middleware
    const finalResponse = await this.middlewareManager.executeResponseMiddleware(
      enrichedResponse,
      context
    );

    // Cache response
    if (this.cache && !request.stream && !request.skipCache) {
      const cacheKey = await this.getCacheKey(request);
      this.cache.set(cacheKey, finalResponse);
    }

    return finalResponse;
  }

  /**
   * Get cache key for a request
   */
  private async getCacheKey(request: ChatRequest): Promise<string> {
    const customKeyGenerator = this.config.getCacheOptions().keyGenerator;
    if (customKeyGenerator) {
      return customKeyGenerator(request);
    }
    // Use async SHA-256 hashing for better collision resistance
    try {
      return await generateCacheKeyAsync(request);
    } catch {
      // Fallback to sync version
      return generateCacheKey(request);
    }
  }

  /**
   * Execute a streaming chat completion
   * Returns an async iterable of deltas
   */
  async *chatStream(
    request: Omit<ChatRequest, 'stream'>
  ): AsyncGenerator<ChatStreamDelta> {
    this.ensureNotDestroyed();

    const context = this.middlewareManager.createContext();
    const processedRequest = await this.middlewareManager.executeRequestMiddleware(
      { ...request, stream: true } as ChatRequest,
      context
    );

    const provider = this.registry.getProvider(processedRequest.provider);

    for await (const chunk of provider.chatStream({ ...processedRequest, stream: true })) {
      yield chunk;
    }
  }

  /**
   * Execute a streaming chat and collect the full response
   */
  async chatStreamCollect(
    request: Omit<ChatRequest, 'stream'>
  ): Promise<ChatResponse> {
    this.ensureNotDestroyed();

    const context = this.middlewareManager.createContext();
    const processedRequest = await this.middlewareManager.executeRequestMiddleware(
      { ...request, stream: true } as ChatRequest,
      context
    );

    const provider = this.registry.getProvider(processedRequest.provider);

    const response = await collectStream(
      provider.chatStream({ ...processedRequest, stream: true }),
      {
        requestId: context.requestId,
        provider: processedRequest.provider,
        model: processedRequest.model,
        events: this.events,
      }
    );

    // Track tokens
    if (response.usage) {
      this.tokenCounter.record(
        response.model,
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );
    }

    // Execute response middleware
    return this.middlewareManager.executeResponseMiddleware(response, context);
  }

  // ============================================================================
  // Batch Processing
  // ============================================================================

  /**
   * Execute multiple chat requests in parallel with concurrency control
   * Supports retry budget to prevent retry storms
   */
  async batch(batchRequest: BatchRequest): Promise<BatchResponse> {
    this.ensureNotDestroyed();

    const {
      requests,
      concurrency = 5,
      stopOnError = false,
      onProgress,
      maxTotalRetries
    } = batchRequest;

    const results: Array<ChatResponse | SutraError> = new Array(requests.length);
    let completed = 0;
    let successful = 0;
    let failed = 0;
    let totalTokens = 0;
    let totalRetries = 0;
    let retryBudgetExhausted = false;
    const startTime = Date.now();

    // Process in chunks based on concurrency
    const chunks: ChatRequest[][] = [];
    for (let i = 0; i < requests.length; i += concurrency) {
      chunks.push(requests.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (request, chunkIndex) => {
        const index = chunks.indexOf(chunk) * concurrency + chunkIndex;
        try {
          // If retry budget is exhausted, fail fast without retrying
          const effectiveRequest = retryBudgetExhausted
            ? { ...request, skipCache: true } // Could add noRetry flag if supported
            : request;

          const response = await this.chat(effectiveRequest);
          results[index] = response;
          successful++;
          totalTokens += response.usage?.total_tokens ?? 0;
          onProgress?.(completed + 1, requests.length, response);
          return { success: true as const, index };
        } catch (error) {
          const sutraError = error instanceof SutraError
            ? error
            : new SutraError(
              error instanceof Error ? error.message : 'Unknown error',
              'UNKNOWN_ERROR',
              { cause: error instanceof Error ? error : undefined }
            );

          // Track retries if the error indicates a retry occurred
          if (sutraError.retryable) {
            totalRetries++;
            if (maxTotalRetries !== undefined && totalRetries >= maxTotalRetries) {
              retryBudgetExhausted = true;
            }
          }

          results[index] = sutraError;
          failed++;
          onProgress?.(completed + 1, requests.length);
          return { success: false as const, index, error: sutraError };
        } finally {
          completed++;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      // Check for stop on error or retry budget exhaustion
      if (stopOnError && chunkResults.some(r => !r.success)) {
        break;
      }
    }

    this.events.emit({
      type: 'batch:complete',
      timestamp: Date.now(),
    });

    return {
      results,
      summary: {
        total: requests.length,
        successful,
        failed,
        totalDuration: Date.now() - startTime,
        totalTokens,
      },
    };
  }

  // ============================================================================
  // Embeddings
  // ============================================================================

  /**
   * Generate embeddings for text
   */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    this.ensureNotDestroyed();

    const provider = this.registry.getProvider(request.provider);

    if (!provider.supports('embeddings')) {
      throw new SutraError(
        `Provider "${request.provider}" does not support embeddings`,
        'PROVIDER_NOT_FOUND',
        { provider: request.provider }
      );
    }

    return provider.embed(request);
  }

  // ============================================================================
  // Model Information
  // ============================================================================

  /**
   * List available models from a provider
   */
  async listModels(provider: ProviderName): Promise<ModelInfo[]> {
    this.ensureNotDestroyed();
    return this.registry.listModels(provider);
  }

  /**
   * List models from all configured providers
   */
  async listAllModels(): Promise<ModelInfo[]> {
    this.ensureNotDestroyed();
    return this.registry.listAllModels();
  }

  /**
   * Get list of available providers
   */
  getProviders(): ProviderName[] {
    return this.registry.getAvailableProviders();
  }

  /**
   * Check if a provider supports a feature
   */
  supportsFeature(
    provider: ProviderName,
    feature: 'streaming' | 'embeddings' | 'vision' | 'tools'
  ): boolean {
    return this.registry.supportsFeature(provider, feature);
  }

  // ============================================================================
  // Prompt Templates
  // ============================================================================

  /**
   * Register a prompt template
   */
  registerTemplate(template: PromptTemplate): this {
    this.ensureNotDestroyed();
    this.templates.set(template.name, template);
    return this;
  }

  /**
   * Remove a prompt template
   */
  removeTemplate(name: string): boolean {
    return this.templates.delete(name);
  }

  /**
   * List all template names
   */
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Execute a prompt template
   */
  async executeTemplate(
    templateName: string,
    variables: Record<string, string>,
    options?: Partial<ChatRequest>
  ): Promise<ChatResponse> {
    this.ensureNotDestroyed();

    const template = this.templates.get(templateName);
    if (!template) {
      throw new SutraError(
        `Template "${templateName}" not found`,
        'TEMPLATE_ERROR'
      );
    }

    // Validate required variables
    if (template.variables) {
      for (const varDef of template.variables) {
        if (varDef.required && !(varDef.name in variables)) {
          if (varDef.default) {
            variables[varDef.name] = varDef.default;
          } else {
            throw new SutraError(
              `Missing required variable: ${varDef.name}`,
              'TEMPLATE_ERROR'
            );
          }
        }
        // Validate if validator provided
        if (varDef.validate && variables[varDef.name]) {
          if (!varDef.validate(variables[varDef.name])) {
            throw new SutraError(
              `Invalid value for variable: ${varDef.name}`,
              'TEMPLATE_ERROR'
            );
          }
        }
      }
    }

    // Replace variables in template
    const replaceVars = (text: string): string => {
      return text.replace(/\{(\w+)\}/g, (match, varName) => {
        return variables[varName] ?? match;
      });
    };

    // Build messages
    const messages: ChatRequest['messages'] = [];
    if (template.system) {
      messages.push({ role: 'system', content: replaceVars(template.system) });
    }
    messages.push({ role: 'user', content: replaceVars(template.user) });
    if (template.assistant) {
      messages.push({ role: 'assistant', content: replaceVars(template.assistant) });
    }

    // Execute chat
    return this.chat({
      provider: options?.provider ?? template.provider ?? 'openai',
      model: options?.model ?? template.model ?? 'gpt-4-turbo',
      messages,
      ...template.options,
      ...options,
    });
  }

  // ============================================================================
  // Events
  // ============================================================================

  /**
   * Subscribe to SDK events
   */
  on<T extends SutraEventBase>(
    type: SutraEventType,
    listener: SutraEventListener<T>
  ): () => void {
    return this.events.on(type, listener);
  }

  /**
   * Subscribe to all SDK events
   */
  onAll(listener: SutraEventListener): () => void {
    return this.events.onAll(listener);
  }

  /**
   * Unsubscribe from SDK events
   */
  off<T extends SutraEventBase>(
    type: SutraEventType,
    listener: SutraEventListener<T>
  ): void {
    this.events.off(type, listener);
  }

  // ============================================================================
  // Token Counting & Cost Estimation
  // ============================================================================

  /**
   * Estimate tokens for a message array
   */
  estimateTokens(messages: ChatRequest['messages']): number {
    return estimateMessagesTokens(messages);
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model: string
  ): { input: number; output: number; total: number } {
    return estimateCost(inputTokens, outputTokens, model);
  }

  /**
   * Get token usage statistics
   */
  getUsageStats(): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    requests: number;
    estimatedCost: number;
  } {
    return this.tokenCounter.getTotals();
  }

  /**
   * Get usage broken down by model
   */
  getUsageByModel(): Record<
    string,
    { input: number; output: number; cost: number }
  > {
    return this.tokenCounter.getByModel();
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.tokenCounter.reset();
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Update provider configuration
   */
  configureProvider(
    provider: ProviderName,
    config: {
      baseUrl?: string;
      defaultModel?: string;
      timeout?: number;
      maxRetries?: number;
      headers?: Record<string, string>;
    }
  ): void {
    this.ensureNotDestroyed();
    this.registry.updateProviderConfig(provider, config);
  }

  /**
   * Enable or disable caching
   */
  setCache(enabled: boolean, options?: { ttl?: number; maxEntries?: number; maxSize?: number }): void {
    this.ensureNotDestroyed();
    const cacheOptions = {
      enabled,
      ttl: options?.ttl,
      maxEntries: options?.maxEntries,
      maxSize: options?.maxSize,
      storage: 'memory' as const,
    };
    this.config.setCacheOptions(cacheOptions);
    this.cache = enabled ? new MemoryCache<ChatResponse>(options) : null;
  }

  /**
   * Clear the response cache
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; totalHits: number; avgHits: number; memoryUsage: number } | null {
    if (!this.cache) return null;
    const stats = this.cache.getStats();
    return {
      size: stats.size,
      totalHits: stats.totalHits,
      avgHits: stats.avgHits,
      memoryUsage: stats.memoryUsage,
    };
  }

  /**
   * Enable or disable debug mode
   */
  setDebug(enabled: boolean): void {
    this.config.setDebug(enabled);
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Simple text completion shorthand
   */
  async complete(
    prompt: string,
    options: {
      provider?: ProviderName;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<string> {
    this.ensureNotDestroyed();

    const provider = options.provider ?? 'openai';
    const providerConfig = this.config.getProviderConfig(provider);
    const model = options.model ?? providerConfig.defaultModel ?? 'gpt-4-turbo';

    const response = await this.chat({
      provider,
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
    return content?.map(p => p.text ?? '').join('') ?? '';
  }

  /**
   * Stream text completion shorthand
   */
  async *completeStream(
    prompt: string,
    options: {
      provider?: ProviderName;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<string> {
    this.ensureNotDestroyed();

    const provider = options.provider ?? 'openai';
    const providerConfig = this.config.getProviderConfig(provider);
    const model = options.model ?? providerConfig.defaultModel ?? 'gpt-4-turbo';

    for await (const chunk of this.chatStream({
      provider,
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    })) {
      const content = chunk.choices[0]?.delta?.content;
      if (typeof content === 'string' && content) {
        yield content;
      }
    }
  }
}
