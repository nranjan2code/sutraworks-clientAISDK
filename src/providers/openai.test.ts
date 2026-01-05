/**
 * Tests for OpenAI Provider
 * @module providers/openai.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from './openai';
import { EventEmitter } from '../utils/events';
import { SutraError } from '../types';
import {
  createMockResponse,
  createMockErrorResponse,
  createMockChatResponse,
  createMockSSEStream,
  createMockOpenAIStreamChunks,
  TEST_KEYS,
} from '../test-utils/mocks';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockFetch: ReturnType<typeof vi.fn>;
  let events: EventEmitter;
  const getApiKey = () => Promise.resolve(TEST_KEYS.openai);

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as typeof fetch;
    events = new EventEmitter();
    provider = new OpenAIProvider(
      {
        name: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        timeout: 30000,
        maxRetries: 0, // Disable retries for testing
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
      expect(provider.name).toBe('openai');
    });

    it('should support expected features', () => {
      expect(provider.supports('streaming')).toBe(true);
      expect(provider.supports('embeddings')).toBe(true);
      expect(provider.supports('tools')).toBe(true);
      expect(provider.supports('vision')).toBe(true);
    });
  });

  describe('chat', () => {
    it('should make successful chat completion request', async () => {
      const mockResponse = createMockChatResponse({
        model: 'gpt-4-turbo',
        provider: 'openai',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello there!' },
            finish_reason: 'stop',
          },
        ],
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const response = await provider.chat({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.choices[0].message.content).toBe('Hello there!');
      expect(response.provider).toBe('openai');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify request format
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/chat/completions');
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('gpt-4-turbo');
      expect(requestBody.messages).toEqual([{ role: 'user', content: 'Hello' }]);
    });

    it('should handle tool calls in response', async () => {
      const mockResponse = createMockChatResponse({
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location":"San Francisco"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const response = await provider.chat({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'What is the weather?' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather for a location',
              parameters: { type: 'object', properties: { location: { type: 'string' } } },
            },
          },
        ],
      });

      expect(response.choices[0].finish_reason).toBe('tool_calls');
      expect(response.choices[0].message.tool_calls).toHaveLength(1);
      expect(response.choices[0].message.tool_calls![0].function.name).toBe('get_weather');
    });

    it('should handle 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(401, {
          error: { message: 'Invalid API key', type: 'invalid_request_error' },
        })
      );

      await expect(
        provider.chat({
          provider: 'openai',
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow(SutraError);
    });

    it('should handle 429 rate limit error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(429, {
          error: {
            message: 'Rate limit exceeded',
            type: 'rate_limit_error',
          },
        })
      );

      try {
        await provider.chat({
          provider: 'openai',
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SutraError);
        expect((error as SutraError).code).toBe('RATE_LIMITED');
        expect((error as SutraError).retryable).toBe(true);
      }
    });

    it('should handle 500 server error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse(500, {
          error: { message: 'Internal server error' },
        })
      );

      try {
        await provider.chat({
          provider: 'openai',
          model: 'gpt-4-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SutraError);
        expect((error as SutraError).code).toBe('REQUEST_FAILED');
        expect((error as SutraError).retryable).toBe(true);
      }
    });

    it('should pass optional parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(createMockChatResponse()));

      await provider.chat({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9,
        presence_penalty: 0.1,
        frequency_penalty: 0.2,
        stop: ['END'],
        seed: 42,
        user: 'test-user',
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.temperature).toBe(0.7);
      expect(requestBody.max_tokens).toBe(500);
      expect(requestBody.top_p).toBe(0.9);
      expect(requestBody.presence_penalty).toBe(0.1);
      expect(requestBody.frequency_penalty).toBe(0.2);
      expect(requestBody.stop).toEqual(['END']);
      expect(requestBody.seed).toBe(42);
      expect(requestBody.user).toBe('test-user');
    });

    it('should handle JSON response format', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(createMockChatResponse()));

      await provider.chat({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Return JSON' }],
        response_format: { type: 'json_object' },
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.response_format).toEqual({ type: 'json_object' });
    });
  });

  describe('chatStream', () => {
    it('should handle streaming response', async () => {
      const chunks = createMockOpenAIStreamChunks('Hello world how are you');
      mockFetch.mockResolvedValueOnce(createMockSSEStream(chunks));

      const collectedContent: string[] = [];
      for await (const delta of provider.chatStream({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      })) {
        const content = delta.choices[0].delta.content;
        if (typeof content === 'string' && content) {
          collectedContent.push(content);
        }
      }

      expect(collectedContent.join('')).toBe('Hello world how are you');
    });

    it('should emit stream events', async () => {
      const chunks = createMockOpenAIStreamChunks('Test');
      mockFetch.mockResolvedValueOnce(createMockSSEStream(chunks));

      const streamStartListener = vi.fn();
      const streamEndListener = vi.fn();

      events.on('stream:start', streamStartListener);
      events.on('stream:end', streamEndListener);

      const results: unknown[] = [];
      for await (const delta of provider.chatStream({
        provider: 'openai',
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      })) {
        results.push(delta);
      }

      expect(streamStartListener).toHaveBeenCalled();
      expect(streamEndListener).toHaveBeenCalled();
    });
  });

  describe('embed', () => {
    it('should create embeddings', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          object: 'list',
          data: [
            {
              object: 'embedding',
              index: 0,
              embedding: Array(1536).fill(0.1),
            },
          ],
          model: 'text-embedding-3-small',
          usage: { prompt_tokens: 5, total_tokens: 5 },
        })
      );

      const response = await provider.embed({
        provider: 'openai',
        model: 'text-embedding-3-small',
        input: 'Hello world',
      });

      expect(response.data).toHaveLength(1);
      expect(response.data[0].embedding).toHaveLength(1536);
      expect(response.provider).toBe('openai');
    });

    it('should handle batch embeddings', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          object: 'list',
          data: [
            { object: 'embedding', index: 0, embedding: Array(1536).fill(0.1) },
            { object: 'embedding', index: 1, embedding: Array(1536).fill(0.2) },
          ],
          model: 'text-embedding-3-small',
          usage: { prompt_tokens: 10, total_tokens: 10 },
        })
      );

      const response = await provider.embed({
        provider: 'openai',
        model: 'text-embedding-3-small',
        input: ['Hello', 'World'],
      });

      expect(response.data).toHaveLength(2);
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          object: 'list',
          data: [
            { id: 'gpt-4-turbo', object: 'model', owned_by: 'openai' },
            { id: 'gpt-3.5-turbo', object: 'model', owned_by: 'openai' },
          ],
        })
      );

      const models = await provider.listModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.id.includes('gpt'))).toBe(true);
    });
  });
});
