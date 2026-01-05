/**
 * Comprehensive provider tests for remaining providers
 * Tests: Cohere, Fireworks, Google, Groq, Mistral, Ollama, Perplexity, Together
 * @module providers/providers.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CohereProvider } from './cohere';
import { FireworksProvider } from './fireworks';
import { GoogleProvider } from './google';
import { GroqProvider } from './groq';
import { MistralProvider } from './mistral';
import { OllamaProvider } from './ollama';
import { PerplexityProvider } from './perplexity';
import { TogetherProvider } from './together';
import { EventEmitter } from '../utils/events';
import type { ChatRequest, ProviderConfig } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

const TEST_API_KEY = 'test-api-key-12345';

function createTestConfig(): ProviderConfig {
  return {
    name: 'openai',
    baseUrl: 'https://api.test.com',
    timeout: 30000,
    maxRetries: 3,
    defaultModel: 'test-model',
  };
}

function createTestRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    provider: 'openai',
    model: 'test-model',
    messages: [{ role: 'user', content: 'Hello' }],
    ...overrides,
  };
}

function createMockEvents(): EventEmitter {
  return new EventEmitter();
}

function createGetApiKey(): () => Promise<string> {
  return vi.fn().mockResolvedValue(TEST_API_KEY);
}

// ==============================
// Cohere Provider Tests
// ==============================
describe('CohereProvider', () => {
  let provider: CohereProvider;
  let events: EventEmitter;

  beforeEach(() => {
    events = createMockEvents();
    provider = new CohereProvider(createTestConfig(), events, createGetApiKey());
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('metadata', () => {
    it('should return correct provider name', () => {
      expect(provider.name).toBe('cohere');
    });

    it('should support streaming', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should support embeddings', () => {
      expect(provider.supports('embeddings')).toBe(true);
    });

    it('should support tools', () => {
      expect(provider.supports('tools')).toBe(true);
    });

    it('should not support vision', () => {
      expect(provider.supports('vision')).toBe(false);
    });
  });

  describe('chat', () => {
    it('should make chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response_id: 'resp-123',
            text: 'Hello there!',
            generation_id: 'gen-123',
            finish_reason: 'COMPLETE',
            meta: {
              billed_units: { input_tokens: 10, output_tokens: 5 },
            },
          }),
      });

      const response = await provider.chat(
        createTestRequest({ provider: 'cohere', model: 'command-r' })
      );

      expect(response.choices[0].message.content).toBe('Hello there!');
      expect(response.choices[0].finish_reason).toBe('stop');
    });

    it('should handle error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request' }),
      });

      await expect(
        provider.chat(createTestRequest({ provider: 'cohere' }))
      ).rejects.toThrow();
    });
  });

  describe('embeddings', () => {
    it('should generate embeddings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'emb-123',
            embeddings: [[0.1, 0.2, 0.3]],
            texts: ['test'],
          }),
      });

      const response = await provider.embed({
        provider: 'cohere',
        model: 'embed-english-v3.0',
        input: ['test'],
      });

      expect(response.data[0].embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });
});

// ==============================
// Fireworks Provider Tests
// ==============================
describe('FireworksProvider', () => {
  let provider: FireworksProvider;
  let events: EventEmitter;

  beforeEach(() => {
    events = createMockEvents();
    provider = new FireworksProvider(createTestConfig(), events, createGetApiKey());
    mockFetch.mockReset();
  });

  describe('metadata', () => {
    it('should return correct provider name', () => {
      expect(provider.name).toBe('fireworks');
    });

    it('should support streaming', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should support embeddings', () => {
      expect(provider.supports('embeddings')).toBe(true);
    });
  });

  describe('chat', () => {
    it('should make chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chat-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const response = await provider.chat(
        createTestRequest({ provider: 'fireworks', model: 'llama-v3-8b' })
      );

      expect(response.choices[0].message.content).toBe('Hello!');
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
    });
  });
});

// ==============================
// Google (Gemini) Provider Tests
// ==============================
describe('GoogleProvider', () => {
  let provider: GoogleProvider;
  let events: EventEmitter;

  beforeEach(() => {
    events = createMockEvents();
    provider = new GoogleProvider(createTestConfig(), events, createGetApiKey());
    mockFetch.mockReset();
  });

  describe('metadata', () => {
    it('should return correct provider name', () => {
      expect(provider.name).toBe('google');
    });

    it('should support streaming', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should support vision', () => {
      expect(provider.supports('vision')).toBe(true);
    });

    it('should support embeddings', () => {
      expect(provider.supports('embeddings')).toBe(true);
    });

    it('should support tools', () => {
      expect(provider.supports('tools')).toBe(true);
    });
  });

  describe('chat', () => {
    it('should make chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: { parts: [{ text: 'Hello!' }], role: 'model' },
                finishReason: 'STOP',
              },
            ],
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 5,
              totalTokenCount: 15,
            },
          }),
      });

      const response = await provider.chat(
        createTestRequest({ provider: 'google', model: 'gemini-pro' })
      );

      expect(response.choices[0].message.content).toBe('Hello!');
    });

    it('should handle multi-part content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [{ text: 'Part 1' }, { text: ' Part 2' }],
                  role: 'model',
                },
                finishReason: 'STOP',
              },
            ],
          }),
      });

      const response = await provider.chat(
        createTestRequest({ provider: 'google', model: 'gemini-pro' })
      );

      expect(response.choices[0].message.content).toBe('Part 1 Part 2');
    });
  });

  describe('listModels', () => {
    it('should list available models from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            models: [
              {
                name: 'models/gemini-pro',
                displayName: 'Gemini Pro',
                supportedGenerationMethods: ['generateContent'],
                inputTokenLimit: 30720,
                outputTokenLimit: 2048,
              },
              {
                name: 'models/gemini-pro-vision',
                displayName: 'Gemini Pro Vision',
                supportedGenerationMethods: ['generateContent'],
                inputTokenLimit: 12288,
                outputTokenLimit: 4096,
              },
            ],
          }),
      });

      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });
  });
});

// ==============================
// Groq Provider Tests
// ==============================
describe('GroqProvider', () => {
  let provider: GroqProvider;
  let events: EventEmitter;

  beforeEach(() => {
    events = createMockEvents();
    provider = new GroqProvider(createTestConfig(), events, createGetApiKey());
    mockFetch.mockReset();
  });

  describe('metadata', () => {
    it('should return correct provider name', () => {
      expect(provider.name).toBe('groq');
    });

    it('should support streaming', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should not support embeddings', () => {
      expect(provider.supports('embeddings')).toBe(false);
    });

    it('should support tools', () => {
      expect(provider.supports('tools')).toBe(true);
    });
  });

  describe('chat', () => {
    it('should make chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chat-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const response = await provider.chat(
        createTestRequest({ provider: 'groq', model: 'llama2-70b-4096' })
      );

      expect(response.choices[0].message.content).toBe('Hello!');
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
    });
  });
});

// ==============================
// Mistral Provider Tests
// ==============================
describe('MistralProvider', () => {
  let provider: MistralProvider;
  let events: EventEmitter;

  beforeEach(() => {
    events = createMockEvents();
    provider = new MistralProvider(createTestConfig(), events, createGetApiKey());
    mockFetch.mockReset();
  });

  describe('metadata', () => {
    it('should return correct provider name', () => {
      expect(provider.name).toBe('mistral');
    });

    it('should support streaming', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should support embeddings', () => {
      expect(provider.supports('embeddings')).toBe(true);
    });

    it('should support tools', () => {
      expect(provider.supports('tools')).toBe(true);
    });

    it('should not support vision', () => {
      expect(provider.supports('vision')).toBe(false);
    });
  });

  describe('chat', () => {
    it('should make chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chat-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const response = await provider.chat(
        createTestRequest({ provider: 'mistral', model: 'mistral-medium' })
      );

      expect(response.choices[0].message.content).toBe('Hello!');
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
    });
  });
});

// ==============================
// Ollama Provider Tests
// ==============================
describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let events: EventEmitter;

  beforeEach(() => {
    events = createMockEvents();
    provider = new OllamaProvider(
      { ...createTestConfig(), baseUrl: 'http://localhost:11434' },
      events,
      createGetApiKey()
    );
    mockFetch.mockReset();
  });

  describe('metadata', () => {
    it('should return correct provider name', () => {
      expect(provider.name).toBe('ollama');
    });

    it('should support streaming', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should support embeddings', () => {
      expect(provider.supports('embeddings')).toBe(true);
    });

    it('should support vision', () => {
      expect(provider.supports('vision')).toBe(true);
    });

    it('should not support tools', () => {
      expect(provider.supports('tools')).toBe(false);
    });
  });

  describe('chat', () => {
    it('should make chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            model: 'llama2',
            message: { role: 'assistant', content: 'Hello!' },
            done: true,
            eval_count: 5,
            prompt_eval_count: 10,
          }),
      });

      const response = await provider.chat(
        createTestRequest({ provider: 'ollama', model: 'llama2' })
      );

      expect(response.choices[0].message.content).toBe('Hello!');
    });
  });

  describe('listModels', () => {
    it('should list local models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            models: [
              {
                name: 'llama2:latest',
                size: 3826793472,
                details: { family: 'llama', families: [] },
              },
              {
                name: 'mistral:latest',
                size: 4109853696,
                details: { family: 'mistral', families: [] },
              },
            ],
          }),
      });

      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models[0].id).toBe('llama2:latest');
    });

    it('should handle Ollama not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(provider.listModels()).rejects.toThrow();
    });
  });
});

// ==============================
// Perplexity Provider Tests
// ==============================
describe('PerplexityProvider', () => {
  let provider: PerplexityProvider;
  let events: EventEmitter;

  beforeEach(() => {
    events = createMockEvents();
    provider = new PerplexityProvider(createTestConfig(), events, createGetApiKey());
    mockFetch.mockReset();
  });

  describe('metadata', () => {
    it('should return correct provider name', () => {
      expect(provider.name).toBe('perplexity');
    });

    it('should support streaming', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should not support embeddings', () => {
      expect(provider.supports('embeddings')).toBe(false);
    });

    it('should not support tools', () => {
      expect(provider.supports('tools')).toBe(false);
    });
  });

  describe('chat', () => {
    it('should make chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chat-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const response = await provider.chat(
        createTestRequest({ provider: 'perplexity', model: 'pplx-7b-online' })
      );

      expect(response.choices[0].message.content).toBe('Hello!');
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
    });
  });
});

// ==============================
// Together Provider Tests
// ==============================
describe('TogetherProvider', () => {
  let provider: TogetherProvider;
  let events: EventEmitter;

  beforeEach(() => {
    events = createMockEvents();
    provider = new TogetherProvider(createTestConfig(), events, createGetApiKey());
    mockFetch.mockReset();
  });

  describe('metadata', () => {
    it('should return correct provider name', () => {
      expect(provider.name).toBe('together');
    });

    it('should support streaming', () => {
      expect(provider.supports('streaming')).toBe(true);
    });

    it('should support embeddings', () => {
      expect(provider.supports('embeddings')).toBe(true);
    });

    it('should support tools', () => {
      expect(provider.supports('tools')).toBe(true);
    });

    it('should support vision', () => {
      expect(provider.supports('vision')).toBe(true);
    });
  });

  describe('chat', () => {
    it('should make chat request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'chat-123',
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Hello!' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const response = await provider.chat(
        createTestRequest({ provider: 'together', model: 'togethercomputer/llama-2-70b-chat' })
      );

      expect(response.choices[0].message.content).toBe('Hello!');
    });
  });

  describe('embeddings', () => {
    it('should generate embeddings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            object: 'list',
            data: [{ object: 'embedding', embedding: [0.1, 0.2, 0.3], index: 0 }],
            model: 'togethercomputer/m2-bert-80M-8k-retrieval',
            usage: { prompt_tokens: 5, total_tokens: 5 },
          }),
      });

      const response = await provider.embed({
        provider: 'together',
        model: 'togethercomputer/m2-bert-80M-8k-retrieval',
        input: ['test'],
      });

      expect(response.data[0].embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);
    });
  });
});
