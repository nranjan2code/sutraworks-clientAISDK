import type { ExtendedModelInfo, ProviderName, ModelPricing } from '../types';
import { MODEL_REGISTRY } from './models/index';

export { MODEL_REGISTRY };
export * from './models/index';

/**
 * Model Registry class for managing model information
 */
/**
 * Model Registry class for managing model information
 */
export class ModelRegistry {
  private readonly models: Map<string, ExtendedModelInfo> = new Map();
  private readonly providerModels: Map<ProviderName, ExtendedModelInfo[]> = new Map();
  private readonly lastUpdated: number;

  constructor() {
    this.lastUpdated = Date.now();
    this.loadBuiltinModels();
  }

  /**
   * Load built-in model definitions
   */
  private loadBuiltinModels(): void {
    for (const [provider, models] of Object.entries(MODEL_REGISTRY)) {
      const providerName = provider as ProviderName;
      this.providerModels.set(providerName, [...models]);

      for (const model of models) {
        const key = `${provider}:${model.id}`;
        this.models.set(key, model);

        // Also index by aliases
        if (model.aliases) {
          for (const alias of model.aliases) {
            this.models.set(`${provider}:${alias}`, model);
          }
        }
      }
    }
  }

  /**
   * Get model information by provider and model ID
   */
  getModel(provider: ProviderName, modelId: string): ExtendedModelInfo | undefined {
    return this.models.get(`${provider}:${modelId}`);
  }

  /**
   * Get all models for a provider
   */
  getModelsForProvider(provider: ProviderName): ExtendedModelInfo[] {
    return this.providerModels.get(provider) ?? [];
  }

  /**
   * Get all models across all providers
   */
  getAllModels(): ExtendedModelInfo[] {
    const allModels: ExtendedModelInfo[] = [];
    for (const models of this.providerModels.values()) {
      allModels.push(...models);
    }
    return allModels;
  }

  /**
   * Get list of all supported providers
   */
  getProviders(): ProviderName[] {
    return Array.from(this.providerModels.keys());
  }

  /**
   * Get timestamp when registry was last updated
   */
  getLastUpdated(): number {
    return this.lastUpdated;
  }

  /**
   * Find a model matching specific requirements
   * @param requirements - Model requirements to match
   * @returns Matching model or null if none found
   */
  findModel(requirements: {
    provider?: ProviderName;
    type?: 'chat' | 'embedding';
    minContextWindow?: number;
    maxContextWindow?: number;
    supportsVision?: boolean;
    supportsTools?: boolean;
    supportsStreaming?: boolean;
    supportsJsonMode?: boolean;
    supportsReasoning?: boolean;
    deprecated?: boolean;
  }): ExtendedModelInfo | null {
    const models = requirements.provider
      ? this.getModelsForProvider(requirements.provider)
      : this.getAllModels();

    for (const model of models) {
      // Check type
      if (requirements.type && model.type !== requirements.type) {
        continue;
      }

      // Check context window
      if (requirements.minContextWindow && (!model.context_window || model.context_window < requirements.minContextWindow)) {
        continue;
      }
      if (requirements.maxContextWindow && model.context_window && model.context_window > requirements.maxContextWindow) {
        continue;
      }

      // Check feature support
      if (requirements.supportsVision && !model.supports_vision) {
        continue;
      }
      if (requirements.supportsTools && !model.supports_tools) {
        continue;
      }
      if (requirements.supportsStreaming && !model.supports_streaming) {
        continue;
      }
      if (requirements.supportsJsonMode && !model.supports_json_mode) {
        continue;
      }
      if (requirements.supportsReasoning && !model.supports_reasoning) {
        continue;
      }

      // Check deprecation status
      if (requirements.deprecated === false && model.deprecated) {
        continue;
      }
      if (requirements.deprecated === true && !model.deprecated) {
        continue;
      }

      return model;
    }

    return null;
  }

  /**
   * Get chat models only
   */
  getChatModels(provider?: ProviderName): ExtendedModelInfo[] {
    const models = provider ? this.getModelsForProvider(provider) : this.getAllModels();
    return models.filter((m) => m.type === 'chat');
  }

  /**
   * Get embedding models only
   */
  getEmbeddingModels(provider?: ProviderName): ExtendedModelInfo[] {
    const models = provider ? this.getModelsForProvider(provider) : this.getAllModels();
    return models.filter((m) => m.type === 'embedding');
  }

  /**
   * Get models supporting a specific feature
   */
  getModelsWithFeature(
    feature: 'vision' | 'tools' | 'streaming' | 'json_mode' | 'reasoning',
    provider?: ProviderName
  ): ExtendedModelInfo[] {
    const models = provider ? this.getModelsForProvider(provider) : this.getAllModels();
    return models.filter((m) => {
      switch (feature) {
        case 'vision':
          return m.supports_vision;
        case 'tools':
          return m.supports_tools;
        case 'streaming':
          return m.supports_streaming;
        case 'json_mode':
          return m.supports_json_mode;
        case 'reasoning':
          return m.supports_reasoning;
        default:
          return false;
      }
    });
  }

  /**
   * Get non-deprecated models
   */
  getActiveModels(provider?: ProviderName): ExtendedModelInfo[] {
    const models = provider ? this.getModelsForProvider(provider) : this.getAllModels();
    return models.filter((m) => !m.deprecated);
  }

  /**
   * Check if a model exists
   */
  hasModel(provider: ProviderName, modelId: string): boolean {
    return this.models.has(`${provider}:${modelId}`);
  }

  /**
   * Get model pricing
   */
  getModelPricing(provider: ProviderName, modelId: string): ModelPricing | undefined {
    return this.getModel(provider, modelId)?.pricing;
  }

  /**
   * Get model context window
   */
  getContextWindow(provider: ProviderName, modelId: string): number | undefined {
    return this.getModel(provider, modelId)?.context_window;
  }

  /**
   * Register a custom model
   */
  registerModel(model: ExtendedModelInfo): void {
    const models = this.providerModels.get(model.provider) ?? [];
    models.push(model);
    this.providerModels.set(model.provider, models);
    this.models.set(`${model.provider}:${model.id}`, model);
  }
}

// Singleton instance
let modelRegistryInstance: ModelRegistry | null = null;

/**
 * Get the singleton model registry instance
 */
export function getModelRegistry(): ModelRegistry {
  if (!modelRegistryInstance) {
    modelRegistryInstance = new ModelRegistry();
  }
  return modelRegistryInstance;
}

/**
 * Reset the model registry (for testing)
 */
export function resetModelRegistry(): void {
  modelRegistryInstance = null;
}

export type { ExtendedModelInfo, ModelPricing };
