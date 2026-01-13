/**
 * Tests for Sutra AI SDK v2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SutraAI,
  SutraError,
  Encryption,
  MemoryCache,
  estimateTokens,
  estimateCost,
  generateCacheKey,
  MemoryStorage,
} from '../src/index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Valid test API keys that match provider format patterns
const TEST_KEY_OPENAI = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz';
const TEST_KEY_ANTHROPIC = 'sk-ant-test1234567890abcdefghijklmnopqrstuvwxyzabc';

describe('SutraAI Client', () => {
  let ai: SutraAI;

  beforeEach(() => {
    ai = new SutraAI({ cache: { enabled: false } });
    mockFetch.mockReset();
  });

  afterEach(async () => {
    // Cleanup
    await ai.destroy();
  });

  describe('Key Management', () => {
    it('should set and check API key', async () => {
      await ai.setKey('openai', TEST_KEY_OPENAI);
      expect(await ai.hasKey('openai')).toBe(true);
      expect(await ai.hasKey('anthropic')).toBe(false);
    });

    it('should set multiple keys', async () => {
      await ai.setKeys({
        openai: TEST_KEY_OPENAI,
        anthropic: TEST_KEY_ANTHROPIC,
      });
      expect(await ai.hasKey('openai')).toBe(true);
      expect(await ai.hasKey('anthropic')).toBe(true);
    });

    it('should remove key', async () => {
      await ai.setKey('openai', TEST_KEY_OPENAI);
      await ai.removeKey('openai');
      expect(await ai.hasKey('openai')).toBe(false);
    });

    it('should clear all keys', async () => {
      await ai.setKeys({
        openai: TEST_KEY_OPENAI,
        anthropic: TEST_KEY_ANTHROPIC,
      });
      await ai.clearKeys();
      expect(await ai.hasKey('openai')).toBe(false);
      expect(await ai.hasKey('anthropic')).toBe(false);
    });

    it('should reject keys that are too short', async () => {
      await expect(ai.setKey('openai', 'short')).rejects.toThrow(SutraError);
    });
  });

  describe('Chat Completion', () => {
    it('should make chat request to OpenAI', async () => {
      await ai.setKey('openai', TEST_KEY_OPENAI);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            created: 1677652288,
            model: 'gpt-4-turbo',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'Hello! How can I help you?',
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 8,
              total_tokens: 18,
            },
          }),
      });

      const response = await ai.chat({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.choices[0].message.content).toBe('Hello! How can I help you?');
      expect(response.provider).toBe('openai');
      expect(response.usage?.total_tokens).toBe(18);
    });

    it('should throw error without API key', async () => {
      await expect(
        ai.chat({
          provider: 'openai',
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow(SutraError);
    });
  });

  describe('Simple complete() method', () => {
    it('should complete prompt with shorthand', async () => {
      await ai.setKey('openai', TEST_KEY_OPENAI);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            created: 1677652288,
            model: 'gpt-4-turbo',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'The capital of France is Paris.',
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 7, total_tokens: 17 },
          }),
      });

      const result = await ai.complete('What is the capital of France?', {
        provider: 'openai',
        model: 'gpt-4-turbo',
      });

      expect(result).toBe('The capital of France is Paris.');
    });
  });

  describe('Provider Management', () => {
    it('should list available providers', () => {
      const providers = ai.getProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('ollama');
      // These providers are configured but may not all have provider implementations
      expect(providers.length).toBeGreaterThanOrEqual(10);
    });

    it('should check feature support', () => {
      expect(ai.supportsFeature('openai', 'streaming')).toBe(true);
      expect(ai.supportsFeature('openai', 'embeddings')).toBe(true);
    });
  });

  describe('Usage Statistics', () => {
    it('should track usage', async () => {
      await ai.setKey('openai', TEST_KEY_OPENAI);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            created: 1677652288,
            model: 'gpt-4-turbo',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hi!' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
          }),
      });

      await ai.chat({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      const stats = ai.getUsageStats();
      expect(stats.totalTokens).toBe(12);
      expect(stats.requests).toBe(1);
    });

    it('should reset usage stats', async () => {
      ai.resetUsageStats();
      const stats = ai.getUsageStats();
      expect(stats.totalTokens).toBe(0);
    });
  });

  describe('Cache', () => {
    it('should enable and disable caching', () => {
      ai.setCache(true, { ttl: 60000, maxEntries: 100 });
      const stats = ai.getCacheStats();
      expect(stats).not.toBeNull();
      ai.setCache(false);
      ai.clearCache();
    });
  });

  describe('Middleware', () => {
    it('should add and remove middleware', () => {
      ai.use({
        name: 'test-middleware',
        beforeRequest: async (req) => req,
      });

      const list = ai.listMiddleware();
      expect(list).toContain('test-middleware');

      const removed = ai.removeMiddleware('test-middleware');
      expect(removed).toBe(true);
    });
  });

  describe('Lifecycle', () => {
    it('should destroy client and prevent further use', async () => {
      const client = new SutraAI();
      await client.destroy();

      expect(client.isDestroyed()).toBe(true);
      await expect(client.setKey('openai', TEST_KEY_OPENAI)).rejects.toThrow('Client has been destroyed');
    });
  });
});

describe('SutraError', () => {
  it('should create error with code', () => {
    const error = new SutraError('Test error', 'KEY_NOT_SET');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('KEY_NOT_SET');
    expect(error.name).toBe('SutraError');
  });

  it('should create error with details', () => {
    const error = new SutraError('Not found', 'PROVIDER_NOT_FOUND', {
      provider: 'openai',
      details: { model: 'gpt-4' },
    });
    expect(error.provider).toBe('openai');
    expect(error.details).toEqual({ model: 'gpt-4' });
  });
});

describe('Encryption', () => {
  it('should check Web Crypto availability', () => {
    expect(typeof Encryption.isAvailable()).toBe('boolean');
  });
});

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>({ maxEntries: 3, ttl: 1000 });
  });

  it('should set and get values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should clear cache', () => {
    cache.set('key1', 'value1');
    cache.clear();
    expect(cache.get('key1')).toBeNull();
  });

  it('should evict old entries at capacity', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // Should evict key1
    expect(cache.size()).toBe(3);
  });
});

describe('Token Utilities', () => {
  it('should estimate tokens for text', () => {
    const tokens = estimateTokens('Hello, how are you today?');
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(20);
  });

  it('should estimate cost', () => {
    const cost = estimateCost(100, 200, 'gpt-4');
    expect(cost.total).toBeGreaterThan(0);
  });
});

describe('generateCacheKey', () => {
  it('should generate deterministic cache key', () => {
    const request1 = {
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };
    const request2 = { ...request1 };

    const key1 = generateCacheKey(request1);
    const key2 = generateCacheKey(request2);

    expect(key1).toBe(key2);
  });

  it('should generate different keys for different requests', () => {
    const request1 = {
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };
    const request2 = {
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user' as const, content: 'Goodbye' }],
    };

    const key1 = generateCacheKey(request1);
    const key2 = generateCacheKey(request2);

    expect(key1).not.toBe(key2);
  });
});

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('should store and retrieve keys', async () => {
    await storage.set('openai', 'sk-test-key');
    const key = await storage.get('openai');
    expect(key).toBe('sk-test-key');
  });

  it('should check key existence', async () => {
    await storage.set('openai', 'sk-test');
    expect(await storage.has('openai')).toBe(true);
    expect(await storage.has('anthropic')).toBe(false);
  });

  it('should remove keys', async () => {
    await storage.set('openai', 'sk-test');
    await storage.remove('openai');
    expect(await storage.has('openai')).toBe(false);
  });

  it('should list providers', async () => {
    await storage.set('openai', 'sk-1');
    await storage.set('anthropic', 'sk-2');
    const providers = await storage.list();
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
  });

  it('should clear all keys', async () => {
    await storage.set('openai', 'sk-1');
    await storage.set('anthropic', 'sk-2');
    await storage.clear();
    expect(await storage.list()).toHaveLength(0);
  });
});
