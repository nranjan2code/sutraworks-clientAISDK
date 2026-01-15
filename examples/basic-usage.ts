/**
 * Sutra AI SDK - Basic Usage Example
 * 
 * This example demonstrates the core BYOK (Bring Your Own Key) functionality
 * of the Sutra AI SDK. All API calls happen client-side - keys never touch
 * any server.
 */

import { SutraAI, SutraError, type RequestEvent, type ChatResponse } from '../src/index.js';

// Initialize the SDK
const ai = new SutraAI({
  cache: { enabled: true },
  debug: true,
});

// Helper to extract content from response
function getContent(response: ChatResponse): string {
  const content = response.choices[0]?.message?.content;
  if (typeof content === 'string') return content;
  return content?.map(p => p.text ?? '').join('') ?? '';
}

// Listen to SDK events
ai.on('request:start', (event) => {
  console.log('🚀 Request started:', event.provider, event.model);
});

ai.on('request:end', (event) => {
  const reqEvent = event as RequestEvent;
  console.log('✅ Request complete:', reqEvent.duration, 'ms');
});

ai.on('request:error', (event) => {
  const reqEvent = event as RequestEvent;
  console.error('❌ Request error:', reqEvent.error);
});

// Example 1: Basic Chat with OpenAI
async function basicOpenAIChat() {
  console.log('\n=== Example 1: Basic OpenAI Chat ===\n');

  // Set your API key (stored locally only)
  ai.setKey('openai', process.env.OPENAI_API_KEY || 'sk-your-key-here');

  const response = await ai.chat({
    provider: 'openai',
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the capital of France?' },
    ],
    temperature: 0.7,
    max_tokens: 100,
  });

  console.log('Response:', getContent(response));
  console.log('Usage:', response.usage);
}

// Example 2: Streaming Chat with Anthropic
async function streamingAnthropicChat() {
  console.log('\n=== Example 2: Streaming Anthropic Chat ===\n');

  // Set Anthropic key
  ai.setKey('anthropic', process.env.ANTHROPIC_API_KEY || 'sk-ant-your-key-here');

  process.stdout.write('Response: ');

  const stream = ai.chatStream({
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    messages: [
      { role: 'user', content: 'Write a haiku about programming.' },
    ],
    max_tokens: 100,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (typeof content === 'string') {
      process.stdout.write(content);
    }
  }

  console.log('\n');
}

// Example 3: Local Ollama Model
async function localOllamaChat() {
  console.log('\n=== Example 3: Local Ollama Chat ===\n');

  // No key needed for Ollama (local)

  try {
    // First, list available models
    const models = await ai.listModels('ollama');
    console.log('Available local models:', models.map(m => m.id));

    if (models.length > 0) {
      const response = await ai.chat({
        provider: 'ollama',
        model: models[0].id, // Use first available model
        messages: [
          { role: 'user', content: 'Hello! What can you help me with?' },
        ],
      });

      console.log('Response:', getContent(response));
    }
  } catch (_error) {
    console.log('Ollama not running. Start with: ollama serve');
  }
}

// Example 4: Provider Comparison
async function compareProviders() {
  console.log('\n=== Example 4: Provider Comparison ===\n');

  const prompt = 'Explain quantum computing in one sentence.';

  const providers = [
    { name: 'openai' as const, model: 'gpt-4o-mini', keyEnv: 'OPENAI_API_KEY' },
    { name: 'anthropic' as const, model: 'claude-sonnet-4-20250514', keyEnv: 'ANTHROPIC_API_KEY' },
    { name: 'groq' as const, model: 'llama-3.3-70b-versatile', keyEnv: 'GROQ_API_KEY' },
  ];

  for (const { name, model, keyEnv } of providers) {
    const key = process.env[keyEnv];
    if (!key) {
      console.log(`${name}: Skipped (no key)`);
      continue;
    }

    ai.setKey(name, key);

    const start = Date.now();
    const response = await ai.chat({
      provider: name,
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    });
    const duration = Date.now() - start;

    console.log(`\n${name.toUpperCase()} (${duration}ms):`);
    console.log(getContent(response));
  }
}

// Example 5: Embeddings
async function generateEmbeddings() {
  console.log('\n=== Example 5: Generate Embeddings ===\n');

  ai.setKey('openai', process.env.OPENAI_API_KEY || 'sk-your-key-here');

  const result = await ai.embed({
    provider: 'openai',
    model: 'text-embedding-3-small',
    input: 'Hello, world!',
  });

  const embedding = result.data[0].embedding;
  console.log('Embedding dimensions:', embedding.length);
  console.log('First 5 values:', embedding.slice(0, 5));
}

// Example 6: Usage Statistics
async function showUsageStats() {
  console.log('\n=== Example 6: Usage Statistics ===\n');

  const stats = ai.getUsageStats();
  console.log('Total tokens:', stats.totalTokens);
  console.log('Total cost:', `$${stats.estimatedCost.toFixed(4)}`);
  console.log('Requests:', stats.requests);
}

// Example 7: Error Handling
async function errorHandling() {
  console.log('\n=== Example 7: Error Handling ===\n');

  try {
    // This will fail with invalid key
    ai.setKey('openai', 'invalid-key');

    await ai.chat({
      provider: 'openai',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello' }],
    });
  } catch (err) {
    if (err instanceof SutraError) {
      console.log('Error code:', err.code);
      console.log('Provider:', err.provider);
      console.log('Message:', err.message);
    }
  }
}

// Run examples
async function main() {
  console.log('🔮 Sutra AI SDK - Basic Usage Examples\n');
  console.log('Remember: All keys are stored locally only!');
  console.log('Set environment variables or replace keys in code.\n');

  // Run local Ollama example by default (no API key needed)
  // For other examples, uncomment them and set environment variables
  await localOllamaChat();

  // Uncomment to run cloud provider examples (requires API keys):
  // await basicOpenAIChat();
  // await streamingAnthropicChat();
  // await compareProviders();
  // await generateEmbeddings();
  await showUsageStats();
  // await errorHandling();

  // Reference optional functions to satisfy TypeScript
  void basicOpenAIChat;
  void streamingAnthropicChat;
  void compareProviders;
  void generateEmbeddings;
  void errorHandling;

  console.log('\n🔒 No keys were transmitted to any server!');
}

main().catch(console.error);
