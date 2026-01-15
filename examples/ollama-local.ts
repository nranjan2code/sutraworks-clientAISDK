/**
 * Sutra AI SDK - Ollama (Local Models) Example
 * 
 * Demonstrates running AI completely locally with Ollama.
 * No API keys needed, no data leaves your machine!
 */

import { SutraAI, type ChatResponse, type ChatStreamDelta } from '../src/index.js';

const ai = new SutraAI({
  providers: {
    ollama: {
      name: 'ollama',
      baseUrl: 'http://localhost:11434', // Default Ollama URL
    },
  },
  debug: true,
});

// Helper to extract content from response
function getContent(response: ChatResponse): string {
  const content = response.choices[0]?.message?.content;
  if (typeof content === 'string') return content;
  return content?.map(p => p.text ?? '').join('') ?? '';
}

// Helper to extract content from streaming chunk
function getChunkContent(chunk: ChatStreamDelta): string {
  const content = chunk.choices[0]?.delta?.content;
  return typeof content === 'string' ? content : '';
}

// Example 1: List Available Local Models
async function listLocalModels() {
  console.log('\n=== Available Local Models ===\n');

  try {
    const models = await ai.listModels('ollama');
    console.log('Installed models:');
    models.forEach((model, i) => {
      console.log(`  ${i + 1}. ${model.id}`);
    });
    return models;
  } catch (_error) {
    console.error('Error: Is Ollama running? Start with: ollama serve');
    return [];
  }
}

// Example 2: Basic Chat with Ollama
async function basicOllamaChat() {
  console.log('\n=== Basic Ollama Chat ===\n');

  const response = await ai.chat({
    provider: 'ollama',
    model: 'llama2', // or llama3, mistral, codellama, etc.
    messages: [
      { role: 'system', content: 'You are a helpful coding assistant.' },
      { role: 'user', content: 'Write a Python function to calculate fibonacci numbers.' },
    ],
    temperature: 0.7,
  });

  console.log('Response:', getContent(response));
}

// Example 3: Streaming with Ollama
async function streamingOllamaChat() {
  console.log('\n=== Streaming Ollama Chat ===\n');

  const stream = ai.chatStream({
    provider: 'ollama',
    model: 'mistral',
    messages: [
      { role: 'user', content: 'Explain the concept of recursion with an example.' },
    ],
  });

  process.stdout.write('Response: ');

  for await (const chunk of stream) {
    process.stdout.write(getChunkContent(chunk));
  }

  console.log('\n');
}

// Example 4: Code Generation with CodeLlama
async function codeGeneration() {
  console.log('\n=== Code Generation with CodeLlama ===\n');

  const response = await ai.chat({
    provider: 'ollama',
    model: 'codellama', // Specialized for code
    messages: [
      {
        role: 'user',
        content: `Write a TypeScript class that implements a simple LRU cache with the following methods:
- get(key: string): T | undefined
- set(key: string, value: T): void
- has(key: string): boolean
- delete(key: string): boolean
- clear(): void`,
      },
    ],
  });

  console.log('Generated code:', getContent(response));
}

// Example 5: Multi-turn Conversation
async function multiTurnConversation() {
  console.log('\n=== Multi-turn Conversation ===\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  async function chat(userMessage: string) {
    messages.push({ role: 'user', content: userMessage });

    const response = await ai.chat({
      provider: 'ollama',
      model: 'llama2',
      messages: [
        { role: 'system', content: 'You are a helpful math tutor.' },
        ...messages,
      ],
    });

    const responseContent = getContent(response);
    messages.push({ role: 'assistant', content: responseContent });
    return responseContent;
  }

  console.log('User: What is calculus?');
  console.log('Assistant:', await chat('What is calculus?'));

  console.log('\nUser: Give me a simple example.');
  console.log('Assistant:', await chat('Give me a simple example.'));

  console.log('\nUser: How is this used in real life?');
  console.log('Assistant:', await chat('How is this used in real life?'));
}

// Example 6: Batch Processing (Offline Capable)
async function batchProcessing() {
  console.log('\n=== Batch Processing (Offline) ===\n');

  const questions = [
    'What is machine learning?',
    'What is deep learning?',
    'What is a neural network?',
  ];

  console.log('Processing', questions.length, 'questions locally...\n');

  const results = [];

  for (const question of questions) {
    const start = Date.now();
    const response = await ai.chat({
      provider: 'ollama',
      model: 'mistral',
      messages: [{ role: 'user', content: question }],
    });
    const duration = Date.now() - start;

    results.push({
      question,
      answer: getContent(response).slice(0, 100) + '...',
      duration: `${duration}ms`,
    });
  }

  console.table(results);
}

// Example 7: Compare Local vs Remote
async function compareLocalRemote() {
  console.log('\n=== Local vs Remote Comparison ===\n');

  const prompt = 'Explain what an API is in one sentence.';

  // Local (Ollama)
  console.log('Testing Ollama (local)...');
  const ollamaStart = Date.now();
  const ollamaResponse = await ai.chat({
    provider: 'ollama',
    model: 'llama2',
    messages: [{ role: 'user', content: prompt }],
  });
  const ollamaDuration = Date.now() - ollamaStart;

  console.log(`Ollama (${ollamaDuration}ms): ${getContent(ollamaResponse)}\n`);

  // Remote (OpenAI) - only if key is set
  if (process.env.OPENAI_API_KEY) {
    ai.setKey('openai', process.env.OPENAI_API_KEY);

    console.log('Testing OpenAI (remote)...');
    const openaiStart = Date.now();
    const openaiResponse = await ai.chat({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    });
    const openaiDuration = Date.now() - openaiStart;

    console.log(`OpenAI (${openaiDuration}ms): ${getContent(openaiResponse)}\n`);
  }

  console.log('Key differences:');
  console.log('  - Ollama: Free, private, works offline');
  console.log('  - OpenAI: Faster, more capable, requires internet');
}

// Example 8: Custom Ollama Endpoint
async function customEndpoint() {
  console.log('\n=== Custom Ollama Endpoint ===\n');

  // Connect to Ollama on a different machine
  const remoteAI = new SutraAI({
    providers: {
      ollama: {
        name: 'ollama',
        baseUrl: 'http://192.168.1.100:11434', // Remote Ollama server
      },
    },
  });

  // This would connect to an Ollama instance on another machine
  // Useful for home servers or local network setups
  console.log('Configured for remote Ollama at 192.168.1.100:11434');
  console.log('Available providers:', remoteAI.getProviders());

  // Clean up
  await remoteAI.destroy();
}

// Run examples
async function main() {
  console.log('🔮 Sutra AI SDK - Ollama (Local Models) Examples\n');
  console.log('Make sure Ollama is running: ollama serve');
  console.log('Download models with: ollama pull llama2\n');

  const models = await listLocalModels();

  if (models.length === 0) {
    console.log('\nNo models found. Install one with:');
    console.log('  ollama pull llama2');
    console.log('  ollama pull mistral');
    console.log('  ollama pull codellama');
    return;
  }

  // Run examples if models are available
  if (models.length > 0) {
    await basicOllamaChat();
  }

  // Show custom endpoint configuration
  await customEndpoint();

  // Reference optional functions to satisfy TypeScript
  void streamingOllamaChat;
  void codeGeneration;
  void multiTurnConversation;
  void batchProcessing;
  void compareLocalRemote;

  // Uncomment to run more examples:
  // await streamingOllamaChat();
  // await codeGeneration();
  // await multiTurnConversation();
  // await batchProcessing();
  // await compareLocalRemote();
}

main().catch(console.error);
