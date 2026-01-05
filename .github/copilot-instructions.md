# Sutraworks Client AI SDK - Development Instructions

## Project Overview

This is an **enterprise-grade client-side JavaScript/TypeScript SDK** (v2.0.0) for interacting with multiple AI/LLM providers directly from the browser. It implements a **BYOK (Bring Your Own Key)** architecture where:

- All API calls happen on the user's machine/browser
- Keys are never transmitted to or stored on any server
- Websites can leverage visitor's compute capacity and API keys
- Full support for local models via Ollama
- **482 tests** with **80%+ code coverage**
- **Zero external runtime dependencies**

## Architecture Principles

### Zero Trust Server Model
- Keys stored only in browser memory, localStorage, sessionStorage, or IndexedDB
- All AI API calls made directly from client to provider
- Server only receives processed results, never keys or raw prompts
- OWASP 2024 compliant encryption (600k PBKDF2, SHA-512, AES-256-GCM)

### Provider Abstraction
- Unified interface across all providers via `BaseProvider` abstract class
- Provider-specific adapters handle API differences
- Easy to add new providers via plugin system
- Centralized model registry with pricing and capabilities
- Circuit breaker pattern for provider resilience

### Enterprise Features
- **AsyncMutex**: Thread-safe key management with queue-based locking
- **Circuit Breaker**: Automatic failure detection and recovery
- **Middleware Pipeline**: Extensible request/response transformation
- **Request Validation**: Comprehensive input validation with sanitization
- **Error Aggregation**: Centralized error handling utilities

## Supported Providers (12+)
- OpenAI (GPT-4o, GPT-4 Turbo, GPT-3.5)
- Anthropic (Claude 4, Claude 3.5 Sonnet/Opus)
- Google (Gemini 2.0, Gemini Pro)
- Ollama (Local models - Llama, Mistral, etc.)
- Mistral AI
- Groq
- Cohere
- Together AI
- Fireworks AI
- Perplexity
- DeepSeek
- xAI (Grok)

## Project Structure
```
src/
├── index.ts              # Main SDK entry point & exports
├── core/
│   ├── client.ts         # Unified AI client (SutraAI class)
│   ├── config.ts         # Configuration management
│   ├── models.ts         # Centralized model registry (100+ models)
│   └── registry.ts       # Provider registry with circuit breaker & plugins
├── providers/
│   ├── base.ts           # Abstract base provider class
│   ├── openai.ts         # OpenAI adapter
│   ├── anthropic.ts      # Anthropic adapter
│   ├── google.ts         # Google Gemini adapter
│   ├── ollama.ts         # Ollama adapter (local)
│   ├── mistral.ts        # Mistral adapter
│   ├── groq.ts           # Groq adapter
│   ├── cohere.ts         # Cohere adapter
│   ├── together.ts       # Together AI adapter
│   ├── fireworks.ts      # Fireworks adapter
│   └── perplexity.ts     # Perplexity adapter
├── middleware/
│   ├── index.ts          # Middleware manager & built-in middleware
│   └── validation.ts     # Request validation middleware
├── keys/
│   ├── manager.ts        # Key management with AsyncMutex
│   ├── storage.ts        # Storage implementations (memory, localStorage, etc.)
│   └── encryption.ts     # OWASP 2024 compliant encryption
├── streaming/
│   ├── handler.ts        # Stream processing with proper cleanup
│   └── parser.ts         # SSE/JSON stream parsing
├── utils/
│   ├── cache.ts          # LRU cache with SHA-256 keys
│   ├── errors.ts         # Centralized error handling utilities
│   ├── events.ts         # Event emitter system
│   ├── retry.ts          # Retry logic & circuit breaker
│   └── tokens.ts         # Token counting & cost estimation
└── types/
    └── index.ts          # All TypeScript type definitions
```

## Development Guidelines

### Code Style
- TypeScript-first with full type coverage (zero `any`)
- ESM modules as primary format
- No external runtime dependencies (browser-native APIs only)
- Comprehensive JSDoc comments with @param, @returns, @throws, @example

### Security Requirements
- Never log or expose API keys (even in debug mode)
- Use Web Crypto API for encryption
- Clear sensitive data from memory when done
- Validate all provider responses
- Constant-time comparison for sensitive operations
- Memory wiping for key material

### Testing Requirements
- Unit tests with Vitest
- **Minimum 80% code coverage** for new code
- Mock provider responses for testing
- Test streaming functionality with abort handling
- All tests must pass before merge

### Error Handling
- Use `SutraError` class for all errors
- Valid error codes: `SutraErrorCode` type
- Include `provider`, `statusCode`, `retryable`, `retryAfter` when applicable
- Use error utilities: `createErrorFromResponse`, `createErrorFromException`

## Build Outputs
- ESM: `dist/esm/` - Modern browsers, bundlers
- CJS: `dist/cjs/` - Node.js compatibility  
- UMD: `dist/umd/` - Script tags, legacy browsers
- Types: `dist/types/` - TypeScript declarations

## Key Commands
```bash
npm test              # Run all 482 tests
npm run test:coverage # Run with coverage report
npm run typecheck     # TypeScript compilation check
npm run lint          # ESLint check
npm run build         # Build all formats
```

## Usage Example
```typescript
import { SutraAI } from '@sutraworks/client-ai-sdk';

const ai = new SutraAI({
  enableValidation: true,  // Enterprise-grade validation
  deduplicateRequests: true,
  cache: { enabled: true, ttl: 60000 }
});

// User provides their own key (stored locally only)
await ai.setKey('openai', 'sk-...');

// Make requests using user's key and compute
const response = await ai.chat({
  provider: 'openai',
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Clean up when done
await ai.destroy();
```

## Adding a New Provider

1. Create `src/providers/newprovider.ts` extending `BaseProvider`
2. Implement: `chat()`, `chatStream()`, `listModels()`, `supports()`
3. Add to registry in `src/core/registry.ts`
4. Add to `ProviderName` type in `src/types/index.ts`
5. Add models to `src/core/models.ts`
6. Create comprehensive tests in `src/providers/newprovider.test.ts`
7. Update documentation

## Important Notes

- Always use `async/await` with proper error handling
- All provider constructors take: `(config, events, getApiKey)`
- `BaseProvider.name` is an abstract getter, not a constructor parameter
- `chatStream()` returns `AsyncIterable<ChatStreamDelta>`, not `AsyncGenerator<ChatResponse>`
- `ChatResponse` requires: `id`, `object`, `created`, `model`, `provider`, `choices`
- Use `typeof content === 'string'` for content type narrowing in streams
