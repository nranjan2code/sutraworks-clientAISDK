/**
 * Tests for encryption utilities
 * @module keys/encryption.test
 */

import { describe, it, expect } from 'vitest';
import { Encryption } from './encryption';

describe('Encryption', () => {
  describe('isAvailable', () => {
    it('should return true when Web Crypto API is available', () => {
      expect(Encryption.isAvailable()).toBe(true);
    });
  });

  describe('generateKey', () => {
    it('should generate a CryptoKey', async () => {
      const key = await Encryption.generateKey();
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
    });
  });

  describe('deriveKey', () => {
    it('should derive a key from password', async () => {
      const { key, salt } = await Encryption.deriveKey('my-secure-password-123');
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(salt).toBeDefined();
      expect(salt.length).toBe(32); // SALT_LENGTH
    });

    it('should use provided salt', async () => {
      const customSalt = new Uint8Array(32).fill(1);
      const { salt } = await Encryption.deriveKey('password123', customSalt);
      expect(salt).toEqual(customSalt);
    });

    it('should reject short passwords', async () => {
      await expect(Encryption.deriveKey('short')).rejects.toThrow(
        'Password must be at least 8 characters'
      );
    });

    it('should reject empty passwords', async () => {
      await expect(Encryption.deriveKey('')).rejects.toThrow();
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data', async () => {
      const key = await Encryption.generateKey();
      const plaintext = 'Hello, World!';

      const encrypted = await Encryption.encrypt(plaintext, key);
      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(plaintext.length);

      const decrypted = await Encryption.decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', async () => {
      const key = await Encryption.generateKey();
      const plaintext = '你好世界 🌍 مرحبا';

      const encrypted = await Encryption.encrypt(plaintext, key);
      const decrypted = await Encryption.decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', async () => {
      const key = await Encryption.generateKey();
      const plaintext = 'a'.repeat(10000);

      const encrypted = await Encryption.encrypt(plaintext, key);
      const decrypted = await Encryption.decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const key = await Encryption.generateKey();
      const plaintext = 'Same message';

      const encrypted1 = await Encryption.encrypt(plaintext, key);
      const encrypted2 = await Encryption.encrypt(plaintext, key);

      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should fail to decrypt with wrong key', async () => {
      const key1 = await Encryption.generateKey();
      const key2 = await Encryption.generateKey();
      const plaintext = 'Secret message';

      const encrypted = await Encryption.encrypt(plaintext, key1);

      await expect(Encryption.decrypt(encrypted, key2)).rejects.toThrow();
    });

    it('should fail to decrypt corrupted data', async () => {
      const key = await Encryption.generateKey();
      const plaintext = 'Secret message';

      const encrypted = await Encryption.encrypt(plaintext, key);
      // Corrupt the ciphertext
      const corrupted = encrypted.slice(0, -10) + 'CORRUPTED!';

      await expect(Encryption.decrypt(corrupted, key)).rejects.toThrow();
    });

    it('should reject empty data', async () => {
      const key = await Encryption.generateKey();
      await expect(Encryption.encrypt('', key)).rejects.toThrow('Cannot encrypt empty data');
    });
  });

  describe('encryptWithPassword and decryptWithPassword', () => {
    it('should encrypt and decrypt with password', async () => {
      const password = 'my-secure-password-123';
      const plaintext = 'Secret data';

      const encrypted = await Encryption.encryptWithPassword(plaintext, password);
      expect(encrypted).toBeDefined();

      const decrypted = await Encryption.decryptWithPassword(encrypted, password);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail with wrong password', async () => {
      const plaintext = 'Secret data';
      const encrypted = await Encryption.encryptWithPassword(plaintext, 'correct-password');

      await expect(
        Encryption.decryptWithPassword(encrypted, 'wrong-password')
      ).rejects.toThrow();
    });

    it('should handle special characters in password', async () => {
      const password = 'p@$$w0rd!#%^&*()_+-={}[]|:";\'<>?,./~`';
      const plaintext = 'Secret data';

      const encrypted = await Encryption.encryptWithPassword(plaintext, password);
      const decrypted = await Encryption.decryptWithPassword(encrypted, password);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('hash', () => {
    it('should hash data with SHA-256', async () => {
      const hash = await Encryption.hash('test data');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce same hash for same input', async () => {
      const hash1 = await Encryption.hash('same data');
      const hash2 = await Encryption.hash('same data');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', async () => {
      const hash1 = await Encryption.hash('data1');
      const hash2 = await Encryption.hash('data2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('fingerprint', () => {
    it('should generate fingerprint', async () => {
      const fp = await Encryption.fingerprint('test data');
      expect(fp).toBeDefined();
      expect(typeof fp).toBe('string');
    });
  });

  describe('secureCompare', () => {
    it('should compare equal strings correctly', () => {
      expect(Encryption.secureCompare('abc123', 'abc123')).toBe(true);
    });

    it('should compare different strings correctly', () => {
      expect(Encryption.secureCompare('abc123', 'xyz789')).toBe(false);
    });

    it('should handle different length strings', () => {
      expect(Encryption.secureCompare('short', 'much longer string')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(Encryption.secureCompare('', '')).toBe(true);
      expect(Encryption.secureCompare('', 'nonempty')).toBe(false);
    });
  });

  describe('generateRandomString', () => {
    it('should generate string', () => {
      const str = Encryption.generateRandomString(32);
      expect(str).toBeDefined();
      expect(str.length).toBeGreaterThan(0);
    });

    it('should generate unique strings', () => {
      const str1 = Encryption.generateRandomString(32);
      const str2 = Encryption.generateRandomString(32);
      expect(str1).not.toBe(str2);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = Encryption.generateUUID();
      // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = Encryption.generateUUID();
      const uuid2 = Encryption.generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('wipe', () => {
    it('should zero out buffer', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      Encryption.wipe(buffer);
      expect(buffer.every((b) => b === 0)).toBe(true);
    });
  });
});
