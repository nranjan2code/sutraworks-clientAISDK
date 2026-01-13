/**
 * Circular buffer implementation for O(1) time-windowed operations
 * Used for rate limiting and metrics collection
 * @module utils/circular-buffer
 */

/**
 * A fixed-size circular buffer with O(1) push and O(1) amortized cleanup
 * Thread-safe for single-writer scenarios (typical browser/Node.js)
 */
export class CircularBuffer<T> {
    private readonly buffer: (T | undefined)[];
    private head = 0;  // Next write position
    private tail = 0;  // Oldest item position
    private _size = 0;

    /**
     * Create a new circular buffer
     * @param capacity - Maximum number of items the buffer can hold
     */
    constructor(readonly capacity: number) {
        if (capacity <= 0) {
            throw new Error('CircularBuffer capacity must be positive');
        }
        this.buffer = new Array(capacity);
    }

    /**
     * Add an item to the buffer
     * If buffer is full, oldest item is overwritten
     * @param item - Item to add
     * @returns The item that was evicted (if any)
     */
    push(item: T): T | undefined {
        let evicted: T | undefined;

        if (this._size === this.capacity) {
            // Buffer is full, evict oldest
            evicted = this.buffer[this.tail];
            this.tail = (this.tail + 1) % this.capacity;
        } else {
            this._size++;
        }

        this.buffer[this.head] = item;
        this.head = (this.head + 1) % this.capacity;

        return evicted;
    }

    /**
     * Get the oldest item without removing it
     * @returns The oldest item or undefined if empty
     */
    peek(): T | undefined {
        if (this._size === 0) return undefined;
        return this.buffer[this.tail];
    }

    /**
     * Remove and return the oldest item
     * @returns The oldest item or undefined if empty
     */
    shift(): T | undefined {
        if (this._size === 0) return undefined;

        const item = this.buffer[this.tail];
        this.buffer[this.tail] = undefined; // Help GC
        this.tail = (this.tail + 1) % this.capacity;
        this._size--;

        return item;
    }

    /**
     * Remove items from the front that match a predicate
     * Efficient O(k) where k = number of items removed
     * @param shouldRemove - Predicate returning true for items to remove
     * @returns Number of items removed
     */
    removeWhile(shouldRemove: (item: T) => boolean): number {
        let removed = 0;

        while (this._size > 0) {
            const item = this.buffer[this.tail];
            if (item === undefined || !shouldRemove(item)) {
                break;
            }
            this.buffer[this.tail] = undefined; // Help GC
            this.tail = (this.tail + 1) % this.capacity;
            this._size--;
            removed++;
        }

        return removed;
    }

    /**
     * Count items that match a predicate
     * @param predicate - Predicate to test items
     * @returns Count of matching items
     */
    countWhere(predicate: (item: T) => boolean): number {
        let count = 0;
        let pos = this.tail;

        for (let i = 0; i < this._size; i++) {
            const item = this.buffer[pos];
            if (item !== undefined && predicate(item)) {
                count++;
            }
            pos = (pos + 1) % this.capacity;
        }

        return count;
    }

    /**
     * Sum values extracted from items
     * @param extractor - Function to extract numeric value from item
     * @returns Sum of all extracted values
     */
    sum(extractor: (item: T) => number): number {
        let total = 0;
        let pos = this.tail;

        for (let i = 0; i < this._size; i++) {
            const item = this.buffer[pos];
            if (item !== undefined) {
                total += extractor(item);
            }
            pos = (pos + 1) % this.capacity;
        }

        return total;
    }

    /**
     * Iterate over all items (oldest to newest)
     */
    *[Symbol.iterator](): Generator<T> {
        let pos = this.tail;
        for (let i = 0; i < this._size; i++) {
            const item = this.buffer[pos];
            if (item !== undefined) {
                yield item;
            }
            pos = (pos + 1) % this.capacity;
        }
    }

    /**
     * Convert to array (oldest to newest)
     */
    toArray(): T[] {
        const result: T[] = [];
        for (const item of this) {
            result.push(item);
        }
        return result;
    }

