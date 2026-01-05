/**
 * Secure key storage for Sutraworks Client AI SDK
 * @module keys/storage
 */

import type { KeyStorageOptions, StoredKeyMeta, ProviderName } from '../types';
import { SutraError } from '../types';
import { Encryption } from './encryption';

/**
 * Interface for key storage implementations
 */
export interface IKeyStorage {
  set(provider: ProviderName, key: string): Promise<void>;
  get(provider: ProviderName): Promise<string | null>;
  remove(provider: ProviderName): Promise<void>;
  has(provider: ProviderName): Promise<boolean>;
  clear(): Promise<void>;
  list(): Promise<ProviderName[]>;
  getMeta(provider: ProviderName): Promise<StoredKeyMeta | null>;
}

/**
 * In-memory key storage (most secure, cleared on page refresh)
 */
export class MemoryStorage implements IKeyStorage {
  private keys: Map<ProviderName, string> = new Map();
  private meta: Map<ProviderName, StoredKeyMeta> = new Map();
  private encryptionKey: CryptoKey | null = null;
  private readonly encrypt: boolean;

  constructor(options?: { encrypt?: boolean }) {
    this.encrypt = options?.encrypt ?? false;
  }

  private async ensureEncryptionKey(): Promise<CryptoKey> {
    if (!this.encryptionKey) {
      this.encryptionKey = await Encryption.generateKey();
    }
    return this.encryptionKey;
  }

  async set(provider: ProviderName, key: string): Promise<void> {
    let storedKey = key;
    
    if (this.encrypt) {
      const encKey = await this.ensureEncryptionKey();
      storedKey = await Encryption.encrypt(key, encKey);
    }

    this.keys.set(provider, storedKey);
    this.meta.set(provider, {
      provider,
      createdAt: Date.now(),
      encrypted: this.encrypt,
    });
  }

  async get(provider: ProviderName): Promise<string | null> {
    const storedKey = this.keys.get(provider);
    if (!storedKey) return null;

    const meta = this.meta.get(provider);
    if (meta) {
      meta.lastUsedAt = Date.now();
    }

    if (this.encrypt && this.encryptionKey) {
      return Encryption.decrypt(storedKey, this.encryptionKey);
    }

    return storedKey;
  }

  async remove(provider: ProviderName): Promise<void> {
    this.keys.delete(provider);
    this.meta.delete(provider);
  }

  async has(provider: ProviderName): Promise<boolean> {
    return this.keys.has(provider);
  }

  async clear(): Promise<void> {
    this.keys.clear();
    this.meta.clear();
    this.encryptionKey = null;
  }

  async list(): Promise<ProviderName[]> {
    return Array.from(this.keys.keys());
  }

  async getMeta(provider: ProviderName): Promise<StoredKeyMeta | null> {
    return this.meta.get(provider) ?? null;
  }
}

/**
 * localStorage-based key storage (persists across sessions)
 */
export class LocalStorageImpl implements IKeyStorage {
  private readonly prefix: string;
  private readonly encrypt: boolean;
  private readonly password?: string;

  constructor(options?: { prefix?: string; encrypt?: boolean; encryptionKey?: string }) {
    this.prefix = options?.prefix ?? 'sutra_key_';
    this.encrypt = options?.encrypt ?? false;
    this.password = options?.encryptionKey;

    if (!this.isAvailable()) {
      throw new SutraError('localStorage is not available', 'STORAGE_ERROR');
    }
  }

