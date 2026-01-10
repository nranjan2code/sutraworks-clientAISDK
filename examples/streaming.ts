/**
 * Sutra AI SDK - Streaming Example
 * 
 * Demonstrates streaming responses from various AI providers.
 * Streaming allows you to display responses in real-time as they're generated.
 */

import { SutraAI, type ChatStreamDelta } from '../src/index.js';

const ai = new SutraAI({ debug: true });

// Helper to extract content from streaming chunk
function getChunkContent(chunk: ChatStreamDelta): string {
  const content = chunk.choices[0]?.delta?.content;
  return typeof content === 'string' ? content : '';
}

// Example 1: Basic Streaming
async function basicStreaming() {
  console.log('\n=== Basic Streaming ===\n');

  ai.setKey('openai', process.env.OPENAI_API_KEY!);

  const stream = ai.chatStream({
    provider: 'openai',
    model: 'gpt-4-turbo',
    messages: [
      { role: 'user', content: 'Write a short story about a robot learning to paint.' },
    ],
    max_tokens: 500,
  });

  process.stdout.write('Story: ');

  for await (const chunk of stream) {
    process.stdout.write(getChunkContent(chunk));
  }

  console.log('\n');
}

// Example 2: Streaming and collecting full response
async function streamingWithCollect() {
  console.log('\n=== Streaming with Full Collection ===\n');

  ai.setKey('anthropic', process.env.ANTHROPIC_API_KEY!);

  const stream = ai.chatStream({
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    messages: [
      { role: 'user', content: 'Explain the theory of relativity in simple terms.' },
    ],
    max_tokens: 300,
  });

  // Collect chunks manually into full response
  let fullContent = '';
  process.stdout.write('Response: ');

  for await (const chunk of stream) {
    const content = getChunkContent(chunk);
    fullContent += content;
    process.stdout.write(content);
  }

  console.log('\n\n--- Complete Response ---');
  console.log('Total content length:', fullContent.length);
}

// Example 3: Parallel Streaming from Multiple Providers
async function parallelStreaming() {
  console.log('\n=== Parallel Streaming ===\n');

  ai.setKey('openai', process.env.OPENAI_API_KEY!);
  ai.setKey('groq', process.env.GROQ_API_KEY!);

  const prompt = 'What makes a good programmer? Answer in 2 sentences.';

  const responses: Record<string, string> = {
    openai: '',
    groq: '',
  };

  // Start both streams
  const openaiStream = ai.chatStream({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
  });

  const groqStream = ai.chatStream({
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
  });

  // Process in parallel
  await Promise.all([
    (async () => {
      for await (const chunk of openaiStream) {
        responses.openai += getChunkContent(chunk);
      }
    })(),
    (async () => {
      for await (const chunk of groqStream) {
        responses.groq += getChunkContent(chunk);
      }
    })(),
  ]);

  console.log('OpenAI:', responses.openai);
  console.log('\nGroq:', responses.groq);
}

// Example 4: Streaming with Cancellation
async function streamingWithCancellation() {
  console.log('\n=== Streaming with Cancellation ===\n');

  ai.setKey('openai', process.env.OPENAI_API_KEY!);

  const controller = new AbortController();

  const stream = ai.chatStream({
    provider: 'openai',
    model: 'gpt-4-turbo',
    messages: [
      { role: 'user', content: 'Write a very long essay about the history of computing.' },
    ],
    max_tokens: 2000,
    signal: controller.signal,
  });

  let tokenCount = 0;

  try {
    for await (const chunk of stream) {
      process.stdout.write(getChunkContent(chunk));
      tokenCount++;

      // Cancel after 50 tokens
      if (tokenCount >= 50) {
        console.log('\n\n[Cancelled after 50 tokens]');
        controller.abort();
        break;
      }
    }
  } catch (err) {
    const error = err as Error;
    if (error.name === 'AbortError') {
      console.log('Stream was cancelled');
    } else {
      throw error;
    }
  }
}

// Example 5: Streaming with Token Callback
async function streamingWithTokenCallback() {
  console.log('\n=== Streaming with Token Callback ===\n');

  ai.setKey('openai', process.env.OPENAI_API_KEY!);

  let totalTokens = 0;
  const startTime = Date.now();

  const stream = ai.chatStream({
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'user', content: 'List 10 programming languages and their key features.' },
    ],
    max_tokens: 500,
  });

  for await (const chunk of stream) {
    totalTokens++;
    process.stdout.write(getChunkContent(chunk));
  }

  const duration = Date.now() - startTime;
  console.log(`\n\n--- Stats ---`);
  console.log(`Chunks received: ${totalTokens}`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Tokens/second: ${(totalTokens / (duration / 1000)).toFixed(2)}`);
}

// Run examples
async function main() {
  console.log('🔮 Sutra AI SDK - Streaming Examples\n');

  // Run streaming examples (requires OPENAI_API_KEY environment variable)
  if (process.env.OPENAI_API_KEY) {
    await basicStreaming();
    await streamingWithTokenCallback();
  } else {
    console.log('Set OPENAI_API_KEY to run streaming examples');
    // Reference functions to satisfy TypeScript
    void streamingWithCollect;
    void parallelStreaming;
    void streamingWithCancellation;
  }
}

main().catch(console.error);