    /**
     * Get current number of items
     */
    get size(): number {
        return this._size;
    }

    /**
     * Check if buffer is empty
     */
    get isEmpty(): boolean {
        return this._size === 0;
    }

    /**
     * Check if buffer is full
     */
    get isFull(): boolean {
        return this._size === this.capacity;
    }

    /**
     * Clear all items
     */
    clear(): void {
        this.buffer.fill(undefined);
        this.head = 0;
        this.tail = 0;
        this._size = 0;
    }
}

/**
 * Time-windowed counter using circular buffer
 * Efficiently tracks events within a sliding time window
 */
export class TimeWindowCounter {
    private readonly buffer: CircularBuffer<number>;
    private readonly windowMs: number;

    /**
     * Create a time-windowed counter
     * @param windowMs - Time window in milliseconds
     * @param maxEvents - Maximum events to track (defaults to windowMs to allow 1 event per ms)
     */
    constructor(windowMs: number, maxEvents?: number) {
        this.windowMs = windowMs;
        // Default capacity: assume max 10 events per second
        const capacity = maxEvents ?? Math.ceil((windowMs / 1000) * 10);
        this.buffer = new CircularBuffer<number>(Math.max(capacity, 100));
    }

    /**
     * Record an event at the current time
     */
    record(): void {
        this.cleanup();
        this.buffer.push(Date.now());
    }

    /**
     * Record an event with a custom value at the current time
     */
    recordValue(value: number): void {
        this.cleanup();
        this.buffer.push(value);
    }

    /**
     * Get count of events in the current window
     */
    count(): number {
        this.cleanup();
        return this.buffer.size;
    }

    /**
     * Check if adding an event would exceed a limit
     */
    wouldExceed(limit: number): boolean {
        this.cleanup();
        return this.buffer.size >= limit;
    }

    /**
     * Get time until next event is allowed (assuming limit)
     * @returns milliseconds to wait, or 0 if allowed
     */
    timeUntilAllowed(limit: number): number {
        this.cleanup();

        if (this.buffer.size < limit) {
            return 0;
        }

        const oldest = this.buffer.peek();
        if (oldest === undefined) {
            return 0;
        }

        return Math.max(0, this.windowMs - (Date.now() - oldest));
    }

    /**
     * Remove events older than the window
     */
    private cleanup(): void {
        const cutoff = Date.now() - this.windowMs;
        this.buffer.removeWhile(timestamp => timestamp < cutoff);
    }

    /**
     * Clear all recorded events
     */
    clear(): void {
        this.buffer.clear();
    }
}

/**
 * Token bucket rate limiter
 * More flexible than fixed-window for bursting
 */
export class TokenBucket {
    private tokens: number;
    private lastRefill: number;

    /**
     * Create a token bucket
     * @param capacity - Maximum tokens (burst capacity)
     * @param refillRate - Tokens added per second
     */
    constructor(
        readonly capacity: number,
        readonly refillRate: number
    ) {
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }

    /**
     * Try to consume tokens
     * @param count - Number of tokens to consume
     * @returns true if tokens were consumed, false if not enough
     */
    tryConsume(count: number = 1): boolean {
        this.refill();

        if (this.tokens >= count) {
            this.tokens -= count;
            return true;
        }

        return false;
    }

    /**
     * Get time until tokens are available
     * @param count - Number of tokens needed
     * @returns milliseconds to wait, or 0 if available
     */
    timeUntilAvailable(count: number = 1): number {
        this.refill();

        if (this.tokens >= count) {
            return 0;
        }

        const needed = count - this.tokens;
        return Math.ceil((needed / this.refillRate) * 1000);
    }

    /**
     * Get current token count
     */
    getTokens(): number {
        this.refill();
        return this.tokens;
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        const newTokens = elapsed * this.refillRate;

        this.tokens = Math.min(this.capacity, this.tokens + newTokens);
        this.lastRefill = now;
    }

    /**
     * Reset to full capacity
     */
    reset(): void {
        this.tokens = this.capacity;
        this.lastRefill = Date.now();
    }
}
