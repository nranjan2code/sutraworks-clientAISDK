<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License" />
  <img src="https://img.shields.io/badge/tests-31%20passing-brightgreen.svg" alt="Tests Passing" />
  <img src="https://img.shields.io/badge/zero-dependencies-orange.svg" alt="Zero Dependencies" />
</p>

<h1 align="center">🧠 Sutraworks Client AI SDK</h1>

<p align="center">
  <strong>The universal client-side AI SDK with BYOK (Bring Your Own Key) architecture</strong>
</p>

<p align="center">
  <em>One SDK. 12+ Providers. Zero server trust. Your keys stay on your device.</em>
</p>

---

## ✨ Why Sutraworks?

Traditional AI integrations require sending your API keys to a backend server. **Sutraworks flips this model** — all AI calls happen directly from the browser using the user's own API keys, which never leave their device.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Traditional Architecture                      │
│                                                                 │
│   Browser  ──►  Your Server  ──►  AI Provider                   │
│              (keys stored here)    (OpenAI, etc)                │
│                    ⚠️ Risk                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Sutraworks Architecture                        │
│                                                                 │
│   Browser  ────────────────────►  AI Provider                   │
│   (keys stay here)                 (OpenAI, etc)                │
│        ✅ Secure                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Features

<table>
<tr>
<td width="50%">

### 🔐 Security First
- **Zero-trust server model** — keys never leave the browser
- **OWASP 2024 compliant** encryption (600k PBKDF2, SHA-512)
- **Auto-clear timers** — keys can expire automatically
- **Encrypted storage** options (memory, localStorage, IndexedDB)

</td>
<td width="50%">

### 🌐 Universal Provider Support
- OpenAI (GPT-4o, GPT-4 Turbo)
- Anthropic (Claude 4, Claude 3.5)
- Google (Gemini 2.0, Gemini Pro)
- Ollama (Local models)
- Mistral, Groq, Cohere
- Together AI, Fireworks, Perplexity
- DeepSeek, xAI (Grok)

</td>
</tr>
<tr>
<td>

### ⚡ Performance
- **Request deduplication** — no duplicate API calls
- **Intelligent caching** with SHA-256 keys & LRU eviction
- **Batch processing** with concurrency control
- **Circuit breaker** pattern for resilient retries

</td>
<td>

### 🔧 Developer Experience
- **Full TypeScript** support with rich types
- **Middleware pipeline** for request/response transformation
- **Prompt templates** with variable validation
- **ESM, CJS, UMD** builds for any environment

</td>
</tr>
</table>

## 📦 Installation

```bash
npm install @sutraworks/client-ai-sdk
```

```bash
yarn add @sutraworks/client-ai-sdk
```

```bash
pnpm add @sutraworks/client-ai-sdk
```

Or use directly in browser:
```html
<script src="https://unpkg.com/@sutraworks/client-ai-sdk/dist/umd/sutra-ai.umd.js"></script>
```

## 🎯 Quick Start

```typescript
import { SutraAI } from '@sutraworks/client-ai-sdk';

// Initialize the client
const ai = new SutraAI();

// User provides their own API key (stored locally only!)
await ai.setKey('openai', 'sk-...');

// Make requests using user's key
const response = await ai.chat({
  provider: 'openai',
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.choices[0].message.content);
```

### Simple Completion

```typescript
// One-liner for simple prompts
const answer = await ai.complete('What is the capital of France?');
// → "The capital of France is Paris."
```

### Streaming

```typescript
// Stream responses in real-time
for await (const chunk of ai.chatStream({
  provider: 'openai',
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: 'Write a poem about coding' }]
})) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
}
```

### Multiple Providers

```typescript
// Set up multiple providers
await ai.setKeys({
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AIza...'
});

// Use any provider with the same interface
const openaiResponse = await ai.chat({
  provider: 'openai',
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: 'Hello from OpenAI!' }]
});

const claudeResponse = await ai.chat({
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: 'Hello from Claude!' }]
});
```

## 🤖 Supported Providers

| Provider | Chat | Streaming | Embeddings | Vision | Local |
|----------|:----:|:---------:|:----------:|:------:|:-----:|
| **OpenAI** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Anthropic** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Google Gemini** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ollama** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Groq** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Mistral** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Cohere** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Together AI** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Fireworks AI** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Perplexity** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **DeepSeek** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **xAI (Grok)** | ✅ | ✅ | ❌ | ❌ | ❌ |

## 🔌 Middleware System

