/**
 * Client-side encryption utilities using Web Crypto API
 * Enhanced security with OWASP 2024 recommendations
 * @module keys/encryption
 */

import { SutraError } from '../types';

/**
 * Encryption utilities for secure key storage
 * Uses AES-GCM with Web Crypto API (browser-native)
 * 
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - PBKDF2 with 600,000 iterations (OWASP 2024)
 * - Cryptographically secure random IVs
 * - Secure key derivation with salt
 */
export class Encryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 32; // Increased from 16
  private static readonly ITERATIONS = 600000; // OWASP 2024 recommendation
  private static readonly TAG_LENGTH = 128; // Authentication tag length in bits
  private static readonly VERSION = 2; // Encryption format version

  /**
   * Check if Web Crypto API is available
   */
  static isAvailable(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.getRandomValues !== 'undefined';
  }

  /**
   * Ensure Web Crypto API is available or throw
   */
  private static ensureAvailable(): void {
    if (!this.isAvailable()) {
      throw new SutraError(
        'Web Crypto API not available. Ensure you are running in a secure context (HTTPS).',
        'ENCRYPTION_ERROR'
      );
    }
  }

  /**
   * Generate a random encryption key
   */
  static async generateKey(): Promise<CryptoKey> {
    this.ensureAvailable();

    return crypto.subtle.generateKey(
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive a key from a password using PBKDF2
   * Uses OWASP 2024 recommended iterations
   */
  static async deriveKey(
    password: string, 
    salt?: Uint8Array,
    iterations: number = this.ITERATIONS
  ): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    this.ensureAvailable();

    if (!password || password.length < 8) {
      throw new SutraError(
        'Password must be at least 8 characters',
        'VALIDATION_ERROR'
      );
    }

    // Generate or use provided salt
    const usedSalt = salt ?? crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));

    // Import password as raw key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES key from password - cast salt to BufferSource
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: usedSalt.buffer as ArrayBuffer,
        iterations,
        hash: 'SHA-512', // Upgraded from SHA-256
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    return { key, salt: usedSalt };
  }

  /**
   * Encrypt data with authenticated encryption
   */
  static async encrypt(data: string, key: CryptoKey): Promise<string> {
    this.ensureAvailable();

    if (!data) {
      throw new SutraError('Cannot encrypt empty data', 'VALIDATION_ERROR');
    }

    try {
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Encrypt data
      const encoded = new TextEncoder().encode(data);
      const ciphertext = await crypto.subtle.encrypt(
        { 
          name: this.ALGORITHM, 
          iv,
          tagLength: this.TAG_LENGTH
        },
        key,
        encoded
      );

      // Combine version + IV + ciphertext
      const combined = new Uint8Array(1 + iv.length + ciphertext.byteLength);
      combined[0] = this.VERSION;
      combined.set(iv, 1);
      combined.set(new Uint8Array(ciphertext), 1 + iv.length);

      // Return base64 encoded
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      throw new SutraError('Encryption failed', 'ENCRYPTION_ERROR', { 
        cause: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Decrypt data with authenticated decryption
   */
  static async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    this.ensureAvailable();

    if (!encryptedData) {
      throw new SutraError('Cannot decrypt empty data', 'VALIDATION_ERROR');
    }

    try {
      // Decode from base64
      const combined = this.base64ToArrayBuffer(encryptedData);

      // Check version
      const version = combined[0];
      if (version !== this.VERSION && version !== 1) {
        throw new SutraError('Unsupported encryption version', 'ENCRYPTION_ERROR');
      }

      // Extract IV and ciphertext
      const iv = combined.slice(1, 1 + this.IV_LENGTH);
      const ciphertext = combined.slice(1 + this.IV_LENGTH);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { 
          name: this.ALGORITHM, 
          iv,
          tagLength: this.TAG_LENGTH
        },
        key,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      if (error instanceof SutraError) throw error;
      throw new SutraError('Decryption failed - data may be corrupted or key is incorrect', 'ENCRYPTION_ERROR', { 
        cause: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * Encrypt with password (combines key derivation and encryption)
   * Format: version:iterations:salt:encryptedData
   */
  static async encryptWithPassword(data: string, password: string): Promise<string> {
    const { key, salt } = await this.deriveKey(password);
    const encrypted = await this.encrypt(data, key);

    // Format: version|iterations|salt|encrypted
    const saltBase64 = this.arrayBufferToBase64(salt);
    return `${this.VERSION}|${this.ITERATIONS}|${saltBase64}|${encrypted}`;
  }

  /**
   * Decrypt with password
   */
  static async decryptWithPassword(encryptedData: string, password: string): Promise<string> {
    const parts = encryptedData.split('|');
    
    // Support legacy format (salt:encrypted)
    if (parts.length === 2) {
      const [saltBase64, encrypted] = parts;
      const salt = this.base64ToArrayBuffer(saltBase64);
      const { key } = await this.deriveKey(password, salt, 100000); // Legacy iterations
      return this.decrypt(encrypted, key);
    }

    if (parts.length !== 4) {
      throw new SutraError('Invalid encrypted data format', 'ENCRYPTION_ERROR');
    }

    const [_version, iterationsStr, saltBase64, encrypted] = parts;
    const iterations = parseInt(iterationsStr, 10);
    
    if (isNaN(iterations) || iterations < 10000) {
      throw new SutraError('Invalid iteration count', 'ENCRYPTION_ERROR');
    }

    const salt = this.base64ToArrayBuffer(saltBase64);
    const { key } = await this.deriveKey(password, salt, iterations);
    return this.decrypt(encrypted, key);
  }

  /**
   * Export key for storage
   */
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(new Uint8Array(exported));
  }

  /**
   * Import key from storage
   */
  static async importKey(keyData: string): Promise<CryptoKey> {
    const raw = this.base64ToArrayBuffer(keyData);
    return crypto.subtle.importKey(
      'raw',
      raw.buffer as ArrayBuffer,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a cryptographic hash of data (for fingerprinting)
   */
  static async hash(data: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
    this.ensureAvailable();
    const encoded = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, encoded);
    return this.arrayBufferToBase64(new Uint8Array(hashBuffer));
  }

  /**
   * Generate a short fingerprint (last 8 chars of hash)
   */
  static async fingerprint(data: string): Promise<string> {
    const fullHash = await this.hash(data);
    return fullHash.slice(-8);
  }

  /**
   * Securely compare two strings (constant-time comparison)
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Generate a random string for session keys
   */
  static generateRandomString(length: number = 32): string {
    this.ensureAvailable();
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a cryptographically secure UUID v4
   */
  static generateUUID(): string {
    this.ensureAvailable();
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Set version to 4
    array[6] = (array[6] & 0x0f) | 0x40;
    // Set variant to RFC4122
    array[8] = (array[8] & 0x3f) | 0x80;
    
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private static arrayBufferToBase64(buffer: Uint8Array): string {
    // Use URL-safe base64
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    // Handle URL-safe base64
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
  }

  /**
   * Securely wipe an ArrayBuffer
   */
  static wipe(buffer: Uint8Array): void {
    crypto.getRandomValues(buffer);
    buffer.fill(0);
  }
}
