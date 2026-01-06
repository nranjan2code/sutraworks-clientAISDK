/**
 * Tests for Key Manager
 * @module keys/manager.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyManager } from './manager';
import { MemoryStorage } from './storage';
import { EventEmitter } from '../utils/events';
import { SutraError } from '../types';

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
      await manager.setKey('openai', 'sk-test-key-12345');
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
      await manager.setKey('openai', 'sk-first-key-12345');
      await manager.setKey('openai', 'sk-second-key-12345');

      const key = await manager.getKey('openai');
      expect(key).toBe('sk-second-key-12345');
    });
  });

  describe('setKeys', () => {
    it('should set multiple keys sequentially', async () => {
      // setKeys runs operations sequentially internally
      await manager.setKey('openai', 'sk-openai-key-12345');
      await manager.setKey('anthropic', 'sk-anthropic-key-12345');

      expect(await manager.hasKey('openai')).toBe(true);
      expect(await manager.hasKey('anthropic')).toBe(true);
    });
  });

  describe('getKey', () => {
    it('should return stored key', async () => {
      await manager.setKey('openai', 'sk-test-key-12345');
      const key = await manager.getKey('openai');
      expect(key).toBe('sk-test-key-12345');
    });

    it('should return null for non-existent key', async () => {
      const key = await manager.getKey('openai');
      expect(key).toBeNull();
    });
  });

  describe('requireKey', () => {
    it('should return key when it exists', async () => {
      await manager.setKey('openai', 'sk-test-key-12345');
      const key = await manager.requireKey('openai');
      expect(key).toBe('sk-test-key-12345');
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
      await manager.setKey('openai', 'sk-test-key-12345');
      expect(await manager.hasKey('openai')).toBe(true);
    });

    it('should return false for non-existing key', async () => {
      expect(await manager.hasKey('openai')).toBe(false);
    });
  });

  describe('removeKey', () => {
    it('should remove existing key', async () => {
      await manager.setKey('openai', 'sk-test-key-12345');
      await manager.removeKey('openai');
      expect(await manager.hasKey('openai')).toBe(false);
    });

    it('should not throw for non-existing key', async () => {
      await expect(manager.removeKey('openai')).resolves.not.toThrow();
    });
  });

  describe('clearAllKeys', () => {
    it('should remove all keys', async () => {
      await manager.setKey('openai', 'sk-openai-key-12345');
      await manager.setKey('anthropic', 'sk-anthropic-key-12345');

      await manager.clearAllKeys();

      expect(await manager.hasKey('openai')).toBe(false);
      expect(await manager.hasKey('anthropic')).toBe(false);
    });
  });

  describe('listProviders', () => {
    it('should return list of providers with keys', async () => {
      await manager.setKey('openai', 'sk-openai-key-12345');
      await manager.setKey('anthropic', 'sk-anthropic-key-12345');

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
      await manager.setKey('openai', 'sk-test-key-12345');
      await manager.destroy();

      // Create new manager with same events
      const newManager = new KeyManager({ type: 'memory' }, events);
      expect(await newManager.hasKey('openai')).toBe(false);
      await newManager.destroy();
    });
  });

  describe('concurrent access', () => {
    it('should handle sequential setKey operations safely', async () => {
      // Run setKey operations sequentially 
      await manager.setKey('provider1', 'sk-key-one-12345');
      await manager.setKey('provider2', 'sk-key-two-12345');
      await manager.setKey('provider3', 'sk-key-three-12345');

      expect(await manager.hasKey('provider1')).toBe(true);
      expect(await manager.hasKey('provider2')).toBe(true);
      expect(await manager.hasKey('provider3')).toBe(true);
    });

    it('should handle overwriting keys correctly', async () => {
      await manager.setKey('openai', 'sk-initial-key-12345');
      await manager.setKey('openai', 'sk-updated-key-12345');

      const key = await manager.getKey('openai');
      expect(key).toBe('sk-updated-key-12345');
    });
  });

  describe('key fingerprint', () => {
    it('should generate fingerprint for stored key', async () => {
      await manager.setKey('openai', 'sk-test-key-12345');
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
      await manager.setKey('openai', 'sk-test-key-12345');
      const isValid = await manager.verifyKey('openai', 'sk-test-key-12345');
      expect(isValid).toBe(true);
    });

    it('should reject non-matching key', async () => {
      await manager.setKey('openai', 'sk-test-key-12345');
      const isValid = await manager.verifyKey('openai', 'sk-wrong-key-12345');
      expect(isValid).toBe(false);
    });

    it('should return false for non-existent provider', async () => {
      const isValid = await manager.verifyKey('openai', 'sk-any-key-12345');
      expect(isValid).toBe(false);
    });
  });

  describe('setKeys (batch)', () => {
    it('should set multiple keys at once', async () => {
      await manager.setKeys({
        openai: 'sk-openai-key-12345',
        anthropic: 'sk-anthropic-key-12345',
        google: 'google-api-key-12345',
      });

      expect(await manager.hasKey('openai')).toBe(true);
      expect(await manager.hasKey('anthropic')).toBe(true);
      expect(await manager.hasKey('google')).toBe(true);
    });

    it('should skip null or undefined keys', async () => {
      await manager.setKeys({
        openai: 'sk-openai-key-12345',
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
      await manager.setKey('openai', 'sk-test-key-12345');
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

      await timedManager.setKey('openai', 'sk-test-key-12345');
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

      await timedManager.setKey('openai', 'sk-test-key-12345');

      // Advance time partially
      vi.advanceTimersByTime(500);

      // Update the key (should reset timer)
      await timedManager.setKey('openai', 'sk-new-key-123456');

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

      await timedManager.setKey('openai', 'sk-test-key-12345');
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
      await manager.setKey('openai', 'sk-openai-key-12345');
      await manager.setKey('anthropic', 'sk-anthropic-key-12345');

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
      expect(openaiKey).toBe('sk-openai-key-12345');
    });

    it('should handle update with no existing keys', async () => {
      await manager.updateStorage({
        type: 'memory',
        encrypt: true,
      });

      // Should not throw and should accept new keys
      await manager.setKey('openai', 'sk-test-key-12345');
      expect(await manager.hasKey('openai')).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit key:set event when key is stored', async () => {
      const listener = vi.fn();
      events.on('key:set', listener);

      await manager.setKey('openai', 'sk-test-key-12345');

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].provider).toBe('openai');
    });

    it('should emit key:remove event when key is removed', async () => {
      const listener = vi.fn();
      events.on('key:remove', listener);

      await manager.setKey('openai', 'sk-test-key-12345');
      await manager.removeKey('openai');

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].provider).toBe('openai');
    });
  });
});