  private isAvailable(): boolean {
    try {
      const test = '__sutra_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getStorageKey(provider: ProviderName): string {
    return `${this.prefix}${provider}`;
  }

  private getMetaKey(provider: ProviderName): string {
    return `${this.prefix}${provider}_meta`;
  }

  async set(provider: ProviderName, key: string): Promise<void> {
    let storedKey = key;

    if (this.encrypt) {
      if (this.password) {
        storedKey = await Encryption.encryptWithPassword(key, this.password);
      } else {
        throw new SutraError(
          'Encryption enabled but no encryption key provided',
          'ENCRYPTION_ERROR'
        );
      }
    }

    const meta: StoredKeyMeta = {
      provider,
      createdAt: Date.now(),
      encrypted: this.encrypt,
    };

    localStorage.setItem(this.getStorageKey(provider), storedKey);
    localStorage.setItem(this.getMetaKey(provider), JSON.stringify(meta));
  }

  async get(provider: ProviderName): Promise<string | null> {
    const storedKey = localStorage.getItem(this.getStorageKey(provider));
    if (!storedKey) return null;

    // Update last used
    const metaStr = localStorage.getItem(this.getMetaKey(provider));
    if (metaStr) {
      try {
        const meta: StoredKeyMeta = JSON.parse(metaStr);
        meta.lastUsedAt = Date.now();
        localStorage.setItem(this.getMetaKey(provider), JSON.stringify(meta));
      } catch {
        // Ignore meta update errors
      }
    }

    if (this.encrypt && this.password) {
      return Encryption.decryptWithPassword(storedKey, this.password);
    }

    return storedKey;
  }

  async remove(provider: ProviderName): Promise<void> {
    localStorage.removeItem(this.getStorageKey(provider));
    localStorage.removeItem(this.getMetaKey(provider));
  }

  async has(provider: ProviderName): Promise<boolean> {
    return localStorage.getItem(this.getStorageKey(provider)) !== null;
  }

  async clear(): Promise<void> {
    const keys = await this.list();
    for (const provider of keys) {
      await this.remove(provider);
    }
  }

  async list(): Promise<ProviderName[]> {
    const providers: ProviderName[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix) && !key.endsWith('_meta')) {
        providers.push(key.slice(this.prefix.length) as ProviderName);
      }
    }
    return providers;
  }

  async getMeta(provider: ProviderName): Promise<StoredKeyMeta | null> {
    const metaStr = localStorage.getItem(this.getMetaKey(provider));
    if (!metaStr) return null;
    try {
      return JSON.parse(metaStr);
    } catch {
      return null;
    }
  }
}

/**
 * sessionStorage-based key storage (cleared when tab closes)
 */
export class SessionStorageImpl implements IKeyStorage {
  private readonly prefix: string;
  private readonly encrypt: boolean;
  private readonly password?: string;

  constructor(options?: { prefix?: string; encrypt?: boolean; encryptionKey?: string }) {
    this.prefix = options?.prefix ?? 'sutra_key_';
    this.encrypt = options?.encrypt ?? false;
    this.password = options?.encryptionKey;

    if (!this.isAvailable()) {
      throw new SutraError('sessionStorage is not available', 'STORAGE_ERROR');
    }
  }

  private isAvailable(): boolean {
    try {
      const test = '__sutra_test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getStorageKey(provider: ProviderName): string {
    return `${this.prefix}${provider}`;
  }

  private getMetaKey(provider: ProviderName): string {
    return `${this.prefix}${provider}_meta`;
  }

  async set(provider: ProviderName, key: string): Promise<void> {
    let storedKey = key;

    if (this.encrypt) {
      if (this.password) {
        storedKey = await Encryption.encryptWithPassword(key, this.password);
      } else {
        throw new SutraError(
          'Encryption enabled but no encryption key provided',
          'ENCRYPTION_ERROR'
        );
      }
    }

    const meta: StoredKeyMeta = {
      provider,
      createdAt: Date.now(),
      encrypted: this.encrypt,
    };

    sessionStorage.setItem(this.getStorageKey(provider), storedKey);
    sessionStorage.setItem(this.getMetaKey(provider), JSON.stringify(meta));
  }

  async get(provider: ProviderName): Promise<string | null> {
    const storedKey = sessionStorage.getItem(this.getStorageKey(provider));
    if (!storedKey) return null;

    // Update last used
    const metaStr = sessionStorage.getItem(this.getMetaKey(provider));
    if (metaStr) {
      try {
        const meta: StoredKeyMeta = JSON.parse(metaStr);
        meta.lastUsedAt = Date.now();
        sessionStorage.setItem(this.getMetaKey(provider), JSON.stringify(meta));
      } catch {
        // Ignore meta update errors
      }
    }

    if (this.encrypt && this.password) {
      return Encryption.decryptWithPassword(storedKey, this.password);
    }

    return storedKey;
  }

  async remove(provider: ProviderName): Promise<void> {
    sessionStorage.removeItem(this.getStorageKey(provider));
    sessionStorage.removeItem(this.getMetaKey(provider));
  }

  async has(provider: ProviderName): Promise<boolean> {
    return sessionStorage.getItem(this.getStorageKey(provider)) !== null;
  }

  async clear(): Promise<void> {
    const keys = await this.list();
    for (const provider of keys) {
      await this.remove(provider);
    }
  }

  async list(): Promise<ProviderName[]> {
    const providers: ProviderName[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(this.prefix) && !key.endsWith('_meta')) {
        providers.push(key.slice(this.prefix.length) as ProviderName);
      }
    }
    return providers;
  }

