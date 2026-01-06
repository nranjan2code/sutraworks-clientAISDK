/**
 * Tests for cache utilities
 * @module utils/cache.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryCache, IndexedDBCache, generateCacheKey, generateCacheKeyAsync, createCache } from './cache';
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

describe('MemoryCache - additional methods', () => {
  let cache: MemoryCache<ChatResponse>;

  const createValue = (id: string): ChatResponse => ({
    id,
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    provider: 'openai',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: `Response ${id}` },
        finish_reason: 'stop',
      },
    ],
  });

  beforeEach(() => {
    cache = new MemoryCache<ChatResponse>({ maxEntries: 100, ttl: 60000 });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      vi.useFakeTimers();

      const shortTtlCache = new MemoryCache<ChatResponse>({ ttl: 1000 });
      shortTtlCache.set('key1', createValue('1'));
      shortTtlCache.set('key2', createValue('2'));

      // Advance time past TTL
      vi.advanceTimersByTime(1100);

      // Add a fresh entry
      shortTtlCache.set('key3', createValue('3'));

      const removed = shortTtlCache.cleanup();
      expect(removed).toBe(2);
      expect(shortTtlCache.size()).toBe(1);
      expect(shortTtlCache.has('key3')).toBe(true);

      vi.useRealTimers();
    });

    it('should return 0 when no entries expired', () => {
      cache.set('key1', createValue('1'));
      cache.set('key2', createValue('2'));

      const removed = cache.cleanup();
      expect(removed).toBe(0);
      expect(cache.size()).toBe(2);
    });

    it('should handle empty cache', () => {
      const removed = cache.cleanup();
      expect(removed).toBe(0);
    });
  });

  describe('keys', () => {
    it('should return all cache keys', () => {
      cache.set('key1', createValue('1'));
      cache.set('key2', createValue('2'));
      cache.set('key3', createValue('3'));

      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array for empty cache', () => {
      const keys = cache.keys();
      expect(keys).toEqual([]);
    });
  });

  describe('entries', () => {
    it('should iterate entries in LRU order (most recent first)', () => {
      cache.set('key1', createValue('1'));
      cache.set('key2', createValue('2'));
      cache.set('key3', createValue('3'));

      const entries = Array.from(cache.entries());
      expect(entries).toHaveLength(3);
      expect(entries[0][0]).toBe('key3'); // Most recent
      expect(entries[1][0]).toBe('key2');
      expect(entries[2][0]).toBe('key1'); // Least recent
    });

    it('should reflect access order', () => {
      cache.set('key1', createValue('1'));
      cache.set('key2', createValue('2'));
      cache.set('key3', createValue('3'));

      // Access key1 to move it to front
      cache.get('key1');

      const entries = Array.from(cache.entries());
      expect(entries[0][0]).toBe('key1'); // Now most recent
      expect(entries[1][0]).toBe('key3');
      expect(entries[2][0]).toBe('key2');
    });

    it('should handle empty cache', () => {
      const entries = Array.from(cache.entries());
      expect(entries).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return correct cache size', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', createValue('1'));
      expect(cache.size()).toBe(1);
      cache.set('key2', createValue('2'));
      expect(cache.size()).toBe(2);
      cache.delete('key1');
      expect(cache.size()).toBe(1);
    });
  });

  describe('memoryUsage', () => {
    it('should track memory usage', () => {
      expect(cache.memoryUsage()).toBe(0);
      cache.set('key1', createValue('1'));
      const usage1 = cache.memoryUsage();
      expect(usage1).toBeGreaterThan(0);

      cache.set('key2', createValue('2'));
      const usage2 = cache.memoryUsage();
      expect(usage2).toBeGreaterThan(usage1);
    });

    it('should decrease memory on delete', () => {
      cache.set('key1', createValue('1'));
      cache.set('key2', createValue('2'));
      const beforeDelete = cache.memoryUsage();

      cache.delete('key1');
      const afterDelete = cache.memoryUsage();
      expect(afterDelete).toBeLessThan(beforeDelete);
    });
  });

  describe('size-based eviction', () => {
    it('should evict entries when max size exceeded', () => {
      // Create cache with very small max size
      const smallCache = new MemoryCache<ChatResponse>({ maxEntries: 100, maxSize: 500 });

      // Add entries until size is exceeded
      smallCache.set('key1', createValue('1'));
      smallCache.set('key2', createValue('2'));
      smallCache.set('key3', createValue('3'));
      smallCache.set('key4', createValue('4'));

      // Should have evicted oldest entries to stay under size limit
      expect(smallCache.memoryUsage()).toBeLessThanOrEqual(500);
    });
  });

  describe('getStats edge cases', () => {
    it('should return null timestamps for empty cache', () => {
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.avgHits).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });

    it('should track oldest and newest entries', () => {
      vi.useFakeTimers();
      const now = Date.now();

      cache.set('key1', createValue('1'));
      vi.advanceTimersByTime(1000);
      cache.set('key2', createValue('2'));
      vi.advanceTimersByTime(1000);
      cache.set('key3', createValue('3'));

      const stats = cache.getStats();
      expect(stats.oldestEntry).toBe(now);
      expect(stats.newestEntry).toBe(now + 2000);

      vi.useRealTimers();
    });
  });

  describe('delete return value', () => {
    it('should return true when key exists', () => {
      cache.set('key1', createValue('1'));
      expect(cache.delete('key1')).toBe(true);
    });

    it('should return false when key does not exist', () => {
      expect(cache.delete('non-existent')).toBe(false);
    });
  });

  describe('custom TTL per entry', () => {
    it('should allow custom TTL when setting entry', () => {
      vi.useFakeTimers();

      const cacheWithDefaultTtl = new MemoryCache<ChatResponse>({ ttl: 10000 });

      // Set with shorter custom TTL
      cacheWithDefaultTtl.set('short-ttl', createValue('1'), 1000);
      cacheWithDefaultTtl.set('default-ttl', createValue('2'));

      // After 1100ms, short-ttl should expire but default-ttl should remain
      vi.advanceTimersByTime(1100);

      expect(cacheWithDefaultTtl.has('short-ttl')).toBe(false);
      expect(cacheWithDefaultTtl.has('default-ttl')).toBe(true);

      vi.useRealTimers();
    });
  });
});

describe('createCache', () => {
  it('should return null when cache is disabled', () => {
    const cache = createCache({ enabled: false });
    expect(cache).toBeNull();
  });

  it('should create MemoryCache by default', () => {
    const cache = createCache({ enabled: true });
    expect(cache).toBeInstanceOf(MemoryCache);
  });

  it('should create MemoryCache when storage is memory', () => {
    const cache = createCache({ enabled: true, storage: 'memory' });
    expect(cache).toBeInstanceOf(MemoryCache);
  });

  it('should create IndexedDBCache when storage is indexedDB', () => {
    const cache = createCache({ enabled: true, storage: 'indexedDB' });
    expect(cache).toBeInstanceOf(IndexedDBCache);
  });

  it('should pass options to cache', () => {
    const cache = createCache<ChatResponse>({
      enabled: true,
      maxEntries: 50,
      maxSize: 1000,
      ttl: 5000
    }) as MemoryCache<ChatResponse>;

    // Verify options were applied by checking behavior
    expect(cache).toBeInstanceOf(MemoryCache);
    // The cache should work
    cache.set('test', {
      id: 'test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4',
      provider: 'openai',
      choices: [],
    });
    expect(cache.has('test')).toBe(true);
  });
});

// IndexedDB is not available in Node.js/jsdom test environment
// These tests are skipped in CI but would run in a real browser
const isIndexedDBAvailable = typeof indexedDB !== 'undefined';

describe.skipIf(!isIndexedDBAvailable)('IndexedDBCache', () => {
  let cache: IndexedDBCache<ChatResponse>;

  const createValue = (id: string): ChatResponse => ({
    id,
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4',
    provider: 'openai',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: `Response ${id}` },
        finish_reason: 'stop',
      },
    ],
  });

  beforeEach(() => {
    cache = new IndexedDBCache<ChatResponse>({ dbName: 'test_cache' });
  });

  afterEach(async () => {
    try {
      await cache.clear();
      cache.close();
    } catch {
      // Ignore cleanup errors in tests
    }
  });

  describe('set and get', () => {
    it('should store and retrieve a value', async () => {
      const value = createValue('1');
      await cache.set('key1', value);
      const retrieved = await cache.get('key1');
      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const value = await cache.get('non-existent');
      expect(value).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await cache.set('key1', createValue('1'));
      expect(await cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await cache.has('non-existent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a key', async () => {
      await cache.set('key1', createValue('1'));
      await cache.delete('key1');
      expect(await cache.has('key1')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct count', async () => {
      expect(await cache.size()).toBe(0);
      await cache.set('key1', createValue('1'));
      expect(await cache.size()).toBe(1);
      await cache.set('key2', createValue('2'));
      expect(await cache.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await cache.set('key1', createValue('1'));
      await cache.set('key2', createValue('2'));
      await cache.clear();
      expect(await cache.size()).toBe(0);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      vi.useFakeTimers();

      const shortTtlCache = new IndexedDBCache<ChatResponse>({
        dbName: 'test_ttl_cache',
        ttl: 1000
      });

      await shortTtlCache.set('key1', createValue('1'));
      expect(await shortTtlCache.has('key1')).toBe(true);

      // Advance time past TTL
      vi.advanceTimersByTime(1100);

      expect(await shortTtlCache.has('key1')).toBe(false);

      shortTtlCache.close();
      vi.useRealTimers();
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await cache.set('key1', createValue('1'));
      cache.close();

      // After close, operations should work (will reopen)
      const newCache = new IndexedDBCache<ChatResponse>({ dbName: 'test_cache' });
      expect(await newCache.has('key1')).toBe(true);
      newCache.close();
    });
  });
});
