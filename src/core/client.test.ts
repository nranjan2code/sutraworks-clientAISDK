/**
 * Tests for SutraAI client
 * @module core/client.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SutraAI } from './client';
import type { ChatRequest } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Valid test keys that match provider format patterns
const TEST_API_KEY = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz';
const TEST_ANTHROPIC_KEY = 'sk-ant-test1234567890abcdefghijklmnopqrstuvwxyzabc';

function createTestRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    provider: 'openai',
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
    ...overrides,
  };
}

describe('SutraAI Client', () => {
  let ai: SutraAI;

  beforeEach(() => {
    ai = new SutraAI({ cache: { enabled: false }, enableValidation: false });
    mockFetch.mockReset();
  });

  afterEach(async () => {
    await ai.destroy();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create instance with default config', () => {
      const client = new SutraAI();
      expect(client).toBeDefined();
    });

    it('should create instance with custom config', () => {
      const client = new SutraAI({
        defaultTimeout: 60000,
        defaultMaxRetries: 5,
      });
      expect(client).toBeDefined();
    });

    it('should accept cache options', () => {
      const client = new SutraAI({
        cache: {
          enabled: true,
          ttl: 30000,
        },
      });
      expect(client).toBeDefined();
    });

    it('should accept validation option', () => {
      const client = new SutraAI({ enableValidation: true });
      expect(client).toBeDefined();
    });

    it('should accept middleware option', () => {
      const client = new SutraAI({
        middleware: [{
          name: 'test',
          beforeRequest: async (req) => req,
        }],
      });
      expect(client).toBeDefined();
    });
  });

  describe('key management', () => {
    it('should set and check API key', async () => {
      await ai.setKey('openai', TEST_API_KEY);
      expect(await ai.hasKey('openai')).toBe(true);
    });

    it('should check for missing key', async () => {
      expect(await ai.hasKey('openai')).toBe(false);
    });

    it('should remove key', async () => {
      await ai.setKey('openai', TEST_API_KEY);
      await ai.removeKey('openai');
      expect(await ai.hasKey('openai')).toBe(false);
    });

    it('should set multiple keys', async () => {
      await ai.setKeys({
        openai: TEST_API_KEY,
        anthropic: TEST_ANTHROPIC_KEY,
      });
      expect(await ai.hasKey('openai')).toBe(true);
      expect(await ai.hasKey('anthropic')).toBe(true);
    });

    it('should clear all keys', async () => {
      await ai.setKeys({
        openai: TEST_API_KEY,
        anthropic: TEST_ANTHROPIC_KEY,
      });
      await ai.clearKeys();
      expect(await ai.hasKey('openai')).toBe(false);
      expect(await ai.hasKey('anthropic')).toBe(false);
    });

    it('should list stored keys', async () => {
      await ai.setKeys({
        openai: TEST_API_KEY,
        anthropic: TEST_ANTHROPIC_KEY,
      });
      const stored = await ai.listStoredKeys();
      expect(stored).toContain('openai');
      expect(stored).toContain('anthropic');
    });
  });

  describe('chat', () => {
    it('should make chat request', async () => {
      await ai.setKey('openai', TEST_API_KEY);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            created: 1677652288,
            model: 'gpt-4',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const response = await ai.chat(createTestRequest());
      expect(response.choices[0].message.content).toBe('Hello!');
    });

    it('should throw error if no key set', async () => {
      await expect(ai.chat(createTestRequest())).rejects.toThrow();
    });

    it('should pass temperature parameter', async () => {
      await ai.setKey('openai', TEST_API_KEY);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            created: 1677652288,
            model: 'gpt-4',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
          }),
      });

      await ai.chat(createTestRequest({ temperature: 0.7 }));

      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.temperature).toBe(0.7);
    });

    it('should pass max_tokens parameter', async () => {
      await ai.setKey('openai', TEST_API_KEY);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            object: 'chat.completion',
            created: 1677652288,
            model: 'gpt-4',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
          }),
      });

      await ai.chat(createTestRequest({ max_tokens: 500 }));

      expect(mockFetch).toHaveBeenCalled();
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.max_tokens).toBe(500);
    });
  });

  describe('middleware', () => {
    it('should add middleware', () => {
      ai.use({
        name: 'test-middleware',
        beforeRequest: async (req) => req,
      });
      expect(ai.listMiddleware()).toContain('test-middleware');
    });

    it('should add middleware with priority', () => {
      ai.use({
        name: 'test-middleware',
        priority: 10,
        beforeRequest: async (req) => req,
      });
      expect(ai.listMiddleware()).toContain('test-middleware');
    });

    it('should remove middleware', () => {
      ai.use({
        name: 'removable',
        beforeRequest: async (req) => req,
      });
      const removed = ai.removeMiddleware('removable');
      expect(removed).toBe(true);
    });

    it('should toggle middleware', () => {
      ai.use({
        name: 'toggleable',
        beforeRequest: async (req) => req,
      });
      const toggled = ai.toggleMiddleware('toggleable', false);
      expect(toggled).toBe(true);
    });
  });

  describe('events', () => {
    it('should subscribe to events', () => {
      const handler = vi.fn();
      const unsub = ai.on('request:start', handler);
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('should unsubscribe from events', () => {
      const handler = vi.fn();
      ai.on('request:start', handler);
      ai.off('request:start', handler);
      // Should not throw
      expect(true).toBe(true);
    });

    it('should subscribe to all events', () => {
      const handler = vi.fn();
      const unsub = ai.onAll(handler);
      expect(typeof unsub).toBe('function');
      unsub();
    });
  });

  describe('provider support', () => {
    it('should list available providers', () => {
      const providers = ai.getProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });

    it('should check provider feature support', () => {
      const supportsStreaming = ai.supportsFeature('openai', 'streaming');
      expect(typeof supportsStreaming).toBe('boolean');
    });

    it('should check embeddings support', () => {
      const supportsEmbeddings = ai.supportsFeature('openai', 'embeddings');
      expect(typeof supportsEmbeddings).toBe('boolean');
    });
  });

  describe('models', () => {
    it('should list models for provider', async () => {
      const models = await ai.listModels('openai');
      expect(Array.isArray(models)).toBe(true);
    });

    it('should list all models', async () => {
      const models = await ai.listAllModels();
      expect(Array.isArray(models)).toBe(true);
    });
  });

  describe('token counting', () => {
    it('should estimate tokens', () => {
      const tokens = ai.estimateTokens([
        { role: 'user', content: 'Hello, how are you?' }
      ]);
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should estimate cost', () => {
      const cost = ai.estimateCost(100, 50, 'gpt-4');
      expect(cost).toHaveProperty('input');
      expect(cost).toHaveProperty('output');
      expect(cost).toHaveProperty('total');
    });

    it('should track usage stats', async () => {
      await ai.setKey('openai', TEST_API_KEY);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            model: 'gpt-4',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      await ai.chat(createTestRequest());

      const stats = ai.getUsageStats();
      expect(stats.totalTokens).toBeGreaterThan(0);
    });

    it('should get usage by model', () => {
      const usage = ai.getUsageByModel();
      expect(typeof usage).toBe('object');
    });

    it('should reset usage stats', () => {
      ai.resetUsageStats();
      const stats = ai.getUsageStats();
      expect(stats.totalTokens).toBe(0);
    });
  });

  describe('cache', () => {
    it('should enable cache', () => {
      ai.setCache(true, { ttl: 30000 });
      // Should not throw
      expect(true).toBe(true);
    });

    it('should disable cache', () => {
      ai.setCache(false);
      expect(true).toBe(true);
    });

    it('should clear cache', () => {
      ai.setCache(true);
      ai.clearCache();
      expect(true).toBe(true);
    });

    it('should get cache stats', () => {
      ai.setCache(true);
      const stats = ai.getCacheStats();
      expect(stats).toHaveProperty('size');
    });

    it('should return null stats when cache disabled', () => {
      ai.setCache(false);
      const stats = ai.getCacheStats();
      expect(stats).toBeNull();
    });
  });

  describe('templates', () => {
    it('should register template', () => {
      ai.registerTemplate({
        name: 'greeting',
        user: 'Say hello to {name}',
      });
      expect(ai.listTemplates()).toContain('greeting');
    });

    it('should remove template', () => {
      ai.registerTemplate({
        name: 'removable',
        user: 'Test',
      });
      const removed = ai.removeTemplate('removable');
      expect(removed).toBe(true);
    });

    it('should list templates', () => {
      ai.registerTemplate({ name: 'test1', user: 'Test 1' });
      ai.registerTemplate({ name: 'test2', user: 'Test 2' });
      const templates = ai.listTemplates();
      expect(templates).toContain('test1');
      expect(templates).toContain('test2');
    });

    it('should execute template', async () => {
      await ai.setKey('openai', TEST_API_KEY);

      ai.registerTemplate({
        name: 'greeting',
        user: 'Say hello to {name}',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            model: 'gpt-4',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello, World!' },
                finish_reason: 'stop',
              },
            ],
          }),
      });

      const response = await ai.executeTemplate('greeting', { name: 'World' });
      expect(response.choices[0].message.content).toBe('Hello, World!');
    });

    it('should throw for unknown template', async () => {
      await expect(ai.executeTemplate('unknown', {}))
        .rejects.toThrow('Template "unknown" not found');
    });
  });

  describe('convenience methods', () => {
    it('should complete text', async () => {
      await ai.setKey('openai', TEST_API_KEY);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            model: 'gpt-4',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Response' },
                finish_reason: 'stop',
              },
            ],
          }),
      });

      const result = await ai.complete('Hello');
      expect(result).toBe('Response');
    });

    it('should configure provider', () => {
      ai.configureProvider('openai', {
        baseUrl: 'https://custom.openai.com',
        timeout: 60000,
      });
      // Should not throw
      expect(true).toBe(true);
    });

    it('should set debug mode', () => {
      ai.setDebug(true);
      expect(true).toBe(true);
    });
  });

  describe('batch processing', () => {
    it('should process batch requests', async () => {
      await ai.setKey('openai', TEST_API_KEY);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chatcmpl-123',
            model: 'gpt-4',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Response' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const result = await ai.batch({
        requests: [
          createTestRequest(),
          createTestRequest({ messages: [{ role: 'user', content: 'Hi' }] }),
        ],
        concurrency: 2,
      });

      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', async () => {
      await ai.setKey('openai', TEST_API_KEY);
      await ai.destroy();
      expect(ai.isDestroyed()).toBe(true);
    });

    it('should throw on methods after destroy', async () => {
      await ai.destroy();
      await expect(ai.chat(createTestRequest())).rejects.toThrow('Client has been destroyed');
    });
  });
});
