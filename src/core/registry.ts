/**
 * Provider registry for managing AI provider instances
 * Enhanced with plugin system and circuit breaker integration
 * @module core/registry
 */

import type { ProviderName, ProviderConfig, ModelInfo, ExtendedModelInfo } from '../types';
import { SutraError } from '../types';
import { BaseProvider } from '../providers/base';
import { OpenAIProvider } from '../providers/openai';
import { AnthropicProvider } from '../providers/anthropic';
import { GoogleProvider } from '../providers/google';
import { OllamaProvider } from '../providers/ollama';
import { MistralProvider } from '../providers/mistral';
import { GroqProvider } from '../providers/groq';
import { CohereProvider } from '../providers/cohere';
import { TogetherProvider } from '../providers/together';
import { FireworksProvider } from '../providers/fireworks';
import { PerplexityProvider } from '../providers/perplexity';
import { ConfigManager } from './config';
import { EventEmitter } from '../utils/events';
import { CircuitBreaker } from '../utils/retry';
import { getModelRegistry } from './models';

/**
 * Provider constructor type
 */
export type ProviderConstructor = new (
  config: ProviderConfig,
  events: EventEmitter,
  getApiKey: () => Promise<string>
) => BaseProvider;

/**
 * Provider plugin definition for registering custom providers
 */
export interface ProviderPlugin {
  /** Provider name */
  name: ProviderName;
  /** Provider class constructor */
  provider: ProviderConstructor;
  /** Default configuration */
  defaultConfig?: Partial<ProviderConfig>;
  /** Provider description */
  description?: string;
  /** Provider version */
  version?: string;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  name: ProviderName;
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuitState: 'closed' | 'open' | 'half-open';
  lastError?: string;
  lastErrorTime?: number;
  successRate: number;
  averageLatency: number;
}

/**
 * Latency sample for sliding window
 */
interface LatencySample {
  readonly timestamp: number;
  readonly latency: number;
}

/**
 * Provider metrics with sliding window for latency (prevents memory leaks)
 */
interface ProviderMetrics {
  requests: number;
  successes: number;
  failures: number;
  /** Sliding window of latency samples (max 100 entries) */
  readonly latencyWindow: LatencySample[];
  /** Maximum size of latency window */
  readonly windowSize: number;
  /** Window TTL in ms (samples older than this are evicted) */
  readonly windowTtl: number;
  lastError?: string;
  lastErrorTime?: number;
}

/**
 * Registry for managing provider instances
 * Supports custom provider plugins and circuit breaker protection
 */
export class ProviderRegistry {
  private providers: Map<ProviderName, BaseProvider> = new Map();
  private providerClasses: Map<ProviderName, ProviderConstructor> = new Map();
  private providerConfigs: Map<ProviderName, Partial<ProviderConfig>> = new Map();
  private circuitBreakers: Map<ProviderName, CircuitBreaker> = new Map();
  private metrics: Map<ProviderName, ProviderMetrics> = new Map();
  private configManager: ConfigManager;
  private events: EventEmitter;
  private getApiKey: (provider: ProviderName) => Promise<string>;
  private readonly useCircuitBreaker: boolean;

  constructor(
    configManager: ConfigManager,
    events: EventEmitter,
    getApiKey: (provider: ProviderName) => Promise<string>,
    options?: { useCircuitBreaker?: boolean }
  ) {
    this.configManager = configManager;
    this.events = events;
    this.getApiKey = getApiKey;
    this.useCircuitBreaker = options?.useCircuitBreaker ?? true;

    // Register built-in providers
    this.registerBuiltInProviders();
  }

  /**
   * Register built-in provider classes
   */
  private registerBuiltInProviders(): void {
    this.providerClasses.set('openai', OpenAIProvider);
    this.providerClasses.set('anthropic', AnthropicProvider);
    this.providerClasses.set('google', GoogleProvider);
    this.providerClasses.set('ollama', OllamaProvider);
    this.providerClasses.set('mistral', MistralProvider);
    this.providerClasses.set('groq', GroqProvider);
    this.providerClasses.set('cohere', CohereProvider);
    this.providerClasses.set('together', TogetherProvider);
    this.providerClasses.set('fireworks', FireworksProvider);
    this.providerClasses.set('perplexity', PerplexityProvider);

    // Initialize metrics for built-in providers
    for (const name of this.providerClasses.keys()) {
      this.initializeMetrics(name);
    }
  }

