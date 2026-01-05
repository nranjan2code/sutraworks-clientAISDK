/**
 * Tests for cache utilities
 * @module utils/cache.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryCache, generateCacheKey, generateCacheKeyAsync } from './cache';
import type { ChatRequest, ChatResponse, CompletionRequest } from '../types';

describe('MemoryCache', () => {
  let cache: MemoryCache<ChatResponse>;

  beforeEach(() => {
    cache = new MemoryCache<ChatResponse>({ maxSize: 100, ttl: 60000 });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      const key = 'test-key';
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello!' },
            finish_reason: 'stop',
          },
        ],
      };

      cache.set(key, value);
      const retrieved = cache.get(key);
      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent key', () => {
      const value = cache.get('non-existent');
      expect(value).toBeNull();
    });

    it('should overwrite existing key', () => {
      const key = 'test-key';
      const value1: ChatResponse = {
        id: 'resp-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'First' },
            finish_reason: 'stop',
          },
        ],
      };
      const value2: ChatResponse = {
        id: 'resp-2',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Second' },
            finish_reason: 'stop',
          },
        ],
      };

      cache.set(key, value1);
      cache.set(key, value2);
      const retrieved = cache.get(key);
      expect(retrieved).toEqual(value2);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };
      cache.set('test-key', value);
      expect(cache.has('test-key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('non-existent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a key', () => {
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };
      cache.set('test-key', value);
      cache.delete('test-key');
      expect(cache.has('test-key')).toBe(false);
    });

    it('should handle deleting non-existent key', () => {
      expect(() => cache.delete('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };
      cache.set('key1', value);
      cache.set('key2', value);
      cache.clear();
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', () => {
      vi.useFakeTimers();

      const shortTtlCache = new MemoryCache<ChatResponse>({ maxSize: 100, ttl: 1000 });
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };

      shortTtlCache.set('test-key', value);
      expect(shortTtlCache.has('test-key')).toBe(true);

      // Advance time past TTL
      vi.advanceTimersByTime(1100);

      expect(shortTtlCache.has('test-key')).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when maxEntries exceeded', () => {
      const smallCache = new MemoryCache<ChatResponse>({ maxEntries: 2, ttl: 60000 });
      const value1: ChatResponse = {
        id: 'resp-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };
      const value2: ChatResponse = { ...value1, id: 'resp-2' };
      const value3: ChatResponse = { ...value1, id: 'resp-3' };

      smallCache.set('key1', value1);
      smallCache.set('key2', value2);
      smallCache.set('key3', value3); // Should evict key1

      expect(smallCache.has('key1')).toBe(false);
      expect(smallCache.has('key2')).toBe(true);
      expect(smallCache.has('key3')).toBe(true);
    });

    it('should move accessed items to front of LRU', () => {
      const smallCache = new MemoryCache<ChatResponse>({ maxEntries: 2, ttl: 60000 });
      const value: ChatResponse = {
        id: 'resp-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };

      smallCache.set('key1', value);
      smallCache.set('key2', value);
      
      // Access key1 to move it to front
      smallCache.get('key1');
      
      // Add key3 - should evict key2 (LRU) not key1
      smallCache.set('key3', value);

      expect(smallCache.has('key1')).toBe(true);
      expect(smallCache.has('key2')).toBe(false);
      expect(smallCache.has('key3')).toBe(true);
    });
  });

  describe('stats', () => {
    it('should track cache size', () => {
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };
      cache.set('key1', value);

      const stats = cache.getStats();
      expect(stats.size).toBeGreaterThanOrEqual(1);
    });

    it('should track memory usage', () => {
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };
      cache.set('key1', value);

      const stats = cache.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should track hit count', () => {
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };
      cache.set('key1', value);
      
      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(3);
    });

    it('should track average hits per entry', () => {
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };
      cache.set('key1', value);
      cache.get('key1');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.avgHits).toBe(2);
    });
  });

  describe('default values', () => {
    it('should use default options when not provided', () => {
      const defaultCache = new MemoryCache<ChatResponse>();
      const value: ChatResponse = {
        id: 'resp-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        provider: 'openai',
        choices: [],
      };
      defaultCache.set('key', value);
      expect(defaultCache.get('key')).toEqual(value);
    });
  });
});

describe('generateCacheKey', () => {
  it('should generate consistent keys for same request', () => {
    const request: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const key1 = generateCacheKey(request);
    const key2 = generateCacheKey(request);
    expect(key1).toBe(key2);
  });

  it('should generate different keys for different requests', () => {
    const request1: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };
    const request2: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Goodbye' }],
    };

    const key1 = generateCacheKey(request1);
    const key2 = generateCacheKey(request2);
    expect(key1).not.toBe(key2);
  });

  it('should include model in key', () => {
    const request1: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };
    const request2: ChatRequest = {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const key1 = generateCacheKey(request1);
    const key2 = generateCacheKey(request2);
    expect(key1).not.toBe(key2);
  });

  it('should include provider in key', () => {
    const request1: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };
    const request2: ChatRequest = {
      provider: 'anthropic',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const key1 = generateCacheKey(request1);
    const key2 = generateCacheKey(request2);
    expect(key1).not.toBe(key2);
  });

  it('should include temperature in key when present', () => {
    const request1: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0.5,
    };
    const request2: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      temperature: 0.7,
    };

    const key1 = generateCacheKey(request1);
    const key2 = generateCacheKey(request2);
    expect(key1).not.toBe(key2);
  });

  it('should include max_tokens in key', () => {
    const request1: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 100,
    };
    const request2: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 200,
    };

    const key1 = generateCacheKey(request1);
    const key2 = generateCacheKey(request2);
    expect(key1).not.toBe(key2);
  });

  it('should include top_p in key', () => {
    const request1: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      top_p: 0.9,
    };
    const request2: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
      top_p: 0.5,
    };

    const key1 = generateCacheKey(request1);
    const key2 = generateCacheKey(request2);
    expect(key1).not.toBe(key2);
  });
});

describe('generateCacheKeyAsync', () => {
  it('should generate consistent keys for same request', async () => {
    const request: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const key1 = await generateCacheKeyAsync(request);
    const key2 = await generateCacheKeyAsync(request);
    expect(key1).toBe(key2);
  });

  it('should generate different keys for different requests', async () => {
    const request1: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };
    const request2: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Goodbye' }],
    };

    const key1 = await generateCacheKeyAsync(request1);
    const key2 = await generateCacheKeyAsync(request2);
    expect(key1).not.toBe(key2);
  });

  it('should generate SHA-256 hash format', async () => {
    const request: ChatRequest = {
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    };

    const key = await generateCacheKeyAsync(request);
    // SHA-256 produces 64 hex characters
    expect(key.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(key)).toBe(true);
  });

  it('should handle CompletionRequest', async () => {
    const request: CompletionRequest = {
      provider: 'openai',
      model: 'gpt-4',
      prompt: 'Hello, world!',
    };

    const key = await generateCacheKeyAsync(request);
    expect(key).toBeDefined();
    expect(key.length).toBe(64);
  });
});
