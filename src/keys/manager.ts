/**
 * Key management for Sutraworks Client AI SDK v2.0
 * Enhanced with race condition fixes and fallback storage
 * @module keys/manager
 */

import type { ProviderName, KeyStorageOptions, StoredKeyMeta } from '../types';
import { SutraError } from '../types';
import { createStorage, IKeyStorage, MemoryStorage } from './storage';
import { EventEmitter, EventFactory } from '../utils/events';
import { Encryption } from './encryption';

/**
 * Simple mutex implementation for async operations
 * Guarantees mutual exclusion using a queue-based approach
 */
class AsyncMutex {
  private locked = false;
  private readonly queue: Array<(release: () => void) => void> = [];

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        // Lock is free, acquire immediately
        this.locked = true;
        resolve(() => this.release());
      } else {
        // Lock is held, queue this waiter
        this.queue.push(resolve);
      }
    });
  }

  private release(): void {
    const next = this.queue.shift();
    if (next) {
      // Transfer lock to next waiter (lock stays true)
      next(() => this.release());
    } else {
      // No waiters, unlock
      this.locked = false;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }
}

/**
 * Manages API keys for all providers
 * Keys are stored client-side and never sent to any server
 * 
 * Security features:
 * - Keys stored only in browser memory/storage
 * - Optional encryption at rest
 * - Auto-clear timers with race condition protection
 * - Fallback storage on failure
 * - Thread-safe operations using mutex locks
 */
export class KeyManager {
  private storage: IKeyStorage;
  private fallbackStorage: IKeyStorage | null = null;
  private events: EventEmitter;
  private autoClearTimers: Map<ProviderName, ReturnType<typeof setTimeout>> = new Map();
  private readonly autoClearAfter?: number;
  private currentOptions: KeyStorageOptions;
  private readonly keyLocks: Map<ProviderName, AsyncMutex> = new Map();
  private readonly globalLock = new AsyncMutex();

  constructor(options: KeyStorageOptions, events: EventEmitter) {
    this.currentOptions = { ...options };
    this.events = events;
    this.autoClearAfter = this.currentOptions.autoClearAfter;

    // Create primary storage with fallback
    try {
      this.storage = createStorage(options);
    } catch (error) {
      // Fall back to memory storage if primary fails
      console.warn('Primary storage failed, falling back to memory storage:', error);
      this.storage = new MemoryStorage({ encrypt: options.encrypt });
    }

    // Create fallback storage if specified
    if (options.fallback && options.fallback !== options.type) {
      try {
        this.fallbackStorage = createStorage({
          ...options,
          type: options.fallback,
        });
      } catch {
        // Ignore fallback creation errors
      }
    }
  }

  /**
   * Get or create mutex for a specific provider
   * Uses global lock to ensure atomic mutex creation
   */
  private async getMutex(provider: ProviderName): Promise<AsyncMutex> {
    let mutex = this.keyLocks.get(provider);
    if (!mutex) {
      // Use global lock to prevent race condition on mutex creation
      const releaseGlobal = await this.globalLock.acquire();
      try {
        // Double-check after acquiring global lock
        mutex = this.keyLocks.get(provider);
        if (!mutex) {
          mutex = new AsyncMutex();
          this.keyLocks.set(provider, mutex);
        }
      } finally {
        releaseGlobal();
      }
    }
    return mutex;
  }

  /**
   * Acquire lock for key operations (prevents race conditions)
   * Uses proper mutex pattern for atomic lock acquisition
   */
  private async acquireLock(provider: ProviderName): Promise<() => void> {
    const mutex = await this.getMutex(provider);
    return mutex.acquire();
  }

