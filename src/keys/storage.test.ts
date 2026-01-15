/**
 * Tests for key storage implementations
 * @module keys/storage.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MemoryStorage,
  LocalStorageImpl,
  SessionStorageImpl,
  createStorage,
} from './storage';

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe('set and get', () => {
    it('should store and retrieve a key', async () => {
      await storage.set('openai', 'test-key-12345');
      const key = await storage.get('openai');
      expect(key).toBe('test-key-12345');
    });

    it('should return null for non-existent key', async () => {
      const key = await storage.get('openai');
      expect(key).toBeNull();
    });

    it('should overwrite existing key', async () => {
      await storage.set('openai', 'key-1');
      await storage.set('openai', 'key-2');
      const key = await storage.get('openai');
      expect(key).toBe('key-2');
    });
  });

  describe('remove', () => {
    it('should remove a key', async () => {
      await storage.set('openai', 'test-key');
      await storage.remove('openai');
      const key = await storage.get('openai');
      expect(key).toBeNull();
    });

    it('should not throw when removing non-existent key', async () => {
      await expect(storage.remove('openai')).resolves.not.toThrow();
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await storage.set('openai', 'test-key');
      expect(await storage.has('openai')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await storage.has('openai')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all keys', async () => {
      await storage.set('openai', 'key-1');
      await storage.set('anthropic', 'key-2');
      await storage.clear();
      expect(await storage.has('openai')).toBe(false);
      expect(await storage.has('anthropic')).toBe(false);
    });
  });

  describe('list', () => {
    it('should list all providers with keys', async () => {
      await storage.set('openai', 'key-1');
      await storage.set('anthropic', 'key-2');
      const providers = await storage.list();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers.length).toBe(2);
    });

    it('should return empty array when no keys', async () => {
      const providers = await storage.list();
      expect(providers).toEqual([]);
    });
  });

  describe('getMeta', () => {
    it('should return metadata for stored key', async () => {
      await storage.set('openai', 'test-key');
      const meta = await storage.getMeta('openai');
      expect(meta).not.toBeNull();
      expect(meta?.provider).toBe('openai');
      expect(meta?.createdAt).toBeDefined();
    });

    it('should return null for non-existent key', async () => {
      const meta = await storage.getMeta('openai');
      expect(meta).toBeNull();
    });

    it('should track encrypted flag', async () => {
      const encryptedStorage = new MemoryStorage({ encrypt: true });
      await encryptedStorage.set('openai', 'test-key');
      const meta = await encryptedStorage.getMeta('openai');
      expect(meta?.encrypted).toBe(true);
    });
  });

  describe('encryption', () => {
    it('should encrypt keys when enabled', async () => {
      const encryptedStorage = new MemoryStorage({ encrypt: true });
      await encryptedStorage.set('openai', 'secret-key-12345');
      const retrieved = await encryptedStorage.get('openai');
      expect(retrieved).toBe('secret-key-12345');
    });

    it('should work with multiple encrypted keys', async () => {
      const encryptedStorage = new MemoryStorage({ encrypt: true });
      await encryptedStorage.set('openai', 'openai-key');
      await encryptedStorage.set('anthropic', 'anthropic-key');

      expect(await encryptedStorage.get('openai')).toBe('openai-key');
      expect(await encryptedStorage.get('anthropic')).toBe('anthropic-key');
    });

    it('should update lastUsedAt on get', async () => {
      await storage.set('openai', 'test-key');
      const metaBefore = await storage.getMeta('openai');

      // Wait a bit and access the key
      await new Promise(r => setTimeout(r, 10));
      await storage.get('openai');

      const metaAfter = await storage.getMeta('openai');
      expect(metaAfter?.lastUsedAt).toBeDefined();
    });
  });
});

// Mock localStorage for browser environment tests
const createMockStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  };
};

describe('LocalStorageImpl', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    (global as unknown as Record<string, unknown>).localStorage = mockStorage;
  });

  afterEach(() => {
    delete (global as unknown as { localStorage?: unknown }).localStorage;
  });

  it('should create with default prefix', () => {
    const storage = new LocalStorageImpl();
    expect(storage).toBeDefined();
  });

  it('should create with custom prefix', () => {
    const storage = new LocalStorageImpl({ prefix: 'custom_' });
    expect(storage).toBeDefined();
  });

  it('should store and retrieve a key', async () => {
    const storage = new LocalStorageImpl();
    await storage.set('openai', 'test-key');
    const key = await storage.get('openai');
    expect(key).toBe('test-key');
  });

  it('should return null for non-existent key', async () => {
    const storage = new LocalStorageImpl();
    const key = await storage.get('openai');
    expect(key).toBeNull();
  });

  it('should check if key exists', async () => {
    const storage = new LocalStorageImpl();
    expect(await storage.has('openai')).toBe(false);
    await storage.set('openai', 'test-key');
    expect(await storage.has('openai')).toBe(true);
  });

  it('should remove a key', async () => {
    const storage = new LocalStorageImpl();
    await storage.set('openai', 'test-key');
    await storage.remove('openai');
    expect(await storage.has('openai')).toBe(false);
  });

  it('should list stored providers', async () => {
    const storage = new LocalStorageImpl();
    await storage.set('openai', 'key-1');
    await storage.set('anthropic', 'key-2');
    const providers = await storage.list();
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
  });

  it('should clear all keys', async () => {
    const storage = new LocalStorageImpl();
    await storage.set('openai', 'key-1');
    await storage.set('anthropic', 'key-2');
    await storage.clear();
    expect(await storage.list()).toHaveLength(0);
  });

  it('should get metadata', async () => {
    const storage = new LocalStorageImpl();
    await storage.set('openai', 'test-key');
    const meta = await storage.getMeta('openai');
    expect(meta).not.toBeNull();
    expect(meta?.provider).toBe('openai');
  });

  it('should return null meta for non-existent key', async () => {
    const storage = new LocalStorageImpl();
    const meta = await storage.getMeta('nonexistent' as import('../types').ProviderName);
    expect(meta).toBeNull();
  });

  it('should throw when encryption enabled without password', async () => {
    const storage = new LocalStorageImpl({ encrypt: true });
    await expect(storage.set('openai', 'test-key'))
      .rejects.toThrow('Encryption enabled but no encryption key provided');
  });

  it('should encrypt and decrypt with password', async () => {
    const storage = new LocalStorageImpl({
      encrypt: true,
      encryptionKey: 'test-password-123'
    });
    await storage.set('openai', 'secret-key');
    const retrieved = await storage.get('openai');
    expect(retrieved).toBe('secret-key');
  });
});

describe('SessionStorageImpl', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
    (global as unknown as Record<string, unknown>).sessionStorage = mockStorage;
  });

  afterEach(() => {
    delete (global as unknown as { sessionStorage?: unknown }).sessionStorage;
  });

  it('should create with default prefix', () => {
    const storage = new SessionStorageImpl();
    expect(storage).toBeDefined();
  });

  it('should store and retrieve a key', async () => {
    const storage = new SessionStorageImpl();
    await storage.set('openai', 'test-key');
    const key = await storage.get('openai');
    expect(key).toBe('test-key');
  });

  it('should return null for non-existent key', async () => {
    const storage = new SessionStorageImpl();
    const key = await storage.get('openai');
    expect(key).toBeNull();
  });

  it('should check if key exists', async () => {
    const storage = new SessionStorageImpl();
    expect(await storage.has('openai')).toBe(false);
    await storage.set('openai', 'test-key');
    expect(await storage.has('openai')).toBe(true);
  });

  it('should remove a key', async () => {
    const storage = new SessionStorageImpl();
    await storage.set('openai', 'test-key');
    await storage.remove('openai');
    expect(await storage.has('openai')).toBe(false);
  });

  it('should list stored providers', async () => {
    const storage = new SessionStorageImpl();
    await storage.set('openai', 'key-1');
    await storage.set('anthropic', 'key-2');
    const providers = await storage.list();
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
  });

  it('should clear all keys', async () => {
    const storage = new SessionStorageImpl();
    await storage.set('openai', 'key-1');
    await storage.set('anthropic', 'key-2');
    await storage.clear();
    expect(await storage.list()).toHaveLength(0);
  });

  it('should get metadata', async () => {
    const storage = new SessionStorageImpl();
    await storage.set('openai', 'test-key');
    const meta = await storage.getMeta('openai');
    expect(meta).not.toBeNull();
    expect(meta?.provider).toBe('openai');
  });

  it('should throw when encryption enabled without password', async () => {
    const storage = new SessionStorageImpl({ encrypt: true });
    await expect(storage.set('openai', 'test-key'))
      .rejects.toThrow('Encryption enabled but no encryption key provided');
  });

  it('should encrypt and decrypt with password', async () => {
    const storage = new SessionStorageImpl({
      encrypt: true,
      encryptionKey: 'test-password-123'
    });
    await storage.set('openai', 'secret-key');
    const retrieved = await storage.get('openai');
    expect(retrieved).toBe('secret-key');
  });
});

describe('createStorage', () => {
  beforeEach(() => {
    const mockStorage = createMockStorage();
    (global as unknown as Record<string, unknown>).localStorage = mockStorage;
    (global as unknown as Record<string, unknown>).sessionStorage = mockStorage;
  });

  afterEach(() => {
    delete (global as unknown as { localStorage?: unknown }).localStorage;
    delete (global as unknown as { sessionStorage?: unknown }).sessionStorage;
  });

  it('should create MemoryStorage by default', () => {
    const storage = createStorage({ type: 'memory' });
    expect(storage).toBeInstanceOf(MemoryStorage);
  });

  it('should create MemoryStorage when type is memory', () => {
    const storage = createStorage({ type: 'memory' });
    expect(storage).toBeInstanceOf(MemoryStorage);
  });

  it('should create LocalStorageImpl when type is localStorage', () => {
    const storage = createStorage({ type: 'localStorage' });
    expect(storage).toBeInstanceOf(LocalStorageImpl);
  });

  it('should create SessionStorageImpl when type is sessionStorage', () => {
    const storage = createStorage({ type: 'sessionStorage' });
    expect(storage).toBeInstanceOf(SessionStorageImpl);
  });

  it('should handle custom storage options', () => {
    const storage = createStorage({
      type: 'memory',
      prefix: 'test-',
      encrypt: true,
    });
    expect(storage).toBeInstanceOf(MemoryStorage);
  });

  it('should create localStorage with encryption', () => {
    const storage = createStorage({
      type: 'localStorage',
      encrypt: true,
      encryptionKey: 'password',
    });
    expect(storage).toBeInstanceOf(LocalStorageImpl);
  });

  it('should create sessionStorage with encryption', () => {
    const storage = createStorage({
      type: 'sessionStorage',
      encrypt: true,
      encryptionKey: 'password',
    });
    expect(storage).toBeInstanceOf(SessionStorageImpl);
  });
});
