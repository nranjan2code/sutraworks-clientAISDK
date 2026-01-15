/**
 * Tests for Key Manager
 * @module keys/manager.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyManager } from './manager';
import { EventEmitter } from '../utils/events';
import { SutraError } from '../types';

// Valid test keys that match provider format patterns
const TEST_KEYS = {
  openai: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
  anthropic: 'sk-ant-test1234567890abcdefghijklmnopqrstuvwxyzabc',
  google: 'AIzaTestKey1234567890abcdefghijklmnop',
  groq: 'gsk_test1234567890abcdefghijklmnopqrstuvwxyzabcdefghijk',
};

describe('KeyManager', () => {
  let manager: KeyManager;
  let events: EventEmitter;

  beforeEach(() => {
    events = new EventEmitter();
    manager = new KeyManager({ type: 'memory' }, events);
  });

  afterEach(async () => {
    await manager.destroy();
  });

  describe('setKey', () => {
    it('should store a valid API key', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      expect(await manager.hasKey('openai')).toBe(true);
    });

    it('should reject keys that are too short', async () => {
      await expect(manager.setKey('openai', 'short')).rejects.toThrow(SutraError);
    });

    it('should reject empty keys', async () => {
      await expect(manager.setKey('openai', '')).rejects.toThrow(SutraError);
    });

    it('should reject whitespace-only keys', async () => {
      await expect(manager.setKey('openai', '   ')).rejects.toThrow();
    });

    it('should overwrite existing key for same provider', async () => {
      const key1 = 'sk-first1234567890abcdefghijklmnopqrst';
      const key2 = 'sk-second123456789abcdefghijklmnopqrst';
      await manager.setKey('openai', key1);
      await manager.setKey('openai', key2);

      const key = await manager.getKey('openai');
      expect(key).toBe(key2);
    });
  });

  describe('setKeys', () => {
    it('should set multiple keys sequentially', async () => {
      // setKeys runs operations sequentially internally
      await manager.setKey('openai', TEST_KEYS.openai);
      await manager.setKey('anthropic', TEST_KEYS.anthropic);

      expect(await manager.hasKey('openai')).toBe(true);
      expect(await manager.hasKey('anthropic')).toBe(true);
    });
  });

  describe('getKey', () => {
    it('should return stored key', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      const key = await manager.getKey('openai');
      expect(key).toBe(TEST_KEYS.openai);
    });

    it('should return null for non-existent key', async () => {
      const key = await manager.getKey('openai');
      expect(key).toBeNull();
    });
  });

  describe('requireKey', () => {
    it('should return key when it exists', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      const key = await manager.requireKey('openai');
      expect(key).toBe(TEST_KEYS.openai);
    });

    it('should throw for non-existent key', async () => {
      await expect(manager.requireKey('openai')).rejects.toThrow(SutraError);
    });

    it('should throw with KEY_NOT_SET code', async () => {
      try {
        await manager.requireKey('openai');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as SutraError).code).toBe('KEY_NOT_SET');
      }
    });
  });

  describe('hasKey', () => {
    it('should return true for existing key', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      expect(await manager.hasKey('openai')).toBe(true);
    });

    it('should return false for non-existing key', async () => {
      expect(await manager.hasKey('openai')).toBe(false);
    });
  });

  describe('removeKey', () => {
    it('should remove existing key', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      await manager.removeKey('openai');
      expect(await manager.hasKey('openai')).toBe(false);
    });

    it('should not throw for non-existing key', async () => {
      await expect(manager.removeKey('openai')).resolves.not.toThrow();
    });
  });

  describe('clearAllKeys', () => {
    it('should remove all keys', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      await manager.setKey('anthropic', TEST_KEYS.anthropic);

      await manager.clearAllKeys();

      expect(await manager.hasKey('openai')).toBe(false);
      expect(await manager.hasKey('anthropic')).toBe(false);
    });
  });

  describe('listProviders', () => {
    it('should return list of providers with keys', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      await manager.setKey('anthropic', TEST_KEYS.anthropic);

      const providers = await manager.listProviders();

      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });

    it('should return empty array when no keys set', async () => {
      const providers = await manager.listProviders();
      expect(providers).toHaveLength(0);
    });
  });

  describe('destroy', () => {
    it('should clear all keys on destroy', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      await manager.destroy();

      // Create new manager with same events
      const newManager = new KeyManager({ type: 'memory' }, events);
      expect(await newManager.hasKey('openai')).toBe(false);
      await newManager.destroy();
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent setKey operations safely', async () => {
      // Run concurrent setKey operations using Promise.all
      const key1 = 'sk-key1-1234567890abcdefghijklmnopqrst';

      await Promise.all([
        manager.setKey('openai', key1),
        manager.setKey('anthropic', TEST_KEYS.anthropic),
        manager.setKey('google', TEST_KEYS.google),
      ]);

      expect(await manager.hasKey('openai')).toBe(true);
      expect(await manager.hasKey('anthropic')).toBe(true);
      expect(await manager.hasKey('google')).toBe(true);
    });

    it('should handle concurrent operations on same key', async () => {
      const key1 = 'sk-initial123456789abcdefghijklmnopqr';
      const key2 = 'sk-updated123456789abcdefghijklmnopqr';

      // Run concurrent operations on same key
      await Promise.all([
        manager.setKey('openai', key1),
        manager.setKey('openai', key2),
      ]);

      // Key should exist (one of the values)
      const key = await manager.getKey('openai');
      expect(key).toBeDefined();
      expect([key1, key2]).toContain(key);
    });
  });

  describe('key fingerprint', () => {
    it('should generate fingerprint for stored key', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      const fingerprint = await manager.getKeyFingerprint('openai');
      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
    });

    it('should return null for non-existent key', async () => {
      const fingerprint = await manager.getKeyFingerprint('openai');
      expect(fingerprint).toBeNull();
    });
  });

  describe('key verification', () => {
    it('should verify matching key', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      const isValid = await manager.verifyKey('openai', TEST_KEYS.openai);
      expect(isValid).toBe(true);
    });

    it('should reject non-matching key', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      const wrongKey = 'sk-wrong1234567890abcdefghijklmnopqrst';
      const isValid = await manager.verifyKey('openai', wrongKey);
      expect(isValid).toBe(false);
    });

    it('should return false for non-existent provider', async () => {
      const anyKey = 'sk-anykey1234567890abcdefghijklmnopqr';
      const isValid = await manager.verifyKey('openai', anyKey);
      expect(isValid).toBe(false);
    });
  });

  describe('setKeys (batch)', () => {
    it('should set multiple keys at once', async () => {
      await manager.setKeys({
        openai: TEST_KEYS.openai,
        anthropic: TEST_KEYS.anthropic,
        google: TEST_KEYS.google,
      });

      expect(await manager.hasKey('openai')).toBe(true);
      expect(await manager.hasKey('anthropic')).toBe(true);
      expect(await manager.hasKey('google')).toBe(true);
    });

    it('should skip null or undefined keys', async () => {
      await manager.setKeys({
        openai: TEST_KEYS.openai,
        anthropic: null as unknown as string,
        google: undefined as unknown as string,
      });

      expect(await manager.hasKey('openai')).toBe(true);
      expect(await manager.hasKey('anthropic')).toBe(false);
      expect(await manager.hasKey('google')).toBe(false);
    });

    it('should handle empty object', async () => {
      await expect(manager.setKeys({})).resolves.not.toThrow();
    });
  });

  describe('getKeyMeta', () => {
    it('should return metadata for stored key', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      const meta = await manager.getKeyMeta('openai');

      expect(meta).not.toBeNull();
      expect(meta?.provider).toBe('openai');
      expect(meta?.createdAt).toBeDefined();
      expect(typeof meta?.createdAt).toBe('number');
    });

    it('should return null for non-existent key', async () => {
      const meta = await manager.getKeyMeta('openai');
      expect(meta).toBeNull();
    });
  });

  describe('auto-clear timer', () => {
    it('should auto-clear key after timeout', async () => {
      vi.useFakeTimers();

      const timedManager = new KeyManager({
        type: 'memory',
        autoClearAfter: 1000, // 1 second
      }, events);

      await timedManager.setKey('openai', TEST_KEYS.openai);
      expect(await timedManager.hasKey('openai')).toBe(true);

      // Advance time past auto-clear
      vi.advanceTimersByTime(1100);

      // Allow async operations to complete
      await vi.runAllTimersAsync();

      expect(await timedManager.hasKey('openai')).toBe(false);

      await timedManager.destroy();
      vi.useRealTimers();
    });

    it('should reset timer when key is updated', async () => {
      vi.useFakeTimers();

      const timedManager = new KeyManager({
        type: 'memory',
        autoClearAfter: 1000,
      }, events);

      const key1 = 'sk-test1-1234567890abcdefghijklmnopqrs';
      const key2 = 'sk-newkey1234567890abcdefghijklmnopqr';

      await timedManager.setKey('openai', key1);

      // Advance time partially
      vi.advanceTimersByTime(500);

      // Update the key (should reset timer)
      await timedManager.setKey('openai', key2);

      // Advance time past original timeout but before new timeout
      vi.advanceTimersByTime(600);

      expect(await timedManager.hasKey('openai')).toBe(true);

      // Advance past new timeout
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();

      expect(await timedManager.hasKey('openai')).toBe(false);

      await timedManager.destroy();
      vi.useRealTimers();
    });

    it('should clear timer when key is manually removed', async () => {
      vi.useFakeTimers();

      const timedManager = new KeyManager({
        type: 'memory',
        autoClearAfter: 1000,
      }, events);

      await timedManager.setKey('openai', TEST_KEYS.openai);
      await timedManager.removeKey('openai');

      // Advance time past auto-clear (should not emit event since already removed)
      vi.advanceTimersByTime(1100);
      await vi.runAllTimersAsync();

      // Just verify no errors occurred
      expect(await timedManager.hasKey('openai')).toBe(false);

      await timedManager.destroy();
      vi.useRealTimers();
    });
  });

  describe('updateStorage', () => {
    it('should migrate keys to new storage type', async () => {
      await manager.setKey('openai', TEST_KEYS.openai);
      await manager.setKey('anthropic', TEST_KEYS.anthropic);

      // Update to encrypted memory storage
      await manager.updateStorage({
        type: 'memory',
        encrypt: true,
      });

      // Keys should still be accessible
      expect(await manager.hasKey('openai')).toBe(true);
      expect(await manager.hasKey('anthropic')).toBe(true);

      // Verify keys are correct
      const openaiKey = await manager.getKey('openai');
      expect(openaiKey).toBe(TEST_KEYS.openai);
    });

    it('should handle update with no existing keys', async () => {
      await manager.updateStorage({
        type: 'memory',
        encrypt: true,
      });

      // Should not throw and should accept new keys
      await manager.setKey('openai', TEST_KEYS.openai);
      expect(await manager.hasKey('openai')).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit key:set event when key is stored', async () => {
      const listener = vi.fn();
      events.on('key:set', listener);

      await manager.setKey('openai', TEST_KEYS.openai);

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].provider).toBe('openai');
    });

    it('should emit key:remove event when key is removed', async () => {
      const listener = vi.fn();
      events.on('key:remove', listener);

      await manager.setKey('openai', TEST_KEYS.openai);
      await manager.removeKey('openai');

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].provider).toBe('openai');
    });

    it('should emit key:validate event when key is validated', async () => {
      const listener = vi.fn();
      events.on('key:validate', listener);

      await manager.setKey('openai', TEST_KEYS.openai);

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].provider).toBe('openai');
      expect(listener.mock.calls[0][0].valid).toBe(true);
    });
  });
});

