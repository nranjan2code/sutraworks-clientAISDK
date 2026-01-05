# 🔮 Sutra AI SDK

> **The best client-side JavaScript/TypeScript SDK for AI with BYOK (Bring Your Own Key) architecture.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen.svg)]()

## 🌟 Key Features

- **🔐 100% Client-Side** - All API calls happen directly from the browser to AI providers
- **🔑 BYOK Architecture** - Users bring their own API keys, stored only locally
- **🚫 Zero Server Storage** - Keys and prompts never touch any server
- **🖥️ Local AI Support** - Full Ollama integration for offline AI
- **📦 Zero Dependencies** - Browser-native APIs only
- **🌐 10+ AI Providers** - Unified interface across all major providers
- **⚡ Streaming** - Real-time token streaming support
- **📊 Usage Tracking** - Built-in token counting and cost estimation

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User's Browser                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  Your App   │───▶│  Sutra SDK  │───▶│ AI Provider APIs    │ │
│  └─────────────┘    └─────────────┘    │ (OpenAI, Anthropic, │ │
│                            │           │  Ollama, etc.)       │ │
│                            ▼           └─────────────────────┘ │
│                    ┌─────────────┐                              │
│                    │ Local Key   │                              │
│                    │ Storage     │                              │
│                    └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                      ❌ No Server Needed!
```

## 📦 Installation

```bash
npm install @sutraworks/client-ai-sdk
```

Or include via CDN:

```html
<script src="https://unpkg.com/@sutraworks/client-ai-sdk/dist/umd/sutra-ai.umd.js"></script>
```

## 🚀 Quick Start

```typescript
import { SutraAI } from '@sutraworks/client-ai-sdk';

// Initialize the SDK
const ai = new SutraAI();

// User provides their own API key (stored locally only!)
ai.setKey('openai', 'sk-...');

// Make requests using user's key and compute
const response = await ai.chat({
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
});

console.log(response.content);
```

## 🔐 Security: Your Keys, Your Control

The Sutra SDK is built on a **zero-trust server model**:

- ✅ Keys stored **only** in browser memory, localStorage, or sessionStorage
- ✅ All AI API calls made **directly** from client to provider
- ✅ Server **never** receives keys, prompts, or raw responses
- ✅ Optional client-side encryption for stored keys
- ✅ Keys are **never** logged or exposed

```typescript
// Keys are stored locally and never transmitted to any server
ai.setKey('openai', 'sk-...'); // Stored in browser only

// Optional: Use encrypted storage
const ai = new SutraAI({
  keyStorage: 'indexeddb', // Encrypted IndexedDB storage
  encryption: true,
});
```

## 🤖 Supported Providers

| Provider | Chat | Streaming | Embeddings | Local |
|----------|------|-----------|------------|-------|
| **OpenAI** | ✅ | ✅ | ✅ | ❌ |
| **Anthropic** | ✅ | ✅ | ❌ | ❌ |
| **Google Gemini** | ✅ | ✅ | ✅ | ❌ |
| **Ollama** | ✅ | ✅ | ✅ | ✅ |
| **Groq** | ✅ | ✅ | ❌ | ❌ |
| **Mistral** | ✅ | ✅ | ✅ | ❌ |
| **Cohere** | ✅ | ✅ | ✅ | ❌ |
| **Together AI** | ✅ | ✅ | ✅ | ❌ |
| **Fireworks AI** | ✅ | ✅ | ✅ | ❌ |
| **Perplexity** | ✅ | ✅ | ❌ | ❌ |

## 📖 API Reference

### Initialization

```typescript
import { SutraAI } from '@sutraworks/client-ai-sdk';

const ai = new SutraAI({
  // Configuration options
  caching: true,              // Enable response caching
  debug: false,               // Enable debug logging
  keyStorage: 'sessionStorage', // 'memory' | 'localStorage' | 'sessionStorage' | 'indexeddb'
  encryption: false,          // Encrypt stored keys
  
  // Provider-specific settings
  providers: {
    ollama: {
      baseUrl: 'http://localhost:11434',
    },
    openai: {
      baseUrl: 'https://api.openai.com/v1',
    },
  },
});
```

### Key Management

```typescript
// Set API key for a provider
ai.setKey('openai', 'sk-...');
ai.setKey('anthropic', 'sk-ant-...');

// Check if key exists
const hasKey = ai.hasKey('openai'); // true/false

// Get key (if needed)
const key = ai.getKey('openai');

// Clear key
ai.clearKey('openai');

