/**
 * Tests for model registry
 * @module core/models.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getModelRegistry,
  ModelRegistry,
} from './models';
import type { ProviderName } from '../types';

describe('ModelRegistry', () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    registry = getModelRegistry();
  });

  describe('getAllModels', () => {
    it('should return all models', () => {
      const models = registry.getAllModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(50);
    });

    it('should include models from all providers', () => {
      const models = registry.getAllModels();
      const providers = new Set(models.map(m => m.provider));
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('anthropic')).toBe(true);
      expect(providers.has('google')).toBe(true);
    });
  });

  describe('getModelsForProvider', () => {
    it('should return models for OpenAI', () => {
      const models = registry.getModelsForProvider('openai');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === 'openai')).toBe(true);
    });

    it('should return models for Anthropic', () => {
      const models = registry.getModelsForProvider('anthropic');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === 'anthropic')).toBe(true);
    });

    it('should return models for Google', () => {
      const models = registry.getModelsForProvider('google');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === 'google')).toBe(true);
    });

    it('should return empty array for unknown provider', () => {
      const models = registry.getModelsForProvider('unknown' as ProviderName);
      expect(models).toEqual([]);
    });
  });

  describe('getModel', () => {
    it('should get model by provider and ID', () => {
      const model = registry.getModel('openai', 'gpt-4');
      expect(model).toBeDefined();
      expect(model?.id).toBe('gpt-4');
      expect(model?.provider).toBe('openai');
    });

    it('should return undefined for unknown model', () => {
      const model = registry.getModel('openai', 'unknown-model-xyz');
      expect(model).toBeUndefined();
    });
  });

  describe('getChatModels', () => {
    it('should return only chat models', () => {
      const models = registry.getChatModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.type === 'chat')).toBe(true);
    });

    it('should filter by provider', () => {
      const models = registry.getChatModels('anthropic');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === 'anthropic')).toBe(true);
    });
  });

  describe('getEmbeddingModels', () => {
    it('should return only embedding models', () => {
      const models = registry.getEmbeddingModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.type === 'embedding')).toBe(true);
    });

    it('should filter by provider', () => {
      const models = registry.getEmbeddingModels('openai');
      expect(models.every(m => m.provider === 'openai')).toBe(true);
    });
  });

  describe('getContextWindow', () => {
    it('should return context window for known model', () => {
      const contextWindow = registry.getContextWindow('openai', 'gpt-4');
      expect(contextWindow).toBe(8192);
    });

    it('should return context window for GPT-4o', () => {
      const contextWindow = registry.getContextWindow('openai', 'gpt-4o');
      expect(contextWindow).toBe(128000);
    });

    it('should return undefined for unknown model', () => {
      const contextWindow = registry.getContextWindow('openai', 'unknown-model');
      expect(contextWindow).toBeUndefined();
    });
  });

  describe('getModelPricing', () => {
    it('should return pricing for known model', () => {
      const pricing = registry.getModelPricing('openai', 'gpt-4');
      expect(pricing).toBeDefined();
      expect(pricing?.input).toBeGreaterThan(0);
      expect(pricing?.output).toBeGreaterThan(0);
    });

    it('should return undefined for unknown model', () => {
      const pricing = registry.getModelPricing('openai', 'unknown-model');
      expect(pricing).toBeUndefined();
    });
  });

  describe('getModelsWithFeature', () => {
    it('should find vision-capable models', () => {
      const models = registry.getModelsWithFeature('vision');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.supports_vision)).toBe(true);
    });

    it('should find tool-capable models', () => {
      const models = registry.getModelsWithFeature('tools');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.supports_tools)).toBe(true);
    });

    it('should find streaming-capable models', () => {
      const models = registry.getModelsWithFeature('streaming');
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.supports_streaming)).toBe(true);
    });

    it('should filter by provider', () => {
      const models = registry.getModelsWithFeature('vision', 'openai');
      expect(models.every(m => m.provider === 'openai')).toBe(true);
    });
  });

  describe('getActiveModels', () => {
    it('should return non-deprecated models', () => {
      const models = registry.getActiveModels();
      expect(models.length).toBeGreaterThan(0);
      // Active models should not be deprecated
      expect(models.every(m => !m.deprecated)).toBe(true);
    });

    it('should filter by provider', () => {
      const models = registry.getActiveModels('anthropic');
      expect(models.every(m => m.provider === 'anthropic')).toBe(true);
    });
  });

  describe('getProviders', () => {
    it('should return list of supported providers', () => {
      const providers = registry.getProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('google');
    });
  });

  describe('getLastUpdated', () => {
    it('should return timestamp', () => {
      const timestamp = registry.getLastUpdated();
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });
  });

  describe('findModel', () => {
    it('should find model by requirements', () => {
      const model = registry.findModel({
        provider: 'openai',
        minContextWindow: 100000,
      });
      expect(model).toBeDefined();
      expect(model?.context_window).toBeGreaterThanOrEqual(100000);
    });

    it('should find model with vision support', () => {
      const model = registry.findModel({
        provider: 'openai',
        requireVision: true,
      });
      expect(model).toBeDefined();
      expect(model?.supports_vision).toBe(true);
    });

    it('should find model with tools support', () => {
      const model = registry.findModel({
        provider: 'anthropic',
        requireTools: true,
      });
      expect(model).toBeDefined();
      expect(model?.supports_tools).toBe(true);
    });

    it('should return null for impossible requirements', () => {
      const model = registry.findModel({
        provider: 'openai',
        minContextWindow: 10000000, // Unrealistically large
      });
      expect(model).toBeNull();
    });
  });
});

describe('getModelRegistry', () => {
  it('should return singleton instance', () => {
    const registry1 = getModelRegistry();
    const registry2 = getModelRegistry();
    expect(registry1).toBe(registry2);
  });

  it('should be instance of ModelRegistry', () => {
    const registry = getModelRegistry();
    expect(registry).toBeInstanceOf(ModelRegistry);
  });
});