  /**
   * Set an API key for a provider
   * @param provider - Provider identifier
   * @param key - API key (never logged or transmitted)
   */
  async setKey(provider: ProviderName, key: string): Promise<void> {
    // Validate key
    if (!key || typeof key !== 'string') {
      throw new SutraError('Invalid API key', 'KEY_INVALID', { provider });
    }

    if (key.length < 10) {
      throw new SutraError('API key appears too short', 'KEY_INVALID', { provider });
    }

    // Acquire lock to prevent race conditions
    const releaseLock = await this.acquireLock(provider);

    try {
      // Clear any existing auto-clear timer FIRST
      this.clearAutoClearTimer(provider);

      // Store the key
      await this.storage.set(provider, key);

      // Also store in fallback if available
      if (this.fallbackStorage) {
        try {
          await this.fallbackStorage.set(provider, key);
        } catch {
          // Ignore fallback storage errors
        }
      }

      // Set up auto-clear if configured
      if (this.autoClearAfter && this.autoClearAfter > 0) {
        const timer = setTimeout(async () => {
          // Verify this timer hasn't been superseded
          if (this.autoClearTimers.get(provider) === timer) {
            await this.removeKey(provider);
            this.events.emit(EventFactory.keyExpired(provider));
          }
        }, this.autoClearAfter);

        this.autoClearTimers.set(provider, timer);
      }

      // Emit event (never includes the actual key)
      this.events.emit(EventFactory.keySet(provider));
    } finally {
      releaseLock();
    }
  }

  /**
   * Get an API key for a provider
   * @param provider - Provider identifier
   * @returns The API key or null if not set
   */
  async getKey(provider: ProviderName): Promise<string | null> {
    try {
      const key = await this.storage.get(provider);
      if (key) return key;
    } catch (error) {
      // Try fallback storage
      if (this.fallbackStorage) {
        try {
          return await this.fallbackStorage.get(provider);
        } catch {
          // Both failed
        }
      }
    }

    // Try fallback storage
    if (this.fallbackStorage) {
      try {
        const key = await this.fallbackStorage.get(provider);
        if (key) {
          // Restore to primary storage
          try {
            await this.storage.set(provider, key);
          } catch {
            // Ignore primary restore errors
          }
          return key;
        }
      } catch {
        // Fallback also failed
      }
    }

    return null;
  }

