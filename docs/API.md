# API Reference

Complete API documentation for Sutraworks Client AI SDK v2.0.

## Table of Contents

- [SutraAI Class](#sutraai-class)
- [Configuration](#configuration)
- [Key Management](#key-management)
- [Chat Completions](#chat-completions)
- [Streaming](#streaming)
- [Batch Processing](#batch-processing)
- [Embeddings](#embeddings)
- [Provider Management](#provider-management)
- [Utilities](#utilities)
- [Caching](#caching)
- [Middleware](#middleware)
- [Prompt Templates](#prompt-templates)
- [Error Handling](#error-handling)
- [Events](#events)
- [Types Reference](#types-reference)

---

## SutraAI Class

The main client class for interacting with AI providers.

### Constructor

```typescript
import { SutraAI } from '@sutraworks/client-ai-sdk';

const ai = new SutraAI(config?: SutraConfig);
```

#### SutraConfig Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `providers` | `Record<ProviderName, ProviderConfig>` | `{}` | Provider-specific configurations |
| `keyStorage` | `KeyStorageOptions` | `{ type: 'memory' }` | Key storage configuration |
| `cache` | `CacheOptions` | `{ enabled: false }` | Response caching options |
| `defaultTimeout` | `number` | `30000` | Default request timeout (ms) |
| `defaultMaxRetries` | `number` | `3` | Default retry attempts |
| `middleware` | `Middleware[]` | `[]` | Global middleware |
| `deduplicateRequests` | `boolean` | `true` | Prevent duplicate concurrent requests |
| `enableValidation` | `boolean` | `true` | Enable request validation middleware |
| `debug` | `boolean` | `false` | Enable debug logging (never logs keys) |

### Lifecycle Methods

#### `destroy()`

Clean up all resources. Call when done using the client.

```typescript
await ai.destroy();
```

#### `isDestroyed()`

Check if client has been destroyed.

```typescript
if (ai.isDestroyed()) {
  console.log('Client has been cleaned up');
}
```

---

## Key Management

### `setKey(provider, key)`

Set an API key for a provider.

```typescript
await ai.setKey('openai', 'sk-...');
```

**Parameters:**
- `provider`: `ProviderName` - Provider identifier
- `key`: `string` - API key

**Returns:** `Promise<void>`

### `setKeys(keys)`

Set multiple API keys at once.

```typescript
await ai.setKeys({
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AIza...'
});
```

**Parameters:**
- `keys`: `Record<ProviderName, string>` - Map of provider to key

**Returns:** `Promise<void>`

### `hasKey(provider)`

Check if an API key exists for a provider.

```typescript
const hasOpenAI = await ai.hasKey('openai'); // true/false
```

**Parameters:**
- `provider`: `ProviderName` - Provider identifier

**Returns:** `Promise<boolean>`

### `removeKey(provider)`

Remove an API key.

```typescript
await ai.removeKey('openai');
```

**Parameters:**
- `provider`: `ProviderName` - Provider identifier

**Returns:** `Promise<void>`

### `clearKeys()`

Remove all API keys.

```typescript
await ai.clearKeys();
```

**Returns:** `Promise<void>`

### `getKeyFingerprint(provider)`

Get a secure fingerprint of a key (for verification without exposure).

```typescript
const fingerprint = await ai.getKeyFingerprint('openai');
// "sha256:a1b2c3d4..."
```

**Parameters:**
- `provider`: `ProviderName` - Provider identifier

**Returns:** `Promise<string | null>`

### `listStoredKeys()`

List all providers that have stored API keys.

```typescript
const providers = await ai.listStoredKeys();
// ['openai', 'anthropic', 'google']
```

**Returns:** `Promise<ProviderName[]>`

### `updateKeyStorage(options)`

Update key storage configuration at runtime.

```typescript
await ai.updateKeyStorage({
  encrypt: true,
  autoClearAfter: 7200000 // 2 hours
});
```

**Parameters:**
- `options`: `Partial<KeyStorageOptions>` - Storage options to update

**Returns:** `Promise<void>`

---

## Chat Completions

### `chat(request)`

Execute a chat completion request.

```typescript
const response = await ai.chat({
  provider: 'openai',
  model: 'gpt-4-turbo',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ],
  temperature: 0.7,
  max_tokens: 1000
});

console.log(response.choices[0].message.content);
```

#### ChatRequest Options

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `provider` | `ProviderName` | Yes | Provider to use |
| `model` | `string` | Yes | Model identifier |
| `messages` | `Message[]` | Yes | Conversation messages |
| `temperature` | `number` | No | Randomness (0-2) |
| `max_tokens` | `number` | No | Maximum response tokens |
| `top_p` | `number` | No | Nucleus sampling (0-1) |
| `frequency_penalty` | `number` | No | Frequency penalty (-2 to 2) |
| `presence_penalty` | `number` | No | Presence penalty (-2 to 2) |
| `stop` | `string[]` | No | Stop sequences |
| `tools` | `Tool[]` | No | Available tools/functions |
| `response_format` | `{ type: 'json_object' }` | No | Force JSON output |
| `stream` | `boolean` | No | Enable streaming |
| `signal` | `AbortSignal` | No | Abort controller signal |

#### ChatResponse

```typescript
interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  provider: ProviderName;
  choices: ChatChoice[];
  usage?: Usage;
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
    timeToFirstToken?: number;
  };
}

interface ChatChoice {
  index: number;
  message: Message;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}
```

### `complete(prompt, options?)`

Simple text completion (convenience method).

```typescript
const answer = await ai.complete('What is the capital of France?');
// "The capital of France is Paris."

// With options
const answer = await ai.complete('Explain quantum computing', {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  max_tokens: 500
});
```

**Parameters:**
- `prompt`: `string` - The prompt text
- `options`: `Partial<ChatRequest>` - Optional configuration

**Returns:** `Promise<string>` - The response text

---

## Streaming

### `chatStream(request)`

Stream a chat completion response.

```typescript
for await (const chunk of ai.chatStream({
  provider: 'openai',
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: 'Write a story' }]
})) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

**Returns:** `AsyncIterable<ChatStreamDelta>`

#### ChatStreamDelta

```typescript
interface ChatStreamDelta {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  provider: ProviderName;
  choices: {
    index: number;
    delta: Partial<Message>;
    finish_reason: 'stop' | 'length' | 'tool_calls' | null;
  }[];
  usage?: Usage;
}
```

### `chatStreamCollect(request)`

Stream and collect the full response.

```typescript
const response = await ai.chatStreamCollect({
  provider: 'openai',
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: 'Hello' }]
});

console.log(response.choices[0].message.content);
```

**Returns:** `Promise<ChatResponse>`

### `completeStream(prompt, options?)`

Stream a simple text completion.

```typescript
for await (const text of ai.completeStream('Tell me a joke')) {
  process.stdout.write(text);
}
```

**Returns:** `AsyncIterable<string>`

### Aborting Streams

```typescript
const controller = new AbortController();

// Start streaming
const stream = ai.chatStream({
  provider: 'openai',
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: 'Write a very long story' }],
  signal: controller.signal
});

// Abort after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  for await (const chunk of stream) {
    console.log(chunk);
  }
} catch (error) {
  if (error.code === 'ABORTED') {
    console.log('Stream was aborted');
  }
}
```

---

## Batch Processing

### `batch(request)`

Process multiple requests efficiently.

```typescript
const results = await ai.batch({
  requests: [
    { provider: 'openai', model: 'gpt-4-turbo', messages: [{ role: 'user', content: 'Q1' }] },
    { provider: 'openai', model: 'gpt-4-turbo', messages: [{ role: 'user', content: 'Q2' }] },
    { provider: 'openai', model: 'gpt-4-turbo', messages: [{ role: 'user', content: 'Q3' }] },
  ],
  concurrency: 3,
  stopOnError: false,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  }
});

// Access results
results.results.forEach((result, index) => {
  if (result.success) {
    console.log(`Request ${index}: ${result.response.choices[0].message.content}`);
  } else {
    console.error(`Request ${index} failed: ${result.error.message}`);
  }
});

// Summary
console.log(`Success: ${results.summary.successful}`);
console.log(`Failed: ${results.summary.failed}`);
console.log(`Total tokens: ${results.summary.totalTokens}`);
```

#### BatchRequest Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `requests` | `ChatRequest[]` | Required | Array of requests |
| `concurrency` | `number` | `5` | Max concurrent requests |
| `stopOnError` | `boolean` | `false` | Stop on first error |
| `onProgress` | `(completed, total) => void` | - | Progress callback |

#### BatchResponse

```typescript
interface BatchResponse {
  results: Array<{
    index: number;
    success: boolean;
    response?: ChatResponse;
    error?: SutraError;
    duration: number;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalDuration: number;
    totalTokens: number;
  };
}
```

---

## Embeddings

### `embed(request)`

Generate embeddings for text.

```typescript
const response = await ai.embed({
  provider: 'openai',
  model: 'text-embedding-3-small',
  input: ['Hello world', 'Goodbye world']
});

console.log(response.data[0].embedding); // [0.123, -0.456, ...]
console.log(response.data[0].embedding.length); // 1536
```

#### EmbeddingRequest

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `provider` | `ProviderName` | Yes | Provider to use |
| `model` | `string` | Yes | Embedding model |
| `input` | `string \| string[]` | Yes | Text(s) to embed |
| `dimensions` | `number` | No | Output dimensions (if supported) |

#### EmbeddingResponse

```typescript
interface EmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    index: number;
    embedding: number[];
  }>;
  model: string;
  provider: ProviderName;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
```

---

## Provider Management

### `getProviders()`

Get a list of all available providers.

```typescript
const providers = ai.getProviders();
// ['openai', 'anthropic', 'google', 'ollama', ...]
```

**Returns:** `ProviderName[]`

### `supportsFeature(provider, feature)`

Check if a provider supports a specific feature.

```typescript
const hasVision = ai.supportsFeature('openai', 'vision'); // true
const hasEmbeddings = ai.supportsFeature('groq', 'embeddings'); // false
```

**Parameters:**
- `provider`: `ProviderName` - Provider to check
- `feature`: `'streaming' | 'embeddings' | 'vision' | 'tools'` - Feature to check

**Returns:** `boolean`

### `configureProvider(provider, config)`

Update provider configuration at runtime.

```typescript
ai.configureProvider('ollama', {
  baseUrl: 'http://192.168.1.100:11434/api',
  timeout: 60000
});
```

**Parameters:**
- `provider`: `ProviderName` - Provider to configure
- `config`: Provider configuration options

**Returns:** `void`

### `listModels(provider)`

List available models from a provider.

```typescript
const models = await ai.listModels('openai');
// [{ id: 'gpt-4-turbo', ... }, ...]
```

**Parameters:**
- `provider`: `ProviderName` - Provider to list models from

**Returns:** `Promise<ModelInfo[]>`

### `listAllModels()`

List models from all configured providers.

```typescript
const allModels = await ai.listAllModels();
```

**Returns:** `Promise<ModelInfo[]>`

---

## Utilities

### `estimateTokens(messages)`

Estimate token count for a message array.

```typescript
const tokens = ai.estimateTokens([
  { role: 'user', content: 'Hello, how are you?' }
]);
// 6
```

**Parameters:**
- `messages`: `Message[]` - Array of messages

**Returns:** `number`

### `estimateCost(inputTokens, outputTokens, model)`

Estimate cost for a request.

```typescript
const cost = ai.estimateCost(1000, 500, 'gpt-4-turbo');
// { input: 0.01, output: 0.015, total: 0.025 }
```

**Parameters:**
- `inputTokens`: `number` - Input token count
- `outputTokens`: `number` - Output token count
- `model`: `string` - Model identifier

**Returns:** `{ input: number; output: number; total: number }`

### `resetUsageStats()`

Reset all usage statistics.

```typescript
ai.resetUsageStats();
```

**Returns:** `void`

### `setDebug(enabled)`

Enable or disable debug mode.

```typescript
ai.setDebug(true); // Enable debug logging
```

**Parameters:**
- `enabled`: `boolean` - Whether to enable debug mode

**Returns:** `void`

---

## Caching

### `setCache(enabled, options?)`

Enable or disable response caching.

```typescript
ai.setCache(true, {
  ttl: 3600000,      // 1 hour
  maxEntries: 1000,
  maxSize: 50000000  // 50 MB
});
```

**Parameters:**
- `enabled`: `boolean` - Enable/disable caching
- `options`: `{ ttl?: number; maxEntries?: number; maxSize?: number }` - Cache options

**Returns:** `void`

### `clearCache()`

Clear the response cache.

```typescript
ai.clearCache();
```

**Returns:** `void`

### `getCacheStats()`

Get cache statistics.

```typescript
const stats = ai.getCacheStats();
// { size: 42, totalHits: 150, avgHits: 3.5, memoryUsage: 1024000 }
```

**Returns:** `{ size: number; totalHits: number; avgHits: number; memoryUsage: number } | null`

---

## Middleware

### `use(middleware)`

Add middleware to the pipeline.

```typescript
ai.use({
  name: 'logger',
  priority: 100, // Higher = runs first
  beforeRequest: async (request, context) => {
    console.log(`[${context.requestId}] Starting request`);
    return request;
  },
  afterResponse: async (response, context) => {
    console.log(`[${context.requestId}] Completed in ${Date.now() - context.startTime}ms`);
    return response;
  },
  onError: async (error, context) => {
    console.error(`[${context.requestId}] Error: ${error.message}`);
    throw error; // Re-throw or return to suppress
  }
});
```

#### Middleware Interface

```typescript
interface Middleware {
  name: string;
  priority?: number; // Default: 0
  enabled?: boolean; // Default: true
  beforeRequest?: (request: ChatRequest, context: MiddlewareContext) => Promise<ChatRequest>;
  afterResponse?: (response: ChatResponse, context: MiddlewareContext) => Promise<ChatResponse>;
  onError?: (error: Error, context: MiddlewareContext) => Promise<Error | void>;
}

interface MiddlewareContext {
  requestId: string;
  provider: ProviderName;
  model: string;
  startTime: number;
  attempt: number;
  metadata: Record<string, unknown>;
}
```

### Built-in Middleware

```typescript
import {
  createLoggingMiddleware,
  createRetryMiddleware,
  createRateLimitMiddleware,
  createTimeoutMiddleware,
  createContentFilterMiddleware,
  createFallbackMiddleware,
  createMetricsMiddleware,
  createValidationMiddleware,
  createSanitizingMiddleware,
} from '@sutraworks/client-ai-sdk';

// Logging (never logs keys)
ai.use(createLoggingMiddleware({
  logRequests: true,
  logResponses: true,
  logErrors: true
}));

// Retry with exponential backoff
ai.use(createRetryMiddleware({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000
}));

// Rate limiting
ai.use(createRateLimitMiddleware({
  requestsPerMinute: 60,
  tokensPerMinute: 100000
}));

// Timeout
ai.use(createTimeoutMiddleware({
  timeout: 30000
}));

// Content filtering
ai.use(createContentFilterMiddleware({
  blockPatterns: [/password/i, /secret/i],
  sanitize: true
}));

// Fallback providers
ai.use(createFallbackMiddleware({
  fallbacks: {
    openai: ['anthropic', 'google'],
    anthropic: ['openai']
  }
}));

// Metrics collection
ai.use(createMetricsMiddleware({
  onMetrics: (metrics) => {
    console.log(`Latency: ${metrics.latency}ms`);
    console.log(`Tokens: ${metrics.tokens}`);
  }
}));

// Request validation
ai.use(createValidationMiddleware({
  strict: true,
  maxMessages: 100,
  maxContentLength: 100000
}));
```

### `removeMiddleware(name)`

Remove middleware by name.

```typescript
ai.removeMiddleware('logger');
```

### `listMiddleware()`

List all middleware names.

```typescript
const names = ai.listMiddleware();
// ['validation', 'logger', 'retry']
```

### `toggleMiddleware(name, enabled)`

Enable or disable middleware at runtime.

```typescript
ai.toggleMiddleware('logging', false); // Disable logging
ai.toggleMiddleware('logging', true);  // Re-enable logging
```

---

## Prompt Templates

### `registerTemplate(template)`

Register a reusable prompt template.

```typescript
ai.registerTemplate({
  name: 'code-review',
  description: 'Review code and suggest improvements',
  system: 'You are a senior software engineer performing code reviews.',
  user: 'Review this {language} code:\n\n```{language}\n{code}\n```',
  variables: [
    { name: 'language', required: true },
    { name: 'code', required: true }
  ],
  provider: 'openai',
  model: 'gpt-4-turbo',
  options: {
    temperature: 0.3,
    max_tokens: 2000
  }
});
```

#### PromptTemplate

```typescript
interface PromptTemplate {
  name: string;
  description?: string;
  system?: string;
  user: string;
  assistant?: string;
  variables?: TemplateVariable[];
  provider?: ProviderName;
  model?: string;
  options?: Partial<ChatRequest>;
}

interface TemplateVariable {
  name: string;
  description?: string;
  required?: boolean;
  default?: string;
  validate?: (value: string) => boolean;
}
```

### `executeTemplate(name, variables, options?)`

Execute a registered template.

```typescript
const review = await ai.executeTemplate('code-review', {
  language: 'typescript',
  code: 'const x = 1; const y = 2;'
});

console.log(review.choices[0].message.content);
```

### `listTemplates()`

List all registered template names.

```typescript
const templates = ai.listTemplates();
// ['code-review', 'summarize', 'translate']
```

### `removeTemplate(name)`

Remove a template.

```typescript
ai.removeTemplate('code-review');
```

---

## Error Handling

### SutraError

All SDK errors are instances of `SutraError`.

```typescript
import { SutraError } from '@sutraworks/client-ai-sdk';

try {
  await ai.chat({ ... });
} catch (error) {
  if (error instanceof SutraError) {
    console.log('Code:', error.code);           // SutraErrorCode
    console.log('Message:', error.message);     // Human-readable message
    console.log('Provider:', error.provider);   // 'openai', 'anthropic', etc.
    console.log('Status:', error.statusCode);   // HTTP status code
    console.log('Retryable:', error.retryable); // Can we retry?
    console.log('Retry After:', error.retryAfter); // ms to wait
    console.log('Request ID:', error.requestId); // For debugging
    console.log('Details:', error.details);     // Additional context
  }
}
```

### Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `PROVIDER_NOT_FOUND` | Unknown provider | No |
| `MODEL_NOT_FOUND` | Unknown model | No |
| `KEY_NOT_SET` | API key not configured | No |
| `KEY_INVALID` | Invalid API key | No |
| `KEY_EXPIRED` | API key expired | No |
| `REQUEST_FAILED` | General request failure | Yes |
| `RATE_LIMITED` | Rate limit exceeded | Yes |
| `TIMEOUT` | Request timed out | Yes |
| `ABORTED` | Request was aborted | No |
| `NETWORK_ERROR` | Network connectivity issue | Yes |
| `STREAM_ERROR` | Streaming error | Yes |
| `VALIDATION_ERROR` | Invalid request parameters | No |
| `ENCRYPTION_ERROR` | Encryption/decryption failed | No |
| `STORAGE_ERROR` | Key storage error | No |
| `CONTEXT_LENGTH_EXCEEDED` | Input too long | No |
| `CONTENT_FILTERED` | Content blocked by safety | No |
| `QUOTA_EXCEEDED` | API quota exhausted | No |

### Error Utilities

```typescript
import {
  createErrorFromResponse,
  createErrorFromException,
  isSutraError,
  withErrorHandling,
  ErrorAggregator,
} from '@sutraworks/client-ai-sdk';

// Create error from HTTP response
const error = await createErrorFromResponse(response, 'openai', requestId);

// Create error from exception
const error = createErrorFromException(exception, 'openai');

// Type guard
if (isSutraError(error)) {
  // error is SutraError
}

// Wrap function with error handling
const safeChat = withErrorHandling(async () => {
  return await ai.chat({ ... });
}, 'openai');

// Aggregate multiple errors
const aggregator = new ErrorAggregator();
aggregator.add(error1);
aggregator.add(error2);
if (aggregator.hasErrors()) {
  throw aggregator.toError();
}
```

---

## Events

### `on(type, listener)`

Subscribe to SDK events.

```typescript
// Request lifecycle
ai.on('request:start', (event) => {
  console.log(`Request ${event.requestId} started`);
});

ai.on('request:end', (event) => {
  console.log(`Request completed in ${event.duration}ms`);
  console.log(`Tokens used: ${event.usage?.total_tokens}`);
});

ai.on('request:error', (event) => {
  console.error(`Request failed: ${event.error.message}`);
});

// Streaming
ai.on('stream:start', (event) => {
  console.log('Streaming started');
});

ai.on('stream:chunk', (event) => {
  console.log(`Chunk ${event.totalChunks}`);
});

ai.on('stream:end', (event) => {
  console.log(`Stream ended after ${event.totalChunks} chunks`);
});

// Key management
ai.on('key:set', (event) => {
  console.log(`Key set for ${event.provider}`);
});

ai.on('key:remove', (event) => {
  console.log(`Key removed for ${event.provider}`);
});

// Cache
ai.on('cache:hit', (event) => {
  console.log('Cache hit!');
});

ai.on('cache:miss', (event) => {
  console.log('Cache miss');
});

// Retry
ai.on('retry:attempt', (event) => {
  console.log(`Retry attempt ${event.retryCount}`);
});
```

### `onAll(listener)`

Subscribe to all SDK events.

```typescript
const unsubscribe = ai.onAll((event) => {
  console.log(`Event: ${event.type}`, event);
});

// Later, to unsubscribe:
unsubscribe();
```

**Parameters:**
- `listener`: `SutraEventListener` - Event listener function

**Returns:** `() => void` - Unsubscribe function

### `off(type, listener)`

Unsubscribe from SDK events.

```typescript
const listener = (event) => console.log(event);
ai.on('request:start', listener);

// Later, to unsubscribe:
ai.off('request:start', listener);
```

**Parameters:**
- `type`: `SutraEventType` - Event type
- `listener`: `SutraEventListener` - The listener to remove

**Returns:** `void`

### Event Types

| Event | Description |
|-------|-------------|
| `request:start` | Request started |
| `request:end` | Request completed successfully |
| `request:error` | Request failed |
| `request:retry` | Request being retried |
| `stream:start` | Streaming started |
| `stream:chunk` | Stream chunk received |
| `stream:end` | Streaming completed |
| `stream:error` | Streaming error |
| `stream:abort` | Stream was aborted |
| `key:set` | API key was set |
| `key:remove` | API key was removed |
| `key:expired` | API key expired |
| `cache:hit` | Response served from cache |
| `cache:miss` | Cache miss, fetching from provider |
| `cache:set` | Response cached |
| `retry:attempt` | Retry attempt started |
| `rate:limited` | Rate limit triggered |
| `batch:progress` | Batch progress update |
| `batch:complete` | Batch completed |

---

## Types Reference

### Provider Types

```typescript
type ProviderName =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama'
  | 'mistral'
  | 'groq'
  | 'cohere'
  | 'together'
  | 'fireworks'
  | 'perplexity'
  | 'deepseek'
  | 'xai'
  | (string & {}); // Custom providers

interface ProviderConfig {
  name: ProviderName;
  baseUrl?: string;
  defaultModel?: string;
  headers?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
  rateLimit?: RateLimitConfig;
}
```

### Message Types

```typescript
type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

interface Message {
  role: MessageRole;
  content: string | ContentPart[];
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ContentPart {
  type: 'text' | 'image_url' | 'image_base64';
  text?: string;
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' };
  image_base64?: { data: string; media_type: string };
}
```

### Tool Types

```typescript
interface Tool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}
```

### Key Storage Types

```typescript
type KeyStorageType = 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';

interface KeyStorageOptions {
  type: KeyStorageType;
  encrypt?: boolean;
  encryptionKey?: string;
  prefix?: string;
  autoClearAfter?: number; // ms
  fallback?: KeyStorageType;
}
```

### Cache Types

```typescript
interface CacheOptions {
  enabled?: boolean;
  ttl?: number; // ms
  maxEntries?: number;
  maxSize?: number; // bytes
  keyGenerator?: (request: ChatRequest) => string;
}

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt?: number;
  hits: number;
  size?: number;
}
```

---

## Version

```typescript
import { VERSION } from '@sutraworks/client-ai-sdk';

console.log(VERSION); // "2.0.0"
```

---

For more information, see:
- [README](../README.md)
- [CHANGELOG](../CHANGELOG.md)
- [CONTRIBUTING](../CONTRIBUTING.md)
- [GitHub Repository](https://github.com/sutraworks/client-ai-sdk)
