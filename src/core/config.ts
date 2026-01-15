/**
 * Configuration management for Sutraworks Client AI SDK v2.0
 * @module core/config
 */

import type {
  SutraConfig,
  ProviderConfig,
  ProviderName,
  KeyStorageOptions,
  CacheOptions,
  RateLimitConfig,
} from '../types';

/** Default provider configurations - Updated for 2024/2025 models */
export const DEFAULT_PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openai: {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    timeout: 60000,
    maxRetries: 3,
  },
  anthropic: {
    name: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-5-20250915',
    timeout: 60000,
    maxRetries: 3,
  },
  google: {
    name: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3-flash',
    timeout: 60000,
    maxRetries: 3,
  },
  ollama: {
    name: 'ollama',
    baseUrl: 'http://localhost:11434/api',
    defaultModel: 'llama3.2',
    timeout: 120000,
    maxRetries: 2,
  },
  mistral: {
    name: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-3',
    timeout: 60000,
    maxRetries: 3,
  },
  groq: {
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    timeout: 30000,
    maxRetries: 3,
  },
  cohere: {
    name: 'cohere',
    baseUrl: 'https://api.cohere.ai/v1',
    defaultModel: 'command-a',
    timeout: 60000,
    maxRetries: 3,
  },
  together: {
    name: 'together',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    timeout: 60000,
    maxRetries: 3,
  },
  fireworks: {
    name: 'fireworks',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    timeout: 60000,
    maxRetries: 3,
  },
  perplexity: {
    name: 'perplexity',
    baseUrl: 'https://api.perplexity.ai',
    defaultModel: 'llama-3.1-sonar-large-128k-online',
    timeout: 60000,
    maxRetries: 3,
  },
  deepseek: {
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v3-2',
    timeout: 60000,
    maxRetries: 3,
  },
  xai: {
    name: 'xai',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-4-1',
    timeout: 60000,
    maxRetries: 3,
  },
};

/** Default key storage options */
export const DEFAULT_KEY_STORAGE: KeyStorageOptions = {
  type: 'memory',
  encrypt: false,
  prefix: 'sutra_key_',
};

/** Default cache options */
export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  enabled: false,
  ttl: 3600000, // 1 hour
  maxEntries: 100,
  maxSize: 50 * 1024 * 1024, // 50MB
  storage: 'memory',
};

/** Default rate limit config */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  tokensPerMinute: 100000,
  concurrentRequests: 10,
  strategy: 'sliding-window',
};

/**
 * Configuration manager for the SDK v2.0
 * Manages provider configs, caching, rate limiting, and key storage
 */
export class ConfigManager {
  private config: Required<SutraConfig>;

  constructor(userConfig?: SutraConfig) {
    this.config = this.mergeConfigs(userConfig);
  }

  /**
   * Merge user config with defaults
   * Validates all configuration values
   */
  private mergeConfigs(userConfig?: SutraConfig): Required<SutraConfig> {
    const providers: Record<string, ProviderConfig> = { ...DEFAULT_PROVIDER_CONFIGS };

    // Merge and validate user provider configs
    if (userConfig?.providers) {
      for (const [name, config] of Object.entries(userConfig.providers)) {
        if (config) {
          const mergedConfig: ProviderConfig = {
            ...DEFAULT_PROVIDER_CONFIGS[name],
            ...config,
            name: name as ProviderName,
          };
          this.validateProviderConfig(name, mergedConfig);
          providers[name] = mergedConfig;
        }
      }
    }

    // Validate global config values
    if (userConfig?.defaultTimeout !== undefined) {
      this.validatePositiveNumber('defaultTimeout', userConfig.defaultTimeout);
    }
    if (userConfig?.defaultMaxRetries !== undefined) {
      this.validateNonNegativeInteger('defaultMaxRetries', userConfig.defaultMaxRetries);
    }
    if (userConfig?.defaultBatchConcurrency !== undefined) {
      this.validatePositiveNumber('defaultBatchConcurrency', userConfig.defaultBatchConcurrency);
    }

    // Validate cache options
    if (userConfig?.cache) {
      if (userConfig.cache.ttl !== undefined) {
        this.validatePositiveNumber('cache.ttl', userConfig.cache.ttl);
      }
      if (userConfig.cache.maxEntries !== undefined) {
        this.validatePositiveNumber('cache.maxEntries', userConfig.cache.maxEntries);
      }
      if (userConfig.cache.maxSize !== undefined) {
        this.validatePositiveNumber('cache.maxSize', userConfig.cache.maxSize);
      }
    }

    return {
      providers,
      keyStorage: {
        ...DEFAULT_KEY_STORAGE,
        ...userConfig?.keyStorage,
      },
      cache: {
        ...DEFAULT_CACHE_OPTIONS,
        ...userConfig?.cache,
      },
      rateLimit: userConfig?.rateLimit ?? DEFAULT_RATE_LIMIT,
      defaultTimeout: userConfig?.defaultTimeout ?? 60000,
      defaultMaxRetries: userConfig?.defaultMaxRetries ?? 3,
      debug: userConfig?.debug ?? false,
      deduplicateRequests: userConfig?.deduplicateRequests ?? true,
      middleware: userConfig?.middleware ?? [],
      validateModels: userConfig?.validateModels ?? false,
      defaultBatchConcurrency: userConfig?.defaultBatchConcurrency ?? 5,
    };
  }