  /**
   * Check if a key is set for a provider
   * @param provider - Provider identifier
   */
  async hasKey(provider: ProviderName): Promise<boolean> {
    try {
      return await this.storage.has(provider);
    } catch {
      // Try fallback
      if (this.fallbackStorage) {
        try {
          return await this.fallbackStorage.has(provider);
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Remove an API key for a provider
   * @param provider - Provider identifier
   */
  async removeKey(provider: ProviderName): Promise<void> {
    const releaseLock = await this.acquireLock(provider);

    try {
      this.clearAutoClearTimer(provider);
      
      await this.storage.remove(provider);
      
      if (this.fallbackStorage) {
        try {
          await this.fallbackStorage.remove(provider);
        } catch {
          // Ignore fallback errors
        }
      }

      this.events.emit(EventFactory.keyRemove(provider));
    } finally {
      releaseLock();
    }
  }

  /**
   * Clear all stored API keys
   */
  async clearAllKeys(): Promise<void> {
    // Clear all auto-clear timers
    for (const timer of this.autoClearTimers.values()) {
      clearTimeout(timer);
    }
    this.autoClearTimers.clear();

    // Get list of providers before clearing
    let providers: ProviderName[] = [];
    try {
      providers = await this.storage.list();
    } catch {
      // Ignore list errors
    }

    // Clear storage
    try {
      await this.storage.clear();
    } catch {
      // Ignore clear errors
    }

    if (this.fallbackStorage) {
      try {
        await this.fallbackStorage.clear();
      } catch {
        // Ignore fallback errors
      }
    }

    // Clear key locks
    this.keyLocks.clear();

    // Emit events for each removed key
    for (const provider of providers) {
      this.events.emit(EventFactory.keyRemove(provider));
    }
  }

  /**
   * List all providers with stored keys
   */
  async listProviders(): Promise<ProviderName[]> {
    const providers = new Set<ProviderName>();

    try {
      const primaryList = await this.storage.list();
      primaryList.forEach(p => providers.add(p));
    } catch {
      // Ignore primary errors
    }

    if (this.fallbackStorage) {
      try {
        const fallbackList = await this.fallbackStorage.list();
        fallbackList.forEach(p => providers.add(p));
      } catch {
        // Ignore fallback errors
      }
    }

    return Array.from(providers);
  }

  /**
   * Get metadata for a stored key
   * @param provider - Provider identifier
   */
  async getKeyMeta(provider: ProviderName): Promise<StoredKeyMeta | null> {
    try {
      return await this.storage.getMeta(provider);
    } catch {
      if (this.fallbackStorage) {
        try {
          return await this.fallbackStorage.getMeta(provider);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Validate that a key is set for a provider
   * @throws SutraError if key is not set
   */
  async requireKey(provider: ProviderName): Promise<string> {
    const key = await this.getKey(provider);
    if (!key) {
      throw new SutraError(
        `API key not set for provider: ${provider}. Use ai.setKey('${provider}', 'your-key') to set it.`,
        'KEY_NOT_SET',
        { provider }
      );
    }
    return key;
  }

  /**
   * Set multiple keys at once
   */
  async setKeys(keys: Partial<Record<ProviderName, string>>): Promise<void> {
    const promises = Object.entries(keys)
      .filter(([, key]) => key)
      .map(([provider, key]) => this.setKey(provider as ProviderName, key as string));
    
    await Promise.all(promises);
  }

  /**
   * Clear auto-clear timer for a provider
   */
  private clearAutoClearTimer(provider: ProviderName): void {
    const timer = this.autoClearTimers.get(provider);
    if (timer) {
      clearTimeout(timer);
      this.autoClearTimers.delete(provider);
    }
  }

  /**
   * Update storage options (creates new storage instance)
   */
  async updateStorage(options: KeyStorageOptions): Promise<void> {
    // Get current keys
    const providers = await this.listProviders();
    const keys: Record<string, string> = {};

    for (const provider of providers) {
      const key = await this.getKey(provider);
      if (key) {
        keys[provider] = key;
      }
    }

    // Create new storage with fallback handling
    try {
      this.storage = createStorage(options);
    } catch (error) {
      console.warn('New storage creation failed, falling back to memory:', error);
      this.storage = new MemoryStorage({ encrypt: options.encrypt });
    }

    // Update fallback storage
    if (options.fallback && options.fallback !== options.type) {
      try {
        this.fallbackStorage = createStorage({
          ...options,
          type: options.fallback,
        });
      } catch {
        this.fallbackStorage = null;
      }
    } else {
      this.fallbackStorage = null;
    }

    // Restore keys to new storage
    for (const [provider, key] of Object.entries(keys)) {
      try {
        await this.storage.set(provider as ProviderName, key);
        if (this.fallbackStorage) {
          try {
            await this.fallbackStorage.set(provider as ProviderName, key);
          } catch {
            // Ignore fallback errors
          }
        }
      } catch (error) {
        console.warn(`Failed to migrate key for ${provider}:`, error);
      }
    }
  }

  /**
   * Get key fingerprint (for identification without exposing key)
   */
  async getKeyFingerprint(provider: ProviderName): Promise<string | null> {
    const key = await this.getKey(provider);
    if (!key) return null;
    
    return Encryption.fingerprint(key);
  }

  /**
   * Verify a key matches the stored key (without exposing either)
   */
  async verifyKey(provider: ProviderName, keyToVerify: string): Promise<boolean> {
    const storedKey = await this.getKey(provider);
    if (!storedKey) return false;
    
    // Use constant-time comparison
    return Encryption.secureCompare(storedKey, keyToVerify);
  }

  /**
   * Destroy the key manager and clean up resources
   */
  async destroy(): Promise<void> {
    await this.clearAllKeys();
    
    // Clear timers
    for (const timer of this.autoClearTimers.values()) {
      clearTimeout(timer);
    }
    this.autoClearTimers.clear();
    this.keyLocks.clear();
  }
}
