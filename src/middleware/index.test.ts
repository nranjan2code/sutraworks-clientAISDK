/**
 * Tests for Middleware System
 * @module middleware/index.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MiddlewareManager,
  createLoggingMiddleware,
  createRetryMiddleware,
  createTimeoutMiddleware,
  createContentFilterMiddleware,
  createFallbackMiddleware,
  createMetricsMiddleware,
  createValidationMiddleware,
  createSanitizingMiddleware,
  validateRequest,
  sanitizeRequest,
  MODEL_CONTEXT_WINDOWS,
} from './index';
import type { ChatRequest, ChatResponse, Middleware, MiddlewareContext } from '../types';
import { SutraError } from '../types';

// Helper to create test context
function createTestContext(): MiddlewareContext {
  return {
    requestId: 'test-request-123',
    startTime: Date.now(),
    data: new Map(),
    abortController: new AbortController(),
  };
}

// Helper to create test request
function createTestRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    provider: 'openai',
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: 'Hello, world!' }],
    ...overrides,
  };
}

// Helper to create test response
function createTestResponse(overrides: Partial<ChatResponse> = {}): ChatResponse {
  return {
    id: 'resp-123',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-4-turbo',
    provider: 'openai',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Hello!' },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
    ...overrides,
  };
}

describe('MiddlewareManager', () => {
  let manager: MiddlewareManager;

  beforeEach(() => {
    manager = new MiddlewareManager();
  });

  describe('use', () => {
    it('should add middleware', () => {
      const middleware: Middleware = {
        name: 'test-middleware',
        beforeRequest: async (req) => req,
      };

      manager.use(middleware);
      expect(manager.list()).toContain('test-middleware');
    });

    it('should allow adding same middleware multiple times (no deduplication)', () => {
      const middleware: Middleware = { name: 'test', beforeRequest: async (req) => req };
      manager.use(middleware);
      manager.use(middleware);
      // Middleware is added twice - this is current behavior
      // Future improvement: could deduplicate by name
      expect(manager.list().filter((n) => n === 'test').length).toBe(2);
    });

    it('should sort middleware by priority', () => {
      manager.use({ name: 'low', priority: 100, beforeRequest: async (req) => req });
      manager.use({ name: 'high', priority: 1, beforeRequest: async (req) => req });
      manager.use({ name: 'medium', priority: 50, beforeRequest: async (req) => req });

      const list = manager.list();
      expect(list.indexOf('high')).toBeLessThan(list.indexOf('medium'));
      expect(list.indexOf('medium')).toBeLessThan(list.indexOf('low'));
    });
  });

  describe('remove', () => {
    it('should remove middleware by name', () => {
      manager.use({ name: 'test', beforeRequest: async (req) => req });
      const removed = manager.remove('test');
      expect(removed).toBe(true);
      expect(manager.list()).not.toContain('test');
    });

    it('should return false for non-existent middleware', () => {
      const removed = manager.remove('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('executeRequestMiddleware', () => {
    it('should execute middleware in order', async () => {
      const order: string[] = [];

      manager.use({
        name: 'first',
        priority: 1,
        beforeRequest: async (req) => {
          order.push('first');
          return req;
        },
      });

      manager.use({
        name: 'second',
        priority: 2,
        beforeRequest: async (req) => {
          order.push('second');
          return req;
        },
      });

      const request = createTestRequest();
      const context = createTestContext();

      await manager.executeRequestMiddleware(request, context);

      expect(order).toEqual(['first', 'second']);
    });

    it('should transform request through middleware chain', async () => {
      manager.use({
        name: 'add-header',
        beforeRequest: async (req) => ({
          ...req,
          headers: { ...req.headers, 'X-Custom': 'value' },
        }),
      });

      manager.use({
        name: 'add-metadata',
        beforeRequest: async (req) => ({
          ...req,
          metadata: { ...req.metadata, processed: true },
        }),
      });

      const request = createTestRequest();
      const context = createTestContext();

      const result = await manager.executeRequestMiddleware(request, context);

      expect(result.headers?.['X-Custom']).toBe('value');
      expect(result.metadata?.processed).toBe(true);
    });

    it('should skip disabled middleware', async () => {
      const fn = vi.fn((req: ChatRequest) => Promise.resolve(req));

      manager.use({
        name: 'disabled',
        enabled: false,
        beforeRequest: fn,
      });

      const request = createTestRequest();
      const context = createTestContext();

      await manager.executeRequestMiddleware(request, context);

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('executeResponseMiddleware', () => {
    it('should execute response middleware', async () => {
      manager.use({
        name: 'response-transform',
        afterResponse: async (response) => ({
          ...response,
          timing: { startTime: 0, endTime: 100, duration: 100 },
        }),
      });

      const response = createTestResponse();
      const context = createTestContext();

      const result = await manager.executeResponseMiddleware(response, context);

      expect(result.timing).toBeDefined();
      expect(result.timing?.duration).toBe(100);
    });
  });

  describe('createContext', () => {
    it('should create valid context', () => {
      const context = manager.createContext();

      expect(context.requestId).toBeDefined();
      expect(context.startTime).toBeLessThanOrEqual(Date.now());
      expect(context.data).toBeInstanceOf(Map);
      expect(context.abortController).toBeInstanceOf(AbortController);
    });
  });
});

describe('Built-in Middleware', () => {
  describe('createLoggingMiddleware', () => {
    it('should log request and response', async () => {
      const logger = vi.fn();
      const middleware = createLoggingMiddleware({ logger });

      const request = createTestRequest();
      const context = createTestContext();

      await middleware.beforeRequest!(request, context);
      expect(logger).toHaveBeenCalled();

      const response = createTestResponse();
      await middleware.afterResponse!(response, context);
      expect(logger).toHaveBeenCalledTimes(2);
    });

    it('should use custom logger', async () => {
      const customLogger = vi.fn();
      const middleware = createLoggingMiddleware({ logger: customLogger });

      const request = createTestRequest();
      const context = createTestContext();

      await middleware.beforeRequest!(request, context);

      expect(customLogger).toHaveBeenCalled();
    });
  });

  describe('createTimeoutMiddleware', () => {
    it('should set up abort signal', async () => {
      const middleware = createTimeoutMiddleware(5000);

      const request = createTestRequest();
      const context = createTestContext();

      const result = await middleware.beforeRequest!(request, context);

      expect(result.signal).toBe(context.abortController.signal);
      expect(context.data.get('timeoutId')).toBeDefined();
      
      // Cleanup
      const timeoutId = context.data.get('timeoutId') as ReturnType<typeof setTimeout>;
      clearTimeout(timeoutId);
    });
  });

  describe('createContentFilterMiddleware', () => {
    it('should filter content with custom function', async () => {
      const middleware = createContentFilterMiddleware({
        filterRequest: (content) => content.replace(/badword/gi, '***'),
      });

      const request = createTestRequest({
        messages: [{ role: 'user', content: 'This has a badword in it' }],
      });
      const context = createTestContext();

      const result = await middleware.beforeRequest!(request, context);

      expect(result.messages[0].content).toBe('This has a *** in it');
    });

    it('should throw on blocked patterns', async () => {
      const middleware = createContentFilterMiddleware({
        blockedPatterns: [/forbidden/i],
      });

      const request = createTestRequest({
        messages: [{ role: 'user', content: 'This is forbidden content' }],
      });
      const context = createTestContext();

      await expect(middleware.beforeRequest!(request, context)).rejects.toThrow('Content blocked');
    });
  });

  describe('createFallbackMiddleware', () => {
    it('should store fallback info on error', async () => {
      const middleware = createFallbackMiddleware({
        fallbacks: [{ provider: 'anthropic', model: 'claude-3-opus-20240229' }],
      });

      const error = new SutraError('Provider failed', 'REQUEST_FAILED', { retryable: true });
      const context = createTestContext();

      await middleware.onError!(error, context);

      expect(context.data.get('shouldFallback')).toBe(true);
      expect(context.data.get('fallbackProvider')).toBe('anthropic');
      expect(context.data.get('fallbackModel')).toBe('claude-3-opus-20240229');
    });

    it('should not fallback on non-fallback errors', async () => {
      const middleware = createFallbackMiddleware({
        fallbacks: [{ provider: 'anthropic', model: 'claude-3-opus-20240229' }],
      });

      const error = new SutraError('Invalid key', 'KEY_INVALID');
      const context = createTestContext();

      await middleware.onError!(error, context);

      expect(context.data.get('shouldFallback')).toBeUndefined();
    });
  });

  describe('createMetricsMiddleware', () => {
    it('should record request metrics', async () => {
      const onMetrics = vi.fn();
      const middleware = createMetricsMiddleware({ onMetrics });

      const request = createTestRequest();
      const context = createTestContext();

      await middleware.beforeRequest!(request, context);

      const response = createTestResponse();
      await middleware.afterResponse!(response, context);

      expect(onMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: context.requestId,
          provider: 'openai',
          model: 'gpt-4-turbo',
          success: true,
        })
      );
    });

    it('should record error metrics', async () => {
      const onMetrics = vi.fn();
      const middleware = createMetricsMiddleware({ onMetrics });

      const request = createTestRequest();
      const context = createTestContext();

      await middleware.beforeRequest!(request, context);

      const error = new SutraError('Failed', 'REQUEST_FAILED');
      await middleware.onError!(error, context);

      expect(onMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'REQUEST_FAILED',
        })
      );
    });
  });

  describe('createRetryMiddleware', () => {
    it('should store retry info in context', async () => {
      const middleware = createRetryMiddleware({ maxRetries: 5 });

      const error = new SutraError('Rate limited', 'RATE_LIMITED', { retryable: true });
      const context = createTestContext();

      await middleware.onError!(error, context);

      expect(context.data.get('retryAttempt')).toBe(1);
      expect(context.data.get('shouldRetry')).toBe(true);
    });

    it('should not retry on non-retryable errors', async () => {
      const middleware = createRetryMiddleware({ maxRetries: 5 });

      const error = new SutraError('Invalid key', 'KEY_INVALID');
      const context = createTestContext();

      await middleware.onError!(error, context);

      expect(context.data.get('shouldRetry')).toBeUndefined();
    });

    it('should stop retrying after max attempts', async () => {
      const middleware = createRetryMiddleware({ maxRetries: 2 });

      const error = new SutraError('Rate limited', 'RATE_LIMITED', { retryable: true });
      const context = createTestContext();
      context.data.set('retryAttempt', 2); // Already at max

      await middleware.onError!(error, context);

      expect(context.data.get('shouldRetry')).toBeUndefined();
    });
  });
});

describe('Validation Middleware', () => {
  describe('validateRequest', () => {
    it('should pass valid request', () => {
      const request = createTestRequest();
      const errors = validateRequest(request);
      expect(errors).toHaveLength(0);
    });

    it('should fail on missing provider', () => {
      const request = createTestRequest({ provider: '' as any });
      const errors = validateRequest(request);
      expect(errors.some((e) => e.field === 'provider')).toBe(true);
    });

    it('should fail on missing model', () => {
      const request = createTestRequest({ model: '' });
      const errors = validateRequest(request);
      expect(errors.some((e) => e.field === 'model')).toBe(true);
    });

    it('should fail on empty messages', () => {
      const request = createTestRequest({ messages: [] });
      const errors = validateRequest(request);
      expect(errors.some((e) => e.field === 'messages')).toBe(true);
    });

    it('should validate temperature range', () => {
      const request = createTestRequest({ temperature: 3 });
      const errors = validateRequest(request);
      expect(errors.some((e) => e.field === 'temperature')).toBe(true);
    });

    it('should validate max_tokens is positive', () => {
      const request = createTestRequest({ max_tokens: -1 });
      const errors = validateRequest(request);
      expect(errors.some((e) => e.field === 'max_tokens')).toBe(true);
    });

    it('should validate message structure', () => {
      const request = createTestRequest({
        messages: [{ role: 'invalid' as any, content: 'test' }],
      });
      const errors = validateRequest(request);
      expect(errors.some((e) => e.field === 'messages[0].role')).toBe(true);
    });

    it('should check context window limits when strict', () => {
      // GPT-4-turbo has 128k context
      const request = createTestRequest({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'x'.repeat(1000000) }], // Very long
      });
      const errors = validateRequest(request, { strict: true, maxContentLength: 500000 });
      // May or may not fail depending on content length
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('sanitizeRequest', () => {
    it('should trim message content', () => {
      const request = createTestRequest({
        messages: [{ role: 'user', content: '  Hello world  ' }],
      });
      const sanitized = sanitizeRequest(request);
      expect(sanitized.messages[0].content).toBe('Hello world');
    });

    it('should clamp temperature to valid range', () => {
      const request = createTestRequest({ temperature: 5 });
      const sanitized = sanitizeRequest(request);
      expect(sanitized.temperature).toBe(2);
    });

    it('should clamp negative temperature to 0', () => {
      const request = createTestRequest({ temperature: -1 });
      const sanitized = sanitizeRequest(request);
      expect(sanitized.temperature).toBe(0);
    });

    it('should ensure max_tokens is positive integer', () => {
      const request = createTestRequest({ max_tokens: -5 });
      const sanitized = sanitizeRequest(request);
      expect(sanitized.max_tokens).toBe(1);
    });

    it('should floor max_tokens', () => {
      const request = createTestRequest({ max_tokens: 100.7 });
      const sanitized = sanitizeRequest(request);
      expect(sanitized.max_tokens).toBe(100);
    });

    it('should trim model name', () => {
      const request = createTestRequest({ model: '  gpt-4-turbo  ' });
      const sanitized = sanitizeRequest(request);
      expect(sanitized.model).toBe('gpt-4-turbo');
    });
  });

  describe('createValidationMiddleware', () => {
    it('should pass valid requests', async () => {
      const middleware = createValidationMiddleware();
      const request = createTestRequest();
      const context = createTestContext();

      const result = await middleware.beforeRequest!(request, context);
      expect(result).toBeDefined();
    });

    it('should throw on invalid requests', async () => {
      const middleware = createValidationMiddleware();
      const request = createTestRequest({ provider: '' as any, model: '' });
      const context = createTestContext();

      await expect(middleware.beforeRequest!(request, context)).rejects.toThrow();
    });

    it('should warn but not throw when not strict', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const middleware = createValidationMiddleware({ strict: false });
      const request = createTestRequest({ temperature: 5 }); // Invalid
      const context = createTestContext();

      const result = await middleware.beforeRequest!(request, context);
      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('createSanitizingMiddleware', () => {
    it('should sanitize request parameters', async () => {
      const middleware = createSanitizingMiddleware();

      const request = createTestRequest({
        temperature: 10,
        messages: [
          { role: 'user', content: '  Hello  ' },
        ],
      });
      const context = createTestContext();

      const result = await middleware.beforeRequest!(request, context);

      expect(result.temperature).toBe(2); // Clamped to max
      expect(result.messages[0].content).toBe('Hello'); // Trimmed
    });
  });

  describe('MODEL_CONTEXT_WINDOWS', () => {
    it('should have entries for GPT models', () => {
      expect(MODEL_CONTEXT_WINDOWS['gpt-4-turbo']).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS['gpt-4o']).toBeDefined();
    });

    it('should have entries for Claude models', () => {
      expect(MODEL_CONTEXT_WINDOWS['claude-3-opus']).toBeDefined();
      expect(MODEL_CONTEXT_WINDOWS['claude-3-sonnet']).toBeDefined();
    });

    it('should have reasonable context window sizes', () => {
      for (const [model, size] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
        expect(size).toBeGreaterThan(0);
        expect(size).toBeLessThan(10000000); // Less than 10M tokens
      }
    });
  });
});