Transform requests and responses with a powerful middleware pipeline:

```typescript
import { 
  SutraAI, 
  createLoggingMiddleware,
  createRetryMiddleware,
  createRateLimitMiddleware 
} from '@sutraworks/client-ai-sdk';

const ai = new SutraAI();

// Add built-in middleware
ai.use(createLoggingMiddleware({ logRequests: true, logResponses: true }))
  .use(createRetryMiddleware({ maxRetries: 3 }))
  .use(createRateLimitMiddleware({ requestsPerMinute: 60 }));

// Or create custom middleware
ai.use({
  name: 'custom-middleware',
  beforeRequest: async (request, context) => {
    console.log(`Request ${context.requestId} starting...`);
    return request;
  },
  afterResponse: async (response, context) => {
    console.log(`Request completed in ${Date.now() - context.startTime}ms`);
    return response;
  }
});
```

### Built-in Middleware

| Middleware | Description |
|------------|-------------|
| `createLoggingMiddleware` | Log requests/responses (never logs keys) |
| `createRetryMiddleware` | Retry failed requests with exponential backoff |
| `createRateLimitMiddleware` | Client-side rate limiting |
| `createTimeoutMiddleware` | Request timeout handling |
| `createContentFilterMiddleware` | Filter/sanitize content |
| `createFallbackMiddleware` | Fallback to alternate providers on error |
| `createMetricsMiddleware` | Collect performance metrics |

## 📋 Prompt Templates

Define reusable prompts with variable substitution:

```typescript
// Register a template
ai.registerTemplate({
  name: 'code-review',
  system: 'You are a senior software engineer performing code reviews.',
  user: 'Review this {language} code and suggest improvements:\n\n```{language}\n{code}\n```',
  variables: [
    { name: 'language', required: true },
    { name: 'code', required: true }
  ],
  model: 'gpt-4-turbo',
  provider: 'openai'
});

// Execute template
const review = await ai.executeTemplate('code-review', {
  language: 'typescript',
  code: 'const x = 1; const y = 2; const z = x + y;'
});
```

## 🔄 Batch Processing

Process multiple requests efficiently:

```typescript
const results = await ai.batch({
  requests: [
    { provider: 'openai', model: 'gpt-4-turbo', messages: [{ role: 'user', content: 'Question 1' }] },
    { provider: 'openai', model: 'gpt-4-turbo', messages: [{ role: 'user', content: 'Question 2' }] },
    { provider: 'openai', model: 'gpt-4-turbo', messages: [{ role: 'user', content: 'Question 3' }] },
  ],
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});

console.log(`Success: ${results.summary.successful}, Failed: ${results.summary.failed}`);
console.log(`Total tokens: ${results.summary.totalTokens}`);
```

## 🔒 Security Features

### Encrypted Key Storage

```typescript
const ai = new SutraAI({
  keyStorage: {
    type: 'localStorage',      // or 'sessionStorage', 'indexedDB', 'memory'
    encrypt: true,             // Encrypt keys at rest (OWASP 2024 compliant)
    encryptionKey: 'user-password',
    prefix: 'myapp_',
    autoClearAfter: 3600000    // Auto-clear keys after 1 hour
  }
});
```

### Security Highlights

- 🔐 **600,000 PBKDF2 iterations** (OWASP 2024 recommendation)
- 🔐 **SHA-512** for key derivation
- 🔐 **AES-256-GCM** authenticated encryption
- 🔐 **Constant-time comparison** to prevent timing attacks
- 🔐 **Memory wiping** for sensitive data
- 🔐 **Key fingerprinting** for verification without exposure

## 📊 Usage Tracking

```typescript
// Make some requests...
await ai.chat({ ... });
await ai.chat({ ... });

// Check usage
const stats = ai.getUsageStats();
console.log(`Total tokens: ${stats.totalTokens}`);
console.log(`Total requests: ${stats.requests}`);
console.log(`Estimated cost: $${stats.estimatedCost.toFixed(4)}`);

// Usage by model
const byModel = ai.getUsageByModel();
console.log(byModel);
// { 'gpt-4-turbo': { input: 150, output: 200, cost: 0.0125 } }
```

## 🏠 Local Models with Ollama

Run AI completely locally with no API keys needed:

```typescript
const ai = new SutraAI({
  providers: {
    ollama: {
      baseUrl: 'http://localhost:11434/api'
    }
  }
});

// No API key required for local models!
const response = await ai.chat({
  provider: 'ollama',
  model: 'llama3.2',
  messages: [{ role: 'user', content: 'Hello!' }]
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
  <div id="output"></div>
  
  <script type="module">
    import { SutraAI } from 'https://unpkg.com/@sutraworks/client-ai-sdk/dist/esm/index.js';
    
    const ai = new SutraAI();
    
    // Get key from user (stored locally only!)
    const apiKey = prompt('Enter your OpenAI API key:');
    await ai.setKey('openai', apiKey);
    
    // Make request (directly from browser to OpenAI)
    const response = await ai.chat({
      provider: 'openai',
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: 'Hello!' }],
    });
    
    document.getElementById('output').textContent = 
      response.choices[0].message.content;
  </script>
</body>
</html>
```

## 🧹 Lifecycle Management

Proper cleanup prevents memory leaks:

```typescript
const ai = new SutraAI();

// ... use the client ...

// Clean up when done (clears keys, cache, timers, middleware)
await ai.destroy();

// Check if destroyed
if (ai.isDestroyed()) {
  console.log('Client has been cleaned up');
}
```

## 🛠️ Error Handling

```typescript
import { SutraAI, SutraError } from '@sutraworks/client-ai-sdk';

try {
  const response = await ai.chat({...});
} catch (error) {
  if (error instanceof SutraError) {
    console.log('Code:', error.code);           // 'RATE_LIMITED', 'KEY_INVALID', etc.
    console.log('Provider:', error.provider);    // 'openai', 'anthropic', etc.
    console.log('Retryable:', error.retryable); // true/false
    console.log('Retry After:', error.retryAfter); // ms to wait
    
    if (error.code === 'RATE_LIMITED' && error.retryable) {
      await sleep(error.retryAfter);
      // Retry...
    }
  }
}
```

## 📁 Project Structure

```
src/
├── index.ts              # Main entry point & exports
├── core/
│   ├── client.ts         # Unified AI client
│   ├── config.ts         # Configuration management
│   └── registry.ts       # Provider registry
├── providers/            # Provider adapters (OpenAI, Anthropic, etc.)
├── middleware/           # Middleware system
├── keys/                 # Key management & encryption
├── streaming/            # Stream handling & parsing
├── utils/                # Cache, retry, tokens, events
└── types/                # TypeScript definitions
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run tests (31 tests)
npm test

# Build all formats (ESM, CJS, UMD, Types)
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## 📦 Build Outputs

| Format | Path | Use Case |
|--------|------|----------|
| **ESM** | `dist/esm/` | Modern browsers, Vite, webpack, Rollup |
| **CJS** | `dist/cjs/` | Node.js, older bundlers |
| **UMD** | `dist/umd/` | Script tags, legacy browsers |
| **Types** | `dist/types/` | TypeScript declarations |

## 📄 API Reference

### SutraAI Class

| Method | Description |
|--------|-------------|
| `setKey(provider, key)` | Set API key for a provider |
| `setKeys(keys)` | Set multiple API keys at once |
| `hasKey(provider)` | Check if key exists |
| `removeKey(provider)` | Remove a key |
| `clearKeys()` | Remove all keys |
| `chat(request)` | Execute chat completion |
| `chatStream(request)` | Stream chat completion |
| `chatStreamCollect(request)` | Stream and collect full response |
| `complete(prompt, options?)` | Simple text completion |
| `completeStream(prompt, options?)` | Stream text completion |
| `batch(batchRequest)` | Process multiple requests |
| `embed(request)` | Generate embeddings |
| `use(middleware)` | Add middleware |
| `removeMiddleware(name)` | Remove middleware |
| `registerTemplate(template)` | Register prompt template |
| `executeTemplate(name, vars)` | Execute template |
| `getUsageStats()` | Get usage statistics |
| `getUsageByModel()` | Get usage by model |
| `setCache(enabled, options?)` | Configure caching |
| `getCacheStats()` | Get cache statistics |
| `destroy()` | Clean up all resources |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

MIT © [Sutraworks](https://github.com/nranjan2code)

---

<p align="center">
  <strong>Built with ❤️ for developers who care about security and privacy</strong>
</p>

<p align="center">
  <a href="https://github.com/nranjan2code/sutraworks-clientAISDK/issues">Report Bug</a>
  ·
  <a href="https://github.com/nranjan2code/sutraworks-clientAISDK/issues">Request Feature</a>
  ·
  <a href="https://github.com/nranjan2code/sutraworks-clientAISDK/stargazers">⭐ Star this repo</a>
</p>
