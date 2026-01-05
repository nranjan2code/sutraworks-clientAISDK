/**
 * Tests for SSE Parser
 * @module streaming/parser.test
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseSSEStream,
  parseSSEData,
  parseJSONStream,
  parseNDJSONStream,
} from './parser';

describe('SSE Parser', () => {
  describe('parseSSEData', () => {
    it('should parse valid JSON data', () => {
      const data = '{"message": "hello"}';
      const result = parseSSEData(data);
      expect(result).toEqual({ message: 'hello' });
    });

    it('should return null for [DONE] marker', () => {
      const result = parseSSEData('[DONE]');
      expect(result).toBeNull();
    });

    it('should return null for data: [DONE]', () => {
      const result = parseSSEData('data: [DONE]');
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const result = parseSSEData('not json');
      expect(result).toBeNull();
    });

    it('should return null for empty data', () => {
      const result = parseSSEData('');
      expect(result).toBeNull();
    });

    it('should handle whitespace in JSON', () => {
      const result = parseSSEData('  {"value": 1}  ');
      expect(result).toEqual({ value: 1 });
    });
  });

  describe('parseSSEStream', () => {
    it('should parse SSE stream and yield events', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id": 1}\n\n'));
          controller.enqueue(encoder.encode('data: {"id": 2}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const event of parseSSEStream(stream)) {
        results.push(event);
      }

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ data: '{"id": 1}' });
      expect(results[1]).toEqual({ data: '{"id": 2}' });
      expect(results[2]).toEqual({ data: '[DONE]' });
    });

    it('should handle chunked data', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send data in multiple chunks
          controller.enqueue(encoder.encode('data: {"mes'));
          controller.enqueue(encoder.encode('sage": "hel'));
          controller.enqueue(encoder.encode('lo"}\n\n'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const event of parseSSEStream(stream)) {
        results.push(event);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ data: '{"message": "hello"}' });
    });

    it('should skip empty events', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('\n\n'));
          controller.enqueue(encoder.encode('data: {"value": 1}\n\n'));
          controller.enqueue(encoder.encode('\n'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const event of parseSSEStream(stream)) {
        results.push(event);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ data: '{"value": 1}' });
    });

    it('should handle event: and id: prefixes', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('event: message\n'));
          controller.enqueue(encoder.encode('id: 123\n'));
          controller.enqueue(encoder.encode('data: {"test": true}\n\n'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const event of parseSSEStream(stream)) {
        results.push(event);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ event: 'message', id: '123', data: '{"test": true}' });
    });
  });

  describe('parseJSONStream', () => {
    it('should parse SSE stream and yield JSON objects', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id": 1}\n\n'));
          controller.enqueue(encoder.encode('data: {"id": 2}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const data of parseJSONStream(stream)) {
        results.push(data);
      }

      expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should skip invalid JSON', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id": 1}\n\n'));
          controller.enqueue(encoder.encode('data: invalid\n\n'));
          controller.enqueue(encoder.encode('data: {"id": 2}\n\n'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const data of parseJSONStream(stream)) {
        results.push(data);
      }

      expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('parseNDJSONStream', () => {
    it('should parse newline-delimited JSON stream', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('{"id": 1}\n'));
          controller.enqueue(encoder.encode('{"id": 2}\n'));
          controller.enqueue(encoder.encode('{"id": 3}\n'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const data of parseNDJSONStream(stream)) {
        results.push(data);
      }

      expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });

    it('should handle chunked NDJSON', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('{"id": 1}\n{"i'));
          controller.enqueue(encoder.encode('d": 2}\n'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const data of parseNDJSONStream(stream)) {
        results.push(data);
      }

      expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should skip empty lines', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('{"id": 1}\n\n'));
          controller.enqueue(encoder.encode('{"id": 2}\n'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const data of parseNDJSONStream(stream)) {
        results.push(data);
      }

      expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle remaining buffer at end', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('{"id": 1}'));
          controller.close();
        },
      });

      const results: unknown[] = [];
      for await (const data of parseNDJSONStream(stream)) {
        results.push(data);
      }

      expect(results).toEqual([{ id: 1 }]);
    });
  });
});