  /**
   * Validate provider configuration
   * @throws Error if configuration is invalid
   */
  private validateProviderConfig(name: string, config: ProviderConfig): void {
    if (config.timeout !== undefined) {
      this.validatePositiveNumber(`${name}.timeout`, config.timeout);
    }
    if (config.maxRetries !== undefined) {
      this.validateNonNegativeInteger(`${name}.maxRetries`, config.maxRetries);
    }
    if (config.baseUrl !== undefined) {
      this.validateUrl(`${name}.baseUrl`, config.baseUrl);
    }
  }

  /**
   * Validate that a value is a positive number
   * @throws Error if validation fails
   */
  private validatePositiveNumber(field: string, value: unknown): void {
    if (typeof value !== 'number' || isNaN(value) || value <= 0) {
      throw new Error(
        `Invalid configuration: ${field} must be a positive number, got ${value}`
      );
    }
  }

  /**
   * Validate that a value is a non-negative integer
   * @throws Error if validation fails
   */
  private validateNonNegativeInteger(field: string, value: unknown): void {
    if (typeof value !== 'number' || isNaN(value) || value < 0 || !Number.isInteger(value)) {
      throw new Error(
        `Invalid configuration: ${field} must be a non-negative integer, got ${value}`
      );
    }
  }

  /**
   * Validate that a value is a valid URL
   * @throws Error if validation fails
   */
  private validateUrl(field: string, value: string): void {
    try {
      new URL(value);
    } catch {
      throw new Error(
        `Invalid configuration: ${field} must be a valid URL, got ${value}`
      );
    }
  }

  /**
   * Get full configuration
   */
  getConfig(): Required<SutraConfig> {
    return { ...this.config };
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider: ProviderName): ProviderConfig {
    const config = this.config.providers[provider];
    if (config) {
      return { ...config };
    }

    // Return default config for unknown providers
    return {
      name: provider,
      timeout: this.config.defaultTimeout,
      maxRetries: this.config.defaultMaxRetries,
    };
  }

  /**
   * Update provider configuration
   */
  setProviderConfig(provider: ProviderName, config: Partial<ProviderConfig>): void {
    this.config.providers[provider] = {
      ...this.getProviderConfig(provider),
      ...config,
      name: provider,
    };
  }

  /**
   * Get key storage options
   */
  getKeyStorageOptions(): KeyStorageOptions {
    return { ...this.config.keyStorage };
  }

  /**
   * Update key storage options
   */
  setKeyStorageOptions(options: Partial<KeyStorageOptions>): void {
    this.config.keyStorage = {
      ...this.config.keyStorage,
      ...options,
    };
  }

  /**
   * Get cache options
   */
  getCacheOptions(): CacheOptions {
    return { ...this.config.cache };
  }

  /**
   * Update cache options
   */
  setCacheOptions(options: Partial<CacheOptions>): void {
    this.config.cache = {
      ...this.config.cache,
      ...options,
    };
  }

  /**
   * Get rate limit config
   */
  getRateLimitConfig(): RateLimitConfig | undefined {
    return this.config.rateLimit ? { ...this.config.rateLimit } : undefined;
  }

  /**
   * Update rate limit config
   */
  setRateLimitConfig(config: Partial<RateLimitConfig>): void {
    this.config.rateLimit = {
      ...DEFAULT_RATE_LIMIT,
      ...this.config.rateLimit,
      ...config,
    };
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.config.debug;
  }

  /**
   * Enable or disable debug mode
   */
  setDebug(enabled: boolean): void {
    this.config.debug = enabled;
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): ProviderName[] {
    return Object.keys(this.config.providers) as ProviderName[];
  }

  /**
   * Check if request deduplication is enabled
   */
  isDeduplicationEnabled(): boolean {
    return this.config.deduplicateRequests;
  }

  /**
   * Enable or disable request deduplication
   */
  setDeduplication(enabled: boolean): void {
    this.config.deduplicateRequests = enabled;
  }

  /**
   * Get middleware array
   */
  getMiddleware() {
    return [...this.config.middleware];
  }
}