  async getMeta(provider: ProviderName): Promise<StoredKeyMeta | null> {
    const metaStr = sessionStorage.getItem(this.getMetaKey(provider));
    if (!metaStr) return null;
    try {
      return JSON.parse(metaStr);
    } catch {
      return null;
    }
  }
}

/**
 * IndexedDB-based key storage (persistent, larger storage)
 */
export class IndexedDBStorage implements IKeyStorage {
  private readonly dbName: string;
  private readonly storeName: string = 'keys';
  private readonly encrypt: boolean;
  private readonly password?: string;
  private db: IDBDatabase | null = null;

  constructor(options?: { prefix?: string; encrypt?: boolean; encryptionKey?: string }) {
    this.dbName = `${options?.prefix ?? 'sutra_'}keystore`;
    this.encrypt = options?.encrypt ?? false;
    this.password = options?.encryptionKey;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        reject(new SutraError('Failed to open IndexedDB', 'STORAGE_ERROR'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'provider' });
        }
      };
    });
  }

  async set(provider: ProviderName, key: string): Promise<void> {
    let storedKey = key;

    if (this.encrypt) {
      if (this.password) {
        storedKey = await Encryption.encryptWithPassword(key, this.password);
      } else {
        throw new SutraError(
          'Encryption enabled but no encryption key provided',
          'ENCRYPTION_ERROR'
        );
      }
    }

    const db = await this.getDB();
    const data = {
      provider,
      key: storedKey,
      createdAt: Date.now(),
      encrypted: this.encrypt,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(data);

      request.onerror = () => {
        reject(new SutraError('Failed to store key', 'STORAGE_ERROR'));
      };

      request.onsuccess = () => resolve();
    });
  }

  async get(provider: ProviderName): Promise<string | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(provider);

      request.onerror = () => {
        reject(new SutraError('Failed to retrieve key', 'STORAGE_ERROR'));
      };

      request.onsuccess = async () => {
        const data = request.result;
        if (!data) {
          resolve(null);
          return;
        }

        try {
          if (this.encrypt && this.password) {
            const decrypted = await Encryption.decryptWithPassword(data.key, this.password);
            resolve(decrypted);
          } else {
            resolve(data.key);
          }
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  async remove(provider: ProviderName): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(provider);

      request.onerror = () => {
        reject(new SutraError('Failed to remove key', 'STORAGE_ERROR'));
      };

      request.onsuccess = () => resolve();
    });
  }

  async has(provider: ProviderName): Promise<boolean> {
    const key = await this.get(provider);
    return key !== null;
  }

  async clear(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => {
        reject(new SutraError('Failed to clear keys', 'STORAGE_ERROR'));
      };

      request.onsuccess = () => resolve();
    });
  }

  async list(): Promise<ProviderName[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => {
        reject(new SutraError('Failed to list keys', 'STORAGE_ERROR'));
      };

      request.onsuccess = () => {
        resolve(request.result as ProviderName[]);
      };
    });
  }

  async getMeta(provider: ProviderName): Promise<StoredKeyMeta | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(provider);

      request.onerror = () => {
        reject(new SutraError('Failed to retrieve key meta', 'STORAGE_ERROR'));
      };

      request.onsuccess = () => {
        const data = request.result;
        if (!data) {
          resolve(null);
          return;
        }

        resolve({
          provider: data.provider,
          createdAt: data.createdAt,
          lastUsedAt: data.lastUsedAt,
          encrypted: data.encrypted,
        });
      };
    });
  }
}

/**
 * Create appropriate storage based on options
 */
export function createStorage(options: KeyStorageOptions): IKeyStorage {
  const storageOptions = {
    prefix: options.prefix,
    encrypt: options.encrypt,
    encryptionKey: options.encryptionKey,
  };

  switch (options.type) {
    case 'memory':
      return new MemoryStorage({ encrypt: options.encrypt });
    case 'localStorage':
      return new LocalStorageImpl(storageOptions);
    case 'sessionStorage':
      return new SessionStorageImpl(storageOptions);
    case 'indexedDB':
      return new IndexedDBStorage(storageOptions);
    default:
      return new MemoryStorage({ encrypt: options.encrypt });
  }
}
