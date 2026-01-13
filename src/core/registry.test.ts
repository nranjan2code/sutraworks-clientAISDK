/**
 * Tests for provider registry
 * @module core/registry.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderRegistry } from './registry';
import { ConfigManager } from './config';
import { EventEmitter } from '../utils/events';
import { BaseProvider } from '../providers/base';
import type { ProviderConfig, ChatRequest, ChatResponse, ChatStreamDelta, ModelInfo, ProviderName } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

const TEST_API_KEY = 'test-api-key-12345';

// Mock provider class for testing custom providers
class MockProvider extends BaseProvider {
  get name(): ProviderName {
    return 'openai' as ProviderName; // Use a valid provider name for testing
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    return {
      id: 'mock-id',
      object: 'chat.completion',
      created: Date.now(),
      model: request.model,
      provider: this.name,
      choices: [{
        message: { role: 'assistant', content: 'Mock response' },
        finish_reason: 'stop',
        index: 0,
      }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatStreamDelta> {
    yield {
      id: 'mock-id',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: request.model,
      provider: this.name,
      choices: [{
        index: 0,
        delta: { role: 'assistant', content: 'Mock response' },
        finish_reason: 'stop',
      }],
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [{ id: 'mock-model', name: 'Mock Model', provider: 'openai' as ProviderName, type: 'chat' }];
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    return feature === 'streaming';
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  let configManager: ConfigManager;
  let events: EventEmitter;
  let mockGetApiKey: (provider: ProviderName) => Promise<string>;

  beforeEach(() => {
    configManager = new ConfigManager();
    events = new EventEmitter();
    mockGetApiKey = vi.fn().mockResolvedValue(TEST_API_KEY);
    registry = new ProviderRegistry(configManager, events, mockGetApiKey);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('built-in providers', () => {
    it('should register all built-in providers', () => {
      const providers = registry.getAvailableProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('google');
      expect(providers).toContain('ollama');
      expect(providers).toContain('mistral');
      expect(providers).toContain('groq');
      expect(providers).toContain('cohere');
      expect(providers).toContain('together');
      expect(providers).toContain('fireworks');
      expect(providers).toContain('perplexity');
    });

    it('should check if provider exists', () => {
      expect(registry.hasProvider('openai')).toBe(true);
      expect(registry.hasProvider('anthropic')).toBe(true);
      expect(registry.hasProvider('unknown' as any)).toBe(false);
    });
  });

  describe('provider retrieval', () => {
    it('should get provider instance', () => {
      const provider = registry.getProvider('openai');
      expect(provider).toBeDefined();
    });

    it('should cache provider instances', () => {
      const provider1 = registry.getProvider('openai');
      const provider2 = registry.getProvider('openai');
      expect(provider1).toBe(provider2);
    });

    it('should throw for unregistered provider', () => {
      expect(() => registry.getProvider('nonexistent' as any))
        .toThrow('Provider "nonexistent" not found');
    });
  });

  describe('custom provider registration', () => {
    it('should register custom provider via registerProvider', () => {
      registry.registerProvider('custom' as any, MockProvider);
      expect(registry.hasProvider('custom' as any)).toBe(true);
    });

    it('should get custom provider instance', () => {
      registry.registerProvider('custom' as any, MockProvider);
      const provider = registry.getProvider('custom' as any);
      expect(provider).toBeInstanceOf(MockProvider);
    });

    it('should register plugin with metadata', () => {
      registry.registerPlugin({
        name: 'plugin' as any,
        provider: MockProvider,
        description: 'Test plugin',
        version: '1.0.0',
      });
      expect(registry.hasProvider('plugin' as any)).toBe(true);
    });

    it('should register plugin with default config', () => {
      registry.registerPlugin({
        name: 'configured' as any,
        provider: MockProvider,
        defaultConfig: { baseUrl: 'https://custom.api.com' },
      });
      expect(registry.hasProvider('configured' as any)).toBe(true);
    });
  });

  describe('unregister provider', () => {
    it('should unregister custom provider', () => {
      registry.registerProvider('custom' as any, MockProvider);
      expect(registry.hasProvider('custom' as any)).toBe(true);

      const removed = registry.unregisterProvider('custom' as any);
      expect(removed).toBe(true);
      expect(registry.hasProvider('custom' as any)).toBe(false);
    });

    it('should not unregister built-in providers', () => {
      const removed = registry.unregisterProvider('openai');
      expect(removed).toBe(false);
      expect(registry.hasProvider('openai')).toBe(true);
    });
  });

  describe('provider health', () => {
    it('should get provider health status', () => {
      const health = registry.getProviderHealth('openai');
      expect(health).toMatchObject({
        name: 'openai',
        status: expect.stringMatching(/healthy|degraded|unhealthy/),
        circuitState: expect.stringMatching(/closed|open|half-open/),
        successRate: expect.any(Number),
        averageLatency: expect.any(Number),
      });
    });

    it('should return null for unknown provider', () => {
      const health = registry.getProviderHealth('unknown' as any);
      expect(health).toBeNull();
    });

    it('should get all provider health', () => {
      const healthList = registry.getAllProviderHealth();
      expect(Array.isArray(healthList)).toBe(true);
      expect(healthList.length).toBe(10); // 10 built-in providers
    });

    it('should get healthy providers', () => {
      const healthy = registry.getHealthyProviders();
      expect(Array.isArray(healthy)).toBe(true);
      // Initially all should be healthy
      expect(healthy.length).toBe(registry.getAvailableProviders().length);
    });
  });

  describe('metrics tracking', () => {
    it('should record success', () => {
      registry.recordSuccess('openai', 100);
      const metrics = registry.getMetrics('openai');
      expect(metrics?.successes).toBeGreaterThan(0);
      expect(metrics?.latencyWindow.length).toBeGreaterThan(0);
    });

    it('should record failure', () => {
      registry.recordFailure('openai', new Error('Test error'));
      const metrics = registry.getMetrics('openai');
      expect(metrics?.failures).toBeGreaterThan(0);
      expect(metrics?.lastError).toBe('Test error');
    });

    it('should get provider metrics', () => {
      const metrics = registry.getMetrics('openai');
      expect(metrics).toMatchObject({
        requests: expect.any(Number),
        successes: expect.any(Number),
        failures: expect.any(Number),
        latencyWindow: expect.any(Array),
        windowSize: expect.any(Number),
        windowTtl: expect.any(Number),
      });
    });

    it('should reset metrics for single provider', () => {
      registry.recordSuccess('openai', 100);
      registry.resetMetrics('openai');
      const metrics = registry.getMetrics('openai');
      expect(metrics?.successes).toBe(0);
      expect(metrics?.latencyWindow.length).toBe(0);
    });

    it('should reset all metrics', () => {
      registry.recordSuccess('openai', 100);
      registry.recordSuccess('anthropic', 150);
      registry.resetAllMetrics();
      expect(registry.getMetrics('openai')?.successes).toBe(0);
      expect(registry.getMetrics('anthropic')?.successes).toBe(0);
    });

    it('should get all metrics as Map', () => {
      const allMetrics = registry.getAllMetrics();
      expect(allMetrics).toBeInstanceOf(Map);
      expect(allMetrics.size).toBe(10); // 10 built-in providers
    });
  });

  describe('circuit breaker', () => {
    it('should reset circuit breaker for provider', () => {
      registry.recordFailure('openai', new Error('Test'));
      registry.resetCircuitBreaker('openai');
      const health = registry.getProviderHealth('openai');
      expect(health?.circuitState).toBe('closed');
    });

    it('should reset all circuit breakers', () => {
      registry.recordFailure('openai', new Error('Test'));
      registry.recordFailure('anthropic', new Error('Test'));
      registry.resetAllCircuitBreakers();
      expect(registry.getProviderHealth('openai')?.circuitState).toBe('closed');
      expect(registry.getProviderHealth('anthropic')?.circuitState).toBe('closed');
    });

    it('should execute with circuit breaker protection', async () => {
      const result = await registry.executeWithCircuitBreaker('openai', async () => 'success');
      expect(result).toBe('success');
    });

    it('should track metrics during execution', async () => {
      await registry.executeWithCircuitBreaker('openai', async () => 'success');
      const metrics = registry.getMetrics('openai');
      expect(metrics?.requests).toBeGreaterThan(0);
      expect(metrics?.successes).toBeGreaterThan(0);
    });

    it('should handle failure during execution', async () => {
      await expect(
        registry.executeWithCircuitBreaker('openai', async () => {
          throw new Error('Test failure');
        })
      ).rejects.toThrow('Test failure');

      const metrics = registry.getMetrics('openai');
      expect(metrics?.failures).toBeGreaterThan(0);
    });

    it('should work with circuit breaker disabled', async () => {
      const noCircuitRegistry = new ProviderRegistry(
        configManager,
        events,
        mockGetApiKey,
        { useCircuitBreaker: false }
      );

      const result = await noCircuitRegistry.executeWithCircuitBreaker(
        'openai',
        async () => 'success'
      );
      expect(result).toBe('success');
    });
  });

  describe('cache management', () => {
    it('should clear provider cache', () => {
      // Get provider to cache it
      registry.getProvider('openai');
      // Clear cache
      registry.clearCache();
      // Getting again should create new instance
      const provider2 = registry.getProvider('openai');
      expect(provider2).toBeDefined();
    });

    it('should remove specific provider from cache', () => {
      registry.getProvider('openai');
      registry.removeFromCache('openai');
      // Should not throw
      expect(() => registry.getProvider('openai')).not.toThrow();
    });

    it('should update provider config and clear cache', () => {
      registry.getProvider('openai');
      registry.updateProviderConfig('openai', { baseUrl: 'https://custom.openai.com' });
      // Should create new instance with updated config
      expect(() => registry.getProvider('openai')).not.toThrow();
    });
  });

  describe('feature support', () => {
    it('should check streaming support', () => {
      const supports = registry.supportsFeature('openai', 'streaming');
      expect(typeof supports).toBe('boolean');
    });

    it('should check embeddings support', () => {
      const supports = registry.supportsFeature('openai', 'embeddings');
      expect(typeof supports).toBe('boolean');
    });

    it('should check vision support', () => {
      const supports = registry.supportsFeature('openai', 'vision');
      expect(typeof supports).toBe('boolean');
    });

    it('should check tools support', () => {
      const supports = registry.supportsFeature('openai', 'tools');
      expect(typeof supports).toBe('boolean');
    });
  });

  describe('model listing', () => {
    it('should list models for provider from registry', async () => {
      const models = await registry.listModels('openai');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('id');
    });

    it('should list all models from registry', async () => {
      const models = await registry.listAllModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
