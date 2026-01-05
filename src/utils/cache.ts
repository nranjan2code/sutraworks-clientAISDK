/**
 * Response caching for AI requests
 * Enhanced with cryptographic hashing and LRU eviction
 * @module utils/cache
 */

import type { CacheEntry, CacheOptions, ChatRequest, CompletionRequest } from '../types';

/**
 * Generate a cryptographic cache key from a request using SHA-256
 * This is async because it uses Web Crypto API
 */
export async function generateCacheKeyAsync(request: ChatRequest | CompletionRequest): Promise<string> {
  // Create a deterministic key from request parameters
  const keyParts = {
    provider: request.provider,
    model: request.model,
    temperature: request.temperature ?? 'default',
    max_tokens: request.max_tokens ?? 'default',
    top_p: request.top_p ?? 'default',
    content: 'messages' in request 
      ? JSON.stringify(request.messages)
      : (request as CompletionRequest).prompt,
  };

  const keyString = JSON.stringify(keyParts);
  
  // Use SHA-256 for collision-resistant hashing
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(keyString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback to improved hash if crypto not available
  return fallbackHash(keyString);
}

/**
 * Synchronous cache key generation (for backward compatibility)
 * Uses fallback hash when async not possible
 */
export function generateCacheKey(request: ChatRequest | CompletionRequest): string {
  const keyParts = {
    provider: request.provider,
    model: request.model,
    temperature: request.temperature ?? 'default',
    max_tokens: request.max_tokens ?? 'default',
    top_p: request.top_p ?? 'default',
    content: 'messages' in request 
      ? JSON.stringify(request.messages)
      : (request as CompletionRequest).prompt,
  };

  return fallbackHash(JSON.stringify(keyParts));
}

/**
 * Improved fallback hash function using FNV-1a
 * Better distribution than simple djb2 hash
 */
function fallbackHash(str: string): string {
  // FNV-1a hash - better distribution
  let hash1 = 2166136261;
  let hash2 = 2166136261;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // First hash
    hash1 ^= char;
    hash1 = Math.imul(hash1, 16777619);
    // Second hash with different seed
    hash2 ^= char;
    hash2 = Math.imul(hash2, 2654435761);
  }
  
  // Combine both hashes for better collision resistance
  const combined = (hash1 >>> 0).toString(36) + (hash2 >>> 0).toString(36);
  return combined;
}

/**
 * Estimate size of an object in bytes
 */
function estimateSize(obj: unknown): number {
  const str = JSON.stringify(obj);
  // UTF-16 uses 2 bytes per character, but JSON is usually ASCII
  return str.length * 2;
}

/**
 * LRU node for doubly-linked list
 */
interface LRUNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}

/**
 * In-memory cache implementation with LRU eviction
 * Uses doubly-linked list for O(1) LRU operations
 */
export class MemoryCache<T> {
  private cache: Map<string, LRUNode<T>> = new Map();
  private head: LRUNode<T> | null = null;
  private tail: LRUNode<T> | null = null;
  private readonly maxEntries: number;
  private readonly maxSize: number;
  private readonly ttl?: number;
  private currentSize: number = 0;

  constructor(options?: { maxEntries?: number; maxSize?: number; ttl?: number }) {
    this.maxEntries = options?.maxEntries ?? 100;
    this.maxSize = options?.maxSize ?? 50 * 1024 * 1024; // 50MB default
    this.ttl = options?.ttl;
  }

  /**
   * Move node to front (most recently used)
   */
  private moveToFront(node: LRUNode<T>): void {
    if (node === this.head) return;

    // Remove from current position
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.tail) this.tail = node.prev;

    // Add to front
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  /**
   * Remove node from list
   */
  private removeNode(node: LRUNode<T>): void {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.head) this.head = node.next;
    if (node === this.tail) this.tail = node.prev;
    
