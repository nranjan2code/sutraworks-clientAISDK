/**
 * Tests for Streaming Handler
 * @module streaming/handler.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  StreamHandler,
  collectStream,
  bufferedStream,
  timedStream,
  streamContent,
} from './handler';
import type { ChatStreamDelta, ChatResponse } from '../types';
import { EventEmitter } from '../utils/events';
import { createMockStreamDelta } from '../test-utils/mocks';

describe('StreamHandler', () => {
  let events: EventEmitter;

  beforeEach(() => {
    events = new EventEmitter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('collectStream', () => {
    it('should collect all chunks into a single response', async () => {
      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('Hello');
        yield createMockStreamDelta(' ');
        yield createMockStreamDelta('world');
        yield createMockStreamDelta('!', { finishReason: 'stop' });
      }

      const response = await collectStream(generateChunks(), {
        requestId: 'test-123',
        provider: 'openai',
        model: 'gpt-4',
        events,
      });

      expect(response.choices[0].message.content).toBe('Hello world!');
      expect(response.choices[0].finish_reason).toBe('stop');
    });

    it('should handle empty stream', async () => {
      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('', { finishReason: 'stop' });
      }

      const response = await collectStream(generateChunks(), {
        requestId: 'test-123',
        provider: 'openai',
        model: 'gpt-4',
        events,
      });

      expect(response.choices[0].message.content).toBe('');
    });

    it('should collect usage data from final chunk', async () => {
      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('Test');
        yield {
          ...createMockStreamDelta('', { finishReason: 'stop' }),
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        };
      }

      const response = await collectStream(generateChunks(), {
        requestId: 'test-123',
        provider: 'openai',
        model: 'gpt-4',
        events,
      });

      expect(response.usage).toBeDefined();
      expect(response.usage?.total_tokens).toBe(15);
    });

    it('should call stream:chunk events for each chunk', async () => {
      const onChunk = vi.fn();
      events.on('stream:chunk', onChunk);

      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('A');
        yield createMockStreamDelta('B');
        yield createMockStreamDelta('C', { finishReason: 'stop' });
      }

      await collectStream(generateChunks(), {
        requestId: 'test-123',
        provider: 'openai',
        model: 'gpt-4',
        events,
      });

      expect(onChunk).toHaveBeenCalledTimes(3);
    });

    it('should emit stream:chunk events via processChunk', async () => {
      const streamChunkListener = vi.fn();

      events.on('stream:chunk', streamChunkListener);

      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('Test', { finishReason: 'stop' });
      }

      await collectStream(generateChunks(), {
        requestId: 'test-123',
        provider: 'openai',
        model: 'gpt-4',
        events,
      });

      expect(streamChunkListener).toHaveBeenCalled();
    });
  });

  describe('bufferedStream', () => {
    it('should buffer chunks and yield periodically', async () => {
      vi.useFakeTimers();

      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        for (let i = 0; i < 10; i++) {
          yield createMockStreamDelta(`chunk${i}`);
        }
        yield createMockStreamDelta('', { finishReason: 'stop' });
      }

      const buffered = bufferedStream(generateChunks(), {
        bufferSize: 5,
        bufferTimeout: 100,
      });

      const results: string[] = [];
      const collectPromise = (async () => {
        for await (const delta of buffered) {
          const content = delta.choices[0].delta.content;
          if (typeof content === 'string' && content) {
            results.push(content);
          }
        }
      })();

      // Run all pending timers
      await vi.runAllTimersAsync();
      await collectPromise;

      vi.useRealTimers();

      // Should have buffered content
      expect(results.length).toBeGreaterThan(0);
      expect(results.join('')).toContain('chunk');
    });

    it('should flush remaining buffer on completion', async () => {
      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('Hello');
        yield createMockStreamDelta(' world', { finishReason: 'stop' });
      }

      const buffered = bufferedStream(generateChunks(), {
        bufferSize: 100, // Large buffer to ensure content is buffered
        bufferTimeout: 1000,
      });

      const results: string[] = [];
      for await (const delta of buffered) {
        const content = delta.choices[0].delta.content;
        if (typeof content === 'string' && content) {
          results.push(content);
        }
      }

      // All content should be flushed
      expect(results.join('')).toBe('Hello world');
    });

    it('should cleanup timeout on early termination', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('Hello');
        yield createMockStreamDelta(' world', { finishReason: 'stop' });
      }

      const buffered = bufferedStream(generateChunks(), {
        bufferSize: 100,
        bufferTimeout: 1000,
      });

      // Consume the generator
      for await (const _ of buffered) {
        // Just iterate
      }

      // Timeout should have been cleared
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('timedStream', () => {
    it('should add timing information to chunks', async () => {
      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('Hello', { finishReason: 'stop' });
      }

      const timed = timedStream(generateChunks());

      for await (const timedChunk of timed) {
        expect(timedChunk.choices[0].delta.content).toBe('Hello');
        expect(timedChunk.timing.elapsed).toBeGreaterThanOrEqual(0);
        expect(timedChunk.timing.chunkIndex).toBe(0);
      }
    });

    it('should track chunk indices correctly', async () => {
      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('A');
        yield createMockStreamDelta('B');
        yield createMockStreamDelta('C', { finishReason: 'stop' });
      }

      const timed = timedStream(generateChunks());
      const indices: number[] = [];

      for await (const timedChunk of timed) {
        indices.push(timedChunk.timing.chunkIndex);
      }

      expect(indices).toEqual([0, 1, 2]);
    });

    it('should calculate time to first chunk', async () => {
      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('Hello', { finishReason: 'stop' });
      }

      const timed = timedStream(generateChunks());
      let firstChunkTiming: { elapsed: number } | undefined;

      for await (const timedChunk of timed) {
        if (!firstChunkTiming) {
          firstChunkTiming = timedChunk.timing;
        }
      }

      expect(firstChunkTiming).toBeDefined();
      expect(firstChunkTiming!.elapsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('streamContent', () => {
    it('should extract content from stream', async () => {
      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('Hello');
        yield createMockStreamDelta(' ');
        yield createMockStreamDelta('world', { finishReason: 'stop' });
      }

      const content = streamContent(generateChunks());
      const parts: string[] = [];

      for await (const part of content) {
        parts.push(part);
      }

      expect(parts.join('')).toBe('Hello world');
    });

    it('should skip chunks without content', async () => {
      async function* generateChunks(): AsyncGenerator<ChatStreamDelta> {
        yield createMockStreamDelta('Hello');
        yield {
          ...createMockStreamDelta(''),
          choices: [{ index: 0, delta: {}, finish_reason: null }],
        };
        yield createMockStreamDelta('world', { finishReason: 'stop' });
      }

      const content = streamContent(generateChunks());
      const parts: string[] = [];

      for await (const part of content) {
        parts.push(part);
      }

      expect(parts.join('')).toBe('Helloworld');
    });
  });

  describe('StreamHandler class', () => {
    it('should create handler with options', () => {
      const handler = new StreamHandler({
        requestId: 'test-123',
        provider: 'openai',
        model: 'gpt-4',
        events,
        onChunk: vi.fn(),
      });

      expect(handler).toBeDefined();
    });

    it('should process chunks and accumulate content', async () => {
      const onChunk = vi.fn();

      const handler = new StreamHandler({
        requestId: 'test-123',
        provider: 'openai',
        model: 'gpt-4',
        events,
        onChunk,
      });

      handler.processChunk(createMockStreamDelta('Hello'));
      handler.processChunk(createMockStreamDelta(' world', { finishReason: 'stop' }));

      const response = handler.getResponse();
      expect(response.choices[0].message.content).toBe('Hello world');
      expect(onChunk).toHaveBeenCalledTimes(2);
      
      handler.cleanup();
    });

    it('should track chunk count', async () => {
      const handler = new StreamHandler({
        requestId: 'test-123',
        provider: 'openai',
        model: 'gpt-4',
        events,
      });

      handler.processChunk(createMockStreamDelta('A'));
      handler.processChunk(createMockStreamDelta('B'));
      handler.processChunk(createMockStreamDelta('C', { finishReason: 'stop' }));

      expect(handler.getChunkCount()).toBe(3);
      
      handler.cleanup();
    });
  });
});