// Clear all keys
ai.clearAllKeys();
```

### Chat Completion

```typescript
const response = await ai.chat({
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

console.log(response.content);
console.log(response.usage); // { prompt_tokens, completion_tokens, total_tokens }
```

### Streaming

```typescript
const stream = ai.chatStream({
  provider: 'anthropic',
  model: 'claude-3-sonnet-20240229',
  messages: [{ role: 'user', content: 'Tell me a story.' }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

### Embeddings

```typescript
const embeddings = await ai.embed({
  provider: 'openai',
  model: 'text-embedding-3-small',
  input: ['Hello world', 'How are you?'],
});

console.log(embeddings[0]); // [0.123, -0.456, ...]
```

### List Models

```typescript
// List all models for a provider
const models = await ai.listModels('openai');
// ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo', ...]

// List all models across all configured providers
const allModels = await ai.listAllModels();
```

### Events

```typescript
// Listen to SDK events
ai.on('request:start', (event) => {
  console.log('Starting request to', event.provider);
});

ai.on('request:complete', (event) => {
  console.log('Request completed in', event.duration, 'ms');
});

ai.on('request:error', (event) => {
  console.error('Error:', event.error);
});

ai.on('stream:chunk', (event) => {
  console.log('Received chunk:', event.content);
});
```

### Usage Statistics

```typescript
const stats = ai.getUsageStats();
console.log(stats.totalTokens);    // Total tokens used
console.log(stats.totalCost);      // Estimated cost in USD
console.log(stats.requests);        // Number of requests made

// Per-provider breakdown
console.log(stats.byProvider.openai);
```

## 🖥️ Local AI with Ollama

Run AI completely locally - no API keys needed, no data leaves your machine:

```bash
# Install Ollama (https://ollama.ai)
curl -fsSL https://ollama.ai/install.sh | sh

# Download a model
ollama pull llama2

# Start the server
ollama serve
```

```typescript
import { SutraAI } from '@sutraworks/client-ai-sdk';

const ai = new SutraAI();

// No key needed for Ollama!
const response = await ai.chat({
  provider: 'ollama',
  model: 'llama2',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## 🌐 Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>AI Chat</title>
</head>
<body>
  <script type="module">
    import { SutraAI } from '@sutraworks/client-ai-sdk';
    
    const ai = new SutraAI();
    
    // Get key from user input
    const apiKey = prompt('Enter your OpenAI API key:');
    ai.setKey('openai', apiKey);
    
    // Make request (directly from browser to OpenAI)
    const response = await ai.chat({
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello!' }],
    });
    
    alert(response.content);
  </script>
</body>
</html>
```

## 📊 Token Counting & Cost Estimation

```typescript
import { estimateTokens, estimateCost } from '@sutraworks/client-ai-sdk';

// Estimate tokens before sending
const tokens = estimateTokens('Hello, how are you today?');
console.log(tokens); // ~7

// Estimate cost
const cost = estimateCost({
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
  inputTokens: 100,
  outputTokens: 500,
});
console.log(cost); // { inputCost: 0.001, outputCost: 0.015, totalCost: 0.016 }
```

## 🔄 Switching Providers

Easily switch between providers with the same interface:

```typescript
const prompt = 'Explain quantum computing in simple terms.';

// OpenAI
const openai = await ai.chat({
  provider: 'openai',
  model: 'gpt-4-turbo-preview',
  messages: [{ role: 'user', content: prompt }],
});

// Anthropic
const anthropic = await ai.chat({
  provider: 'anthropic',
  model: 'claude-3-sonnet-20240229',
  messages: [{ role: 'user', content: prompt }],
});

// Local Ollama (free!)
const local = await ai.chat({
  provider: 'ollama',
  model: 'llama2',
  messages: [{ role: 'user', content: prompt }],
});
```

## 🛠️ Error Handling

```typescript
import { SutraError } from '@sutraworks/client-ai-sdk';

try {
  const response = await ai.chat({...});
} catch (error) {
  if (error instanceof SutraError) {
    console.log('Type:', error.type);        // 'authentication' | 'rate_limit' | 'invalid_request' | etc.
    console.log('Provider:', error.provider); // 'openai' | 'anthropic' | etc.
    console.log('Message:', error.message);
    console.log('Status:', error.status);     // HTTP status code
  }
}
```

## 📦 Build Outputs

The SDK is built for multiple environments:

- **ESM**: `dist/esm/` - Modern browsers, bundlers (Vite, webpack, etc.)
- **UMD**: `dist/umd/` - Script tags, legacy browsers
- **CJS**: `dist/cjs/` - Node.js compatibility
- **Types**: `dist/types/` - TypeScript declarations

## 🧪 Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## 📜 License

MIT © Sutraworks

---

<p align="center">
  <strong>Built with 💜 for developers who care about user privacy</strong>
</p>
