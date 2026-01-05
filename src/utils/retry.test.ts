/**
 * Tests for retry utilities
 * @module utils/retry.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, defaultShouldRetry, calculateDelay } from './retry';
import { SutraError } from '../types';

describe('defaultShouldRetry', () => {
  it('should retry on SutraError with rate limit', () => {
    const error = new SutraError('Rate limit exceeded', 'RATE_LIMITED', {
      provider: 'openai',
      retryable: true,
    });
    expect(defaultShouldRetry(error, 1)).toBe(true);
  });

  it('should not retry on SutraError with invalid key', () => {
    const error = new SutraError('Invalid API key', 'KEY_INVALID', {
      provider: 'openai',
      retryable: false,
    });
    expect(defaultShouldRetry(error, 1)).toBe(false);
  });

  it('should retry on network errors', () => {
    const error = new TypeError('Failed to fetch');
    expect(defaultShouldRetry(error, 1)).toBe(true);
  });

  it('should retry on 429 errors', () => {
    const error = new Error('HTTP 429: Too Many Requests');
    expect(defaultShouldRetry(error, 1)).toBe(true);
  });

  it('should retry on 500 errors', () => {
    const error = new Error('HTTP 500: Internal Server Error');
    expect(defaultShouldRetry(error, 1)).toBe(true);
  });

  it('should retry on 502 errors', () => {
    const error = new Error('HTTP 502: Bad Gateway');
    expect(defaultShouldRetry(error, 1)).toBe(true);
  });

  it('should retry on 503 errors', () => {
    const error = new Error('HTTP 503: Service Unavailable');
    expect(defaultShouldRetry(error, 1)).toBe(true);
  });

  it('should retry on 504 errors', () => {
    const error = new Error('HTTP 504: Gateway Timeout');
    expect(defaultShouldRetry(error, 1)).toBe(true);
  });

  it('should retry on timeout errors', () => {
    const error = new Error('Request timeout');
    expect(defaultShouldRetry(error, 1)).toBe(true);
  });

  it('should not retry on 400 errors', () => {
    const error = new Error('HTTP 400: Bad Request');
    expect(defaultShouldRetry(error, 1)).toBe(false);
  });

  it('should not retry on 401 errors', () => {
    const error = new Error('HTTP 401: Unauthorized');
    expect(defaultShouldRetry(error, 1)).toBe(false);
  });
});

describe('calculateDelay', () => {
  it('should return base delay for first attempt', () => {
    const delay = calculateDelay(0, 1000, 60000, 0);
    expect(delay).toBe(1000);
  });

  it('should increase delay exponentially', () => {
    const delay1 = calculateDelay(0, 1000, 60000, 0);
    const delay2 = calculateDelay(1, 1000, 60000, 0);
    const delay3 = calculateDelay(2, 1000, 60000, 0);

    expect(delay1).toBe(1000); // 1000 * 2^0
    expect(delay2).toBe(2000); // 1000 * 2^1
    expect(delay3).toBe(4000); // 1000 * 2^2
  });

  it('should cap delay at maxDelay', () => {
    const delay = calculateDelay(10, 1000, 5000, 0);
    expect(delay).toBe(5000);
  });

  it('should add jitter when configured', () => {
    // With jitter, delays should vary
    const delays = new Set<number>();
    for (let i = 0; i < 10; i++) {
      delays.add(calculateDelay(0, 1000, 60000, 0.5));
    }
    // With 50% jitter, we expect some variation
    // Most values should be around 1000 ± 500
    for (const d of delays) {
      expect(d).toBeGreaterThanOrEqual(500);
      expect(d).toBeLessThanOrEqual(1500);
    }
  });

  it('should use retryAfter when provided', () => {
    const delay = calculateDelay(0, 1000, 60000, 0, 5000);
    expect(delay).toBe(5000);
  });
});

describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('HTTP 500: Server Error'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 1 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('HTTP 500: Server Error'));

    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 1 })).rejects.toThrow(
      'HTTP 500: Server Error'
    );
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('HTTP 401: Unauthorized'));

    await expect(withRetry(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const onRetry = vi.fn();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('HTTP 500: Server Error'))
      .mockResolvedValueOnce('success');

    await withRetry(fn, { maxRetries: 3, baseDelay: 1, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, expect.any(Number));
  });

  it('should use custom shouldRetry function', async () => {
    const shouldRetry = vi.fn().mockReturnValue(false);
    const fn = vi.fn().mockRejectedValue(new Error('Custom error'));

    await expect(withRetry(fn, { maxRetries: 3, shouldRetry, baseDelay: 1 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalled();
  });

  it('should respect abort signal on start', async () => {
    const controller = new AbortController();
    controller.abort(); // Abort immediately
    const fn = vi.fn().mockResolvedValue('success');

    await expect(
      withRetry(fn, { maxRetries: 3, signal: controller.signal })
    ).rejects.toThrow('Request aborted');
    expect(fn).not.toHaveBeenCalled();
  });
});
