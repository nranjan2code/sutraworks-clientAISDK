/**
 * Tests for Error Utilities
 * @module utils/errors.test
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createErrorFromResponse,
  createErrorFromException,
  createStreamError,
  createValidationError,
  isSutraError,
  withErrorHandling,
  ErrorAggregator,
} from './errors';
import { SutraError } from '../types';
import { createMockResponse, createMockErrorResponse } from '../test-utils/mocks';

describe('Error Utilities', () => {
  describe('createErrorFromResponse', () => {
    it('should create error from 400 response', async () => {
      const response = createMockErrorResponse(400, {
        error: { message: 'Invalid request parameters' },
      });

      const error = await createErrorFromResponse(response, 'openai');

      expect(error).toBeInstanceOf(SutraError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid request parameters');
      expect(error.provider).toBe('openai');
      expect(error.statusCode).toBe(400);
      expect(error.retryable).toBe(false);
    });

    it('should create error from 401 response', async () => {
      const response = createMockErrorResponse(401, {
        error: { message: 'Invalid API key' },
      });

      const error = await createErrorFromResponse(response, 'openai');

      expect(error.code).toBe('KEY_INVALID');
      expect(error.retryable).toBe(false);
    });

    it('should create error from 429 response with retry-after', async () => {
      const response = createMockErrorResponse(429, {
        error: { message: 'Rate limit exceeded' },
        retry_after: 30,
      });

      const error = await createErrorFromResponse(response, 'openai');

      expect(error.code).toBe('RATE_LIMITED');
      expect(error.retryable).toBe(true);
      expect(error.retryAfter).toBe(30000);
    });

    it('should create error from 500 response', async () => {
      const response = createMockErrorResponse(500, {
        error: { message: 'Internal server error' },
      });

      const error = await createErrorFromResponse(response, 'anthropic');

      expect(error.code).toBe('REQUEST_FAILED');
      expect(error.retryable).toBe(true);
    });

    it('should detect context length exceeded from message', async () => {
      const response = createMockErrorResponse(400, {
        error: { message: "This model's maximum context length is exceeded" },
      });

      const error = await createErrorFromResponse(response, 'openai');

      expect(error.code).toBe('CONTEXT_LENGTH_EXCEEDED');
    });

    it('should detect content filtered from message', async () => {
      const response = createMockErrorResponse(400, {
        error: { message: 'Content blocked by safety filter' },
      });

      const error = await createErrorFromResponse(response, 'openai');

      expect(error.code).toBe('CONTENT_FILTERED');
    });

    it('should detect quota exceeded from message', async () => {
      const response = createMockErrorResponse(402, {
        error: { message: 'You have exceeded your quota' },
      });

      const error = await createErrorFromResponse(response, 'openai');

      expect(error.code).toBe('QUOTA_EXCEEDED');
    });

    it('should include request ID when provided', async () => {
      const response = createMockErrorResponse(500, {
        error: { message: 'Error' },
      });

      const error = await createErrorFromResponse(response, 'openai', 'req-123');

      expect(error.requestId).toBe('req-123');
    });

    it('should handle non-JSON error response', async () => {
      const response = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        clone: () => ({
          json: () => Promise.reject(new Error('Not JSON')),
          text: () => Promise.resolve('Plain text error'),
        }),
      } as Response;

      const error = await createErrorFromResponse(response, 'openai');

      expect(error).toBeInstanceOf(SutraError);
      expect(error.message).toBe('Plain text error');
    });
  });

  describe('createErrorFromException', () => {
    it('should return existing SutraError unchanged', () => {
      const original = new SutraError('Test', 'VALIDATION_ERROR');
      const result = createErrorFromException(original, 'openai');
      expect(result).toBe(original);
    });

    it('should convert AbortError', () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      const error = createErrorFromException(abortError, 'openai');

      expect(error.code).toBe('ABORTED');
      expect(error.retryable).toBe(false);
    });

    it('should convert TimeoutError', () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';

      const error = createErrorFromException(timeoutError, 'openai');

      expect(error.code).toBe('TIMEOUT');
      expect(error.retryable).toBe(true);
    });

    it('should convert network errors', () => {
      const networkError = new TypeError('fetch failed');

      const error = createErrorFromException(networkError, 'openai');

      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should convert generic Error', () => {
      const genericError = new Error('Something went wrong');

      const error = createErrorFromException(genericError, 'anthropic');

      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('Something went wrong');
      expect(error.provider).toBe('anthropic');
    });

    it('should handle non-Error thrown values', () => {
      const error = createErrorFromException('string error', 'openai');

      expect(error).toBeInstanceOf(SutraError);
      expect(error.message).toBe('string error');
    });
  });

  describe('createStreamError', () => {
    it('should create stream error', () => {
      const error = createStreamError('Stream interrupted', 'openai');

      expect(error.code).toBe('STREAM_ERROR');
      expect(error.message).toBe('Stream interrupted');
      expect(error.provider).toBe('openai');
      expect(error.retryable).toBe(false);
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = createStreamError('Stream failed', 'anthropic', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('createValidationError', () => {
    it('should create validation error', () => {
      const error = createValidationError('Invalid model', 'openai');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid model');
      expect(error.provider).toBe('openai');
    });

    it('should include details', () => {
      const details = { field: 'model', value: 'invalid' };
      const error = createValidationError('Invalid', undefined, details);

      expect(error.details).toEqual(details);
    });
  });

  describe('isSutraError', () => {
    it('should return true for SutraError', () => {
      const error = new SutraError('Test', 'UNKNOWN_ERROR');
      expect(isSutraError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Test');
      expect(isSutraError(error)).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isSutraError('string')).toBe(false);
      expect(isSutraError(null)).toBe(false);
      expect(isSutraError(undefined)).toBe(false);
      expect(isSutraError({})).toBe(false);
    });
  });

  describe('withErrorHandling', () => {
    it('should return result on success', async () => {
      const result = await withErrorHandling(
        () => Promise.resolve('success'),
        'openai'
      );

      expect(result).toBe('success');
    });

    it('should convert thrown error to SutraError', async () => {
      await expect(
        withErrorHandling(
          () => Promise.reject(new Error('Failed')),
          'openai'
        )
      ).rejects.toBeInstanceOf(SutraError);
    });

    it('should include request ID in converted error', async () => {
      try {
        await withErrorHandling(
          () => Promise.reject(new Error('Failed')),
          'openai',
          'req-456'
        );
      } catch (error) {
        expect((error as SutraError).requestId).toBe('req-456');
      }
    });
  });

  describe('ErrorAggregator', () => {
    it('should add and track errors', () => {
      const aggregator = new ErrorAggregator();

      aggregator.add(new SutraError('Error 1', 'VALIDATION_ERROR'));
      aggregator.add(new SutraError('Error 2', 'RATE_LIMITED', { retryable: true }));

      expect(aggregator.count).toBe(2);
      expect(aggregator.hasErrors).toBe(true);
    });

    it('should return all errors', () => {
      const aggregator = new ErrorAggregator();

      const error1 = new SutraError('Error 1', 'VALIDATION_ERROR');
      const error2 = new SutraError('Error 2', 'TIMEOUT');

      aggregator.add(error1);
      aggregator.add(error2);

      const all = aggregator.getAll();
      expect(all).toContain(error1);
      expect(all).toContain(error2);
    });

    it('should filter retryable errors', () => {
      const aggregator = new ErrorAggregator();

      aggregator.add(new SutraError('Non-retryable', 'VALIDATION_ERROR'));
      aggregator.add(new SutraError('Retryable', 'RATE_LIMITED', { retryable: true }));
      aggregator.add(new SutraError('Also retryable', 'TIMEOUT', { retryable: true }));

      expect(aggregator.getRetryable()).toHaveLength(2);
      expect(aggregator.getNonRetryable()).toHaveLength(1);
    });

    it('should create aggregate error', () => {
      const aggregator = new ErrorAggregator();

      aggregator.add(new SutraError('Error 1', 'VALIDATION_ERROR'));
      aggregator.add(new SutraError('Error 2', 'TIMEOUT', { retryable: true }));

      const aggregate = aggregator.toAggregateError();

      expect(aggregate.code).toBe('BATCH_ERROR');
      expect(aggregate.retryable).toBe(true); // At least one is retryable
      expect(Array.isArray(aggregate.details)).toBe(true);
    });

    it('should use custom message for aggregate error', () => {
      const aggregator = new ErrorAggregator();
      aggregator.add(new SutraError('Error', 'UNKNOWN_ERROR'));

      const aggregate = aggregator.toAggregateError('Custom batch error message');

      expect(aggregate.message).toBe('Custom batch error message');
    });
  });
});
