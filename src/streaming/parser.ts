/**
 * SSE (Server-Sent Events) parser for streaming responses
 * @module streaming/parser
 */

/**
 * Parsed SSE event
 */
export interface SSEEvent {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * Parse SSE stream from a ReadableStream
 */
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const event = parseSSEEvent(buffer);
          if (event) yield event;
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete events (separated by double newlines)
      const events = buffer.split(/\n\n/);
      buffer = events.pop() ?? '';

      for (const eventStr of events) {
        if (eventStr.trim()) {
          const event = parseSSEEvent(eventStr);
          if (event) yield event;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse a single SSE event string
 */
function parseSSEEvent(eventStr: string): SSEEvent | null {
  const lines = eventStr.split('\n');
  const event: Partial<SSEEvent> = {};
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(':')) {
      // Comment, ignore
      continue;
    }

    const colonIndex = line.indexOf(':');
    let field: string;
    let value: string;

    if (colonIndex === -1) {
      field = line;
      value = '';
    } else {
      field = line.slice(0, colonIndex);
      value = line.slice(colonIndex + 1);
      // Remove leading space from value if present
      if (value.startsWith(' ')) {
        value = value.slice(1);
      }
    }

    switch (field) {
      case 'event':
        event.event = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        event.id = value;
        break;
      case 'retry':
        const retry = parseInt(value, 10);
        if (!isNaN(retry)) {
          event.retry = retry;
        }
        break;
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    ...event,
    data: dataLines.join('\n'),
  } as SSEEvent;
}

/**
 * Parse JSON from SSE data field, handling [DONE] marker
 */
export function parseSSEData<T>(data: string): T | null {
  const trimmed = data.trim();
  
  // Handle end markers
  if (trimmed === '[DONE]' || trimmed === '' || trimmed === 'data: [DONE]') {
    return null;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

/**
 * Create an async iterable from a ReadableStream that yields parsed JSON events
 */
export async function* parseJSONStream<T>(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<T> {
  for await (const event of parseSSEStream(stream)) {
    const data = parseSSEData<T>(event.data);
    if (data !== null) {
      yield data;
    }
  }
}

/**
 * Parse newline-delimited JSON (NDJSON) stream
 * Used by some providers like Ollama
 */
export async function* parseNDJSONStream<T>(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<T> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining data
        if (buffer.trim()) {
          try {
            yield JSON.parse(buffer) as T;
          } catch {
            // Ignore parse errors for incomplete final line
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line) as T;
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
