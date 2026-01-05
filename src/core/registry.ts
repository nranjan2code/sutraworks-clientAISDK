/**
 * Provider registry for managing AI provider instances
 * @module core/registry
 */

import type { ProviderName, ProviderConfig, ModelInfo } from '../types';
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

/**
 * Provider constructor type
 */
type ProviderConstructor = new (
  config: ProviderConfig,
  events: EventEmitter,
  getApiKey: () => Promise<string>
) => BaseProvider;

/**
 * Registry for managing provider instances
 */
export class ProviderRegistry {
  private providers: Map<ProviderName, BaseProvider> = new Map();
  private providerClasses: Map<ProviderName, ProviderConstructor> = new Map();
  private configManager: ConfigManager;
  private events: EventEmitter;
  private getApiKey: (provider: ProviderName) => Promise<string>;

  constructor(
    configManager: ConfigManager,
    events: EventEmitter,
    getApiKey: (provider: ProviderName) => Promise<string>
  ) {
    this.configManager = configManager;
    this.events = events;
    this.getApiKey = getApiKey;

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
  }

  /**
   * Register a custom provider class
   */
  registerProvider(name: ProviderName, providerClass: ProviderConstructor): void {
    this.providerClasses.set(name, providerClass);
    // Clear cached instance if exists
    this.providers.delete(name);
  }

  /**
   * Get a provider instance (creates on demand)
   */
  getProvider(name: ProviderName): BaseProvider {
    // Return cached instance if available
    let provider = this.providers.get(name);
    if (provider) {
      return provider;
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

    // Get config
    const config = this.configManager.getProviderConfig(name);

    // Create and cache instance
    provider = new ProviderClass(config, this.events, () => this.getApiKey(name));
    this.providers.set(name, provider);

    return provider;
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
   * List models from all providers
   */
  async listAllModels(): Promise<ModelInfo[]> {
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
   */
  async listModels(name: ProviderName): Promise<ModelInfo[]> {
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
    const provider = this.getProvider(name);
    return provider.supports(feature);
  }
}