    this.currentSize -= node.entry.size ?? 0;
    this.cache.delete(node.key);
  }

  /**
   * Get a cached value
   */
  get(key: string): T | null {
    const node = this.cache.get(key);
    
    if (!node) {
      return null;
    }

    // Check expiration
    if (node.entry.expiresAt && Date.now() > node.entry.expiresAt) {
      this.removeNode(node);
      return null;
    }

    // Update hits and move to front (LRU)
    node.entry.hits++;
    this.moveToFront(node);
    
    return node.entry.value;
  }

  /**
   * Set a cached value
   */
  set(key: string, value: T, ttl?: number): void {
    const size = estimateSize(value);
    const effectiveTtl = ttl ?? this.ttl;
    
    // Check if updating existing entry
    const existingNode = this.cache.get(key);
    if (existingNode) {
      this.currentSize -= existingNode.entry.size ?? 0;
      existingNode.entry = {
        key,
        value,
        createdAt: Date.now(),
        expiresAt: effectiveTtl ? Date.now() + effectiveTtl : undefined,
        hits: existingNode.entry.hits,
        size,
      };
      this.currentSize += size;
      this.moveToFront(existingNode);
      return;
    }

    // Evict if needed (by count or size)
    while (
      (this.cache.size >= this.maxEntries || this.currentSize + size > this.maxSize) && 
      this.tail
    ) {
      this.removeNode(this.tail);
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      expiresAt: effectiveTtl ? Date.now() + effectiveTtl : undefined,
      hits: 0,
      size,
    };

    const node: LRUNode<T> = {
      key,
      entry,
      prev: null,
      next: this.head,
    };

    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;

    this.cache.set(key, node);
    this.currentSize += size;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (node) {
      this.removeNode(node);
      return true;
    }
    return false;
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get current memory usage in bytes
   */
  memoryUsage(): number {
    return this.currentSize;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [, node] of this.cache) {
      if (node.entry.expiresAt && now > node.entry.expiresAt) {
        this.removeNode(node);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): { 
    size: number; 
    totalHits: number; 
    avgHits: number;
    memoryUsage: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let totalHits = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const node of this.cache.values()) {
      totalHits += node.entry.hits;
      if (oldestEntry === null || node.entry.createdAt < oldestEntry) {
        oldestEntry = node.entry.createdAt;
      }
      if (newestEntry === null || node.entry.createdAt > newestEntry) {
        newestEntry = node.entry.createdAt;
      }
    }

    return {
      size: this.cache.size,
      totalHits,
      avgHits: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      memoryUsage: this.currentSize,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Iterate over entries (most to least recently used)
   */
  *entries(): Generator<[string, T]> {
    let current = this.head;
    while (current) {
      yield [current.key, current.entry.value];
      current = current.next;
    }
  }
}

/**
 * IndexedDB cache implementation
 * Enhanced with better error handling and batch operations
 */
export class IndexedDBCache<T> {
  private readonly dbName: string;
  private readonly storeName = 'cache';
  private readonly maxEntries: number;
  private readonly maxSize: number;
  private readonly ttl?: number;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  constructor(options?: { dbName?: string; maxEntries?: number; maxSize?: number; ttl?: number }) {
    this.dbName = options?.dbName ?? 'sutra_cache';
    this.maxEntries = options?.maxEntries ?? 100;
    this.maxSize = options?.maxSize ?? 100 * 1024 * 1024; // 100MB default
    this.ttl = options?.ttl;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    
    // Prevent multiple simultaneous init attempts
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available'));
        return;
      }

      const request = indexedDB.open(this.dbName, 2);

      request.onerror = () => {
        this.initPromise = null;
        reject(new Error('Failed to open cache database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        // Handle database close/error
        this.db.onclose = () => {
          this.db = null;
          this.initPromise = null;
        };
        
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Delete old store if exists
        if (db.objectStoreNames.contains(this.storeName)) {
          db.deleteObjectStore(this.storeName);
        }
        
        const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('expiresAt', 'expiresAt');
        store.createIndex('size', 'size');
      };
    });

    return this.initPromise;
  }

  async get(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => reject(new Error('Failed to get cached value'));

        request.onsuccess = async () => {
          const entry = request.result as CacheEntry<T> | undefined;
          
          if (!entry) {
            resolve(null);
            return;
          }

          // Check expiration
          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            await this.delete(key);
            resolve(null);
            return;
          }

          // Update hits in background (don't wait)
          this.updateHits(key, entry.hits + 1).catch(() => {});

          resolve(entry.value);
        };
      });
    } catch {
      return null;
    }
  }

  private async updateHits(key: string, hits: number): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.hits = hits;
          store.put(entry);
        }
        resolve();
      };

      getRequest.onerror = () => reject();
    });
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const db = await this.getDB();
    const size = estimateSize(value);

    // Check size and evict if needed
    const currentSize = await this.getTotalSize();
    const count = await this.size();
    
    if (count >= this.maxEntries || currentSize + size > this.maxSize) {
      await this.evictOldest(Math.max(1, Math.floor(this.maxEntries * 0.1)));
    }

    const effectiveTtl = ttl ?? this.ttl;

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      expiresAt: effectiveTtl ? Date.now() + effectiveTtl : undefined,
      hits: 0,
      size,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onerror = () => reject(new Error('Failed to cache value'));
      request.onsuccess = () => resolve();
    });
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async delete(key: string): Promise<boolean> {
    try {
      const db = await this.getDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => reject(new Error('Failed to delete cached value'));
        request.onsuccess = () => resolve(true);
      });
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(new Error('Failed to clear cache'));
      request.onsuccess = () => resolve();
    });
  }

  async size(): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onerror = () => reject(new Error('Failed to get cache size'));
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async getTotalSize(): Promise<number> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(new Error('Failed to get total size'));
      request.onsuccess = () => {
        const entries = request.result as CacheEntry<T>[];
        const total = entries.reduce((sum, e) => sum + (e.size ?? 0), 0);
        resolve(total);
      };
    });
  }

  private async evictOldest(count: number = 1): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('createdAt');
      const request = index.openCursor();
      let deleted = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && deleted < count) {
          store.delete(cursor.primaryKey);
          deleted++;
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(new Error('Failed to evict oldest entry'));
    });
  }

  async cleanup(): Promise<number> {
    const db = await this.getDB();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);
      let removed = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          removed++;
          cursor.continue();
        } else {
          resolve(removed);
        }
      };

      request.onerror = () => reject(new Error('Failed to cleanup cache'));
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

/**
 * Create appropriate cache based on options
 */
export function createCache<T>(options: CacheOptions): MemoryCache<T> | IndexedDBCache<T> | null {
  if (!options.enabled) {
    return null;
  }

  const cacheOptions = {
    maxEntries: options.maxEntries,
    maxSize: options.maxSize,
    ttl: options.ttl,
  };

  if (options.storage === 'indexedDB') {
    return new IndexedDBCache<T>(cacheOptions);
  }

  return new MemoryCache<T>(cacheOptions);
}