  /**
   * Initialize metrics for a provider
   */
  private initializeMetrics(name: ProviderName): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        requests: 0,
        successes: 0,
        failures: 0,
        latencyWindow: [],
        windowSize: 100,
        windowTtl: 300000, // 5 minutes
      });
    }
  }

  /**
   * Record latency sample to sliding window
   */
  private recordLatencySample(name: ProviderName, latency: number): void {
    const metrics = this.metrics.get(name);
    if (!metrics) return;

    const now = Date.now();

    // Add new sample
    metrics.latencyWindow.push({ timestamp: now, latency });

    // Evict samples beyond window size
    while (metrics.latencyWindow.length > metrics.windowSize) {
      metrics.latencyWindow.shift();
    }

    // Evict stale samples (older than TTL)
    const cutoff = now - metrics.windowTtl;
    while (metrics.latencyWindow.length > 0 && metrics.latencyWindow[0].timestamp < cutoff) {
      metrics.latencyWindow.shift();
    }
  }

  /**
   * Calculate average latency from sliding window
   */
  private calculateAverageLatency(name: ProviderName): number {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.latencyWindow.length === 0) return 0;

    const sum = metrics.latencyWindow.reduce((acc, s) => acc + s.latency, 0);
    return sum / metrics.latencyWindow.length;
  }

  /**
   * Get or create circuit breaker for a provider
   */
  private getCircuitBreaker(name: ProviderName): CircuitBreaker {
    let breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker(5, 30000, 3);
      this.circuitBreakers.set(name, breaker);
    }
    return breaker;
  }

  /**
   * Register a custom provider using the plugin system
   * This allows extending the SDK without forking
   */
  registerPlugin(plugin: ProviderPlugin): void {
    this.providerClasses.set(plugin.name, plugin.provider);

    if (plugin.defaultConfig) {
      this.providerConfigs.set(plugin.name, plugin.defaultConfig);
    }

    this.initializeMetrics(plugin.name);

    // Clear cached instance if exists
    this.providers.delete(plugin.name);

    this.events.emit({
      type: 'provider:registered' as any,
      timestamp: Date.now(),
      provider: plugin.name,
    });
  }

  /**
   * Register a custom provider class (simplified API)
   */
  registerProvider(name: ProviderName, providerClass: ProviderConstructor): void {
    this.registerPlugin({
      name,
      provider: providerClass,
    });
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(name: ProviderName): boolean {
    // Cannot unregister built-in providers
    const builtIn = ['openai', 'anthropic', 'google', 'ollama', 'mistral', 'groq', 'cohere', 'together', 'fireworks', 'perplexity'];
    if (builtIn.includes(name)) {
      return false;
    }

    this.providerClasses.delete(name);
    this.providerConfigs.delete(name);
    this.providers.delete(name);
    this.circuitBreakers.delete(name);
    this.metrics.delete(name);

    return true;
  }

  /**
   * Get a provider instance (creates on demand)
   * Protected by circuit breaker if enabled
   */
  getProvider(name: ProviderName): BaseProvider {
    // Check circuit breaker first
    if (this.useCircuitBreaker) {
      const breaker = this.getCircuitBreaker(name);
      if (!breaker.canExecute()) {
        throw new SutraError(
          `Provider "${name}" is temporarily unavailable due to recent failures. Will retry in ${Math.ceil((30000 - (Date.now() - (this.metrics.get(name)?.lastErrorTime ?? 0))) / 1000)}s`,
          'REQUEST_FAILED',
          { provider: name, retryable: true }
        );
      }
    }

    // Return cached instance if available
    const cachedProvider = this.providers.get(name);
    if (cachedProvider) {
      return cachedProvider;
    }

    // Get provider class
    const ProviderClass = this.providerClasses.get(name);
    if (!ProviderClass) {
      throw new SutraError(
        `Provider "${name}" not found. Available providers: ${this.getAvailableProviders().join(', ')}`,
        'PROVIDER_NOT_FOUND',
        { provider: name }
      );
    }

    // Get config (merge default + user config)
    const defaultConfig = this.providerConfigs.get(name) ?? {};
    const userConfig = this.configManager.getProviderConfig(name);
    const config = { ...defaultConfig, ...userConfig };

    // Create and cache instance
    const provider = new ProviderClass(config, this.events, () => this.getApiKey(name));
    this.providers.set(name, provider);

    return provider;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    name: ProviderName,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const metrics = this.metrics.get(name);

    if (metrics) {
      metrics.requests++;
    }

    if (!this.useCircuitBreaker) {
      return fn();
    }

    const breaker = this.getCircuitBreaker(name);

    try {
      const result = await breaker.execute(fn);

      if (metrics) {
        metrics.successes++;
        this.recordLatencySample(name, Date.now() - startTime);
      }

      return result;
    } catch (error) {
      if (metrics) {
        metrics.failures++;
        metrics.lastError = error instanceof Error ? error.message : String(error);
        metrics.lastErrorTime = Date.now();
      }
      throw error;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(name: ProviderName, latency: number): void {
    const breaker = this.circuitBreakers.get(name);
    breaker?.recordSuccess();

    const metrics = this.metrics.get(name);
    if (metrics) {
      metrics.successes++;
      this.recordLatencySample(name, latency);
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(name: ProviderName, error: Error): void {
    const breaker = this.circuitBreakers.get(name);
    breaker?.recordFailure();

    const metrics = this.metrics.get(name);
    if (metrics) {
      metrics.failures++;
      metrics.lastError = error.message;
      metrics.lastErrorTime = Date.now();
    }
  }

  /**
   * Get provider health status
   */
  getProviderHealth(name: ProviderName): ProviderHealth | null {
    if (!this.providerClasses.has(name)) {
      return null;
    }

    const breaker = this.circuitBreakers.get(name);
    const metrics = this.metrics.get(name);

    const totalRequests = metrics?.requests ?? 0;
    const successRate = totalRequests > 0
      ? (metrics?.successes ?? 0) / totalRequests
      : 1;
    const averageLatency = this.calculateAverageLatency(name);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (successRate < 0.5) {
      status = 'unhealthy';
    } else if (successRate < 0.9) {
      status = 'degraded';
    }

    return {
      name,
      status,
      circuitState: breaker?.getState() ?? 'closed',
      lastError: metrics?.lastError,
      lastErrorTime: metrics?.lastErrorTime,
      successRate,
      averageLatency,
    };
  }

  /**
   * Get health status for all providers
   */
  getAllProviderHealth(): ProviderHealth[] {
    return this.getAvailableProviders()
      .map(name => this.getProviderHealth(name))
      .filter((health): health is ProviderHealth => health !== null);
  }

  /**
   * Proactively check health of providers by making lightweight requests
   * Call this on application startup to detect issues early
   * @param providers - Specific providers to check (defaults to all available)
   * @param options - Configuration options
   * @returns Map of provider names to their health status
   */
  async warmup(
    providers?: ProviderName[],
    options?: {
      /** Timeout per provider in ms (default: 10000) */
      timeout?: number;
      /** Continue checking other providers on error (default: true) */
      continueOnError?: boolean;
      /** Callback for each provider result */
      onProviderChecked?: (name: ProviderName, health: ProviderHealth) => void;
    }
  ): Promise<Map<ProviderName, ProviderHealth>> {
    const healthMap = new Map<ProviderName, ProviderHealth>();
    const targets = providers ?? this.getAvailableProviders();
    const timeout = options?.timeout ?? 10000;
    const continueOnError = options?.continueOnError ?? true;

    const checkProvider = async (name: ProviderName): Promise<void> => {
      const start = Date.now();

      try {
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          // Try to get provider and list models (lightweight check)
          const provider = this.getProvider(name);
          await provider.listModels();

          clearTimeout(timeoutId);
          this.recordSuccess(name, Date.now() - start);
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        this.recordFailure(name, error as Error);

        if (!continueOnError) {
          throw error;
        }
      }

      const health = this.getProviderHealth(name);
      if (health) {
        healthMap.set(name, health);
        options?.onProviderChecked?.(name, health);
      }
    };

    // Check all providers in parallel
    await Promise.allSettled(targets.map(checkProvider));

    return healthMap;
  }

  /**
   * Reset circuit breaker for a provider
   */
  resetCircuitBreaker(name: ProviderName): void {
    const breaker = this.circuitBreakers.get(name);
    breaker?.reset();
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Reset metrics for a provider
   */
  resetMetrics(name: ProviderName): void {
    const existing = this.metrics.get(name);
    this.metrics.set(name, {
      requests: 0,
      successes: 0,
      failures: 0,
      latencyWindow: [],
      windowSize: existing?.windowSize ?? 100,
      windowTtl: existing?.windowTtl ?? 300000,
    });
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    for (const name of this.metrics.keys()) {
      this.resetMetrics(name);
    }
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(name: ProviderName): boolean {
    return this.providerClasses.has(name);
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): ProviderName[] {
    return Array.from(this.providerClasses.keys());
  }

  /**
   * Get available healthy providers
   */
  getHealthyProviders(): ProviderName[] {
    return this.getAvailableProviders().filter(name => {
      const health = this.getProviderHealth(name);
      return health && health.status !== 'unhealthy' && health.circuitState !== 'open';
    });
  }

  /**
   * List models from all providers
   * Uses centralized model registry with fallback to provider API
   */
  async listAllModels(): Promise<ModelInfo[]> {
    // Prefer model registry (instant, no API calls)
    const registry = getModelRegistry();
    const registryModels = registry.getAllModels();

    if (registryModels.length > 0) {
      return registryModels;
    }

    // Fallback to provider APIs
    const allModels: ModelInfo[] = [];
    const errors: Array<{ provider: ProviderName; error: Error }> = [];

    for (const name of this.providerClasses.keys()) {
      try {
        const provider = this.getProvider(name);
        const models = await provider.listModels();
        allModels.push(...models);
      } catch (error) {
        errors.push({ provider: name, error: error as Error });
      }
    }

    // Log errors in debug mode
    if (this.configManager.isDebugEnabled() && errors.length > 0) {
      console.warn('Failed to list models from some providers:', errors);
    }

    return allModels;
  }

  /**
   * List models from a specific provider
   * Uses centralized model registry with fallback to provider API
   */
  async listModels(name: ProviderName): Promise<ModelInfo[]> {
    // Prefer model registry
    const registry = getModelRegistry();
    const registryModels = registry.getModelsForProvider(name);

    if (registryModels.length > 0) {
      return registryModels;
    }

    // Fallback to provider API
    const provider = this.getProvider(name);
    return provider.listModels();
  }

  /**
   * Clear cached provider instances
   */
  clearCache(): void {
    this.providers.clear();
  }

  /**
   * Remove a specific provider from cache
   */
  removeFromCache(name: ProviderName): void {
    this.providers.delete(name);
  }

  /**
   * Update provider configuration (clears cache for that provider)
   */
  updateProviderConfig(name: ProviderName, config: Partial<ProviderConfig>): void {
    this.configManager.setProviderConfig(name, config);
    this.providers.delete(name);
  }

  /**
   * Check if a provider supports a feature
   */
  supportsFeature(
    name: ProviderName,
    feature: 'streaming' | 'embeddings' | 'vision' | 'tools'
  ): boolean {
    // Check model registry first
    const registry = getModelRegistry();
    const models = registry.getChatModels(name);

    if (models.length > 0) {
      switch (feature) {
        case 'streaming':
          return models.some((m: ExtendedModelInfo) => m.supports_streaming);
        case 'embeddings':
          return registry.getEmbeddingModels(name).length > 0;
        case 'vision':
          return models.some((m: ExtendedModelInfo) => m.supports_vision);
        case 'tools':
          return models.some((m: ExtendedModelInfo) => m.supports_tools);
      }
    }

    // Fallback to provider
    const provider = this.getProvider(name);
    return provider.supports(feature);
  }

  /**
   * Get provider metrics
   */
  getMetrics(name: ProviderName): ProviderMetrics | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all provider metrics
   */
  getAllMetrics(): Map<ProviderName, ProviderMetrics> {
    return new Map(this.metrics);
  }
}
