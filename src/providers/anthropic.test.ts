/**
 * Tests for Anthropic Provider
 * @module providers/anthropic.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider } from './anthropic';
import { EventEmitter } from '../utils/events';
import { SutraError } from '../types';
import {
  createMockResponse,
  createMockErrorResponse,
  createMockSSEStream,
  createMockAnthropicStreamChunks,
  TEST_KEYS,
} from '../test-utils/mocks';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockFetch: ReturnType<typeof vi.fn>;
  let events: EventEmitter;
  const getApiKey = () => Promise.resolve(TEST_KEYS.anthropic);

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as typeof fetch;
    events = new EventEmitter();
    provider = new AnthropicProvider(
      {
        name: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        timeout: 30000,
        maxRetries: 0,
      },
      events,
      getApiKey
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with correct name', () => {
      expect(provider.name).toBe('anthropic');
    });

    it('should support expected features', () => {
      expect(provider.supports('streaming')).toBe(true);
      expect(provider.supports('tools')).toBe(true);
      expect(provider.supports('vision')).toBe(true);
      expect(provider.supports('embeddings')).toBe(false);
    });
  });

  describe('chat', () => {
    it('should make successful chat completion request', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-opus-20240229',
          content: [{ type: 'text', text: 'Hello! How can I help you today?' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 12 },
        })
      );

      const response = await provider.chat({
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.choices[0].message.content).toBe('Hello! How can I help you today?');
      expect(response.provider).toBe('anthropic');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify request format and headers
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/messages');
      expect(fetchCall[1].headers['anthropic-version']).toBeDefined();
      expect(fetchCall[1].headers['x-api-key']).toBe(TEST_KEYS.anthropic);
    });

    it('should convert OpenAI format to Anthropic format', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-opus-20240229',
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 15, output_tokens: 5 },
        })
      );

      await provider.chat({
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' },
        ],
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.system).toBe('You are helpful');
      // Messages should exclude system message
      expect(requestBody.messages.some((m: { role: string }) => m.role === 'system')).toBe(false);
    });

    it('should handle tool use in response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-opus-20240229',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_123',
              name: 'get_weather',
              input: { location: 'San Francisco' },
            },
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 20, output_tokens: 15 },
        })
      );

      const response = await provider.chat({
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: 'What is the weather in SF?' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather',
              parameters: { type: 'object', properties: { location: { type: 'string' } } },
            },
          },
        ],
      });

      expect(response.choices[0].finish_reason).toBe('tool_calls');
      expect(response.choices[0].message.tool_calls).toBeDefined();
    });

    it('should handle 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(401, {
          error: { message: 'Invalid API key', type: 'authentication_error' },
        })
      );

      await expect(
        provider.chat({
          provider: 'anthropic',
          model: 'claude-3-opus-20240229',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow(SutraError);
    });

    it('should handle 529 overloaded error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(529, {
          error: { message: 'API is overloaded', type: 'overloaded_error' },
        })
      );

      try {
        await provider.chat({
          provider: 'anthropic',
          model: 'claude-3-opus-20240229',
          messages: [{ role: 'user', content: 'Hello' }],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SutraError);
        expect((error as SutraError).retryable).toBe(true);
      }
    });

    it('should pass max_tokens correctly', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          model: 'claude-3-opus-20240229',
          content: [{ type: 'text', text: 'Response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        })
      );

      await provider.chat({
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1000,
        temperature: 0.5,
        top_p: 0.9,
        stop: ['END'],
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.max_tokens).toBe(1000);
      expect(requestBody.temperature).toBe(0.5);
      expect(requestBody.top_p).toBe(0.9);
      expect(requestBody.stop_sequences).toEqual(['END']);
    });
  });

  describe('chatStream', () => {
    it('should handle streaming response', async () => {
      const chunks = createMockAnthropicStreamChunks('Hello world');
      mockFetch.mockResolvedValueOnce(createMockSSEStream(chunks));

      const collectedContent: string[] = [];
      for await (const delta of provider.chatStream({
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      })) {
        const content = delta.choices[0].delta.content;
        if (typeof content === 'string' && content) {
          collectedContent.push(content);
        }
      }

      expect(collectedContent.join('')).toContain('Hello');
    });
  });

  describe('listModels', () => {
    it('should return static model list', async () => {
      const models = await provider.listModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id.includes('claude'))).toBe(true);
      expect(models.every((m) => m.provider === 'anthropic')).toBe(true);
    });
  });
});
