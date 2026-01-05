# Sutraworks Client AI SDK - Development Instructions

## Project Overview
This is a **client-side JavaScript/TypeScript SDK** for interacting with multiple AI/LLM providers directly from the browser. It implements a **BYOK (Bring Your Own Key)** architecture where:

- All API calls happen on the user's machine/browser
- Keys are never transmitted to or stored on any server
- Websites can leverage visitor's compute capacity and API keys
- Full support for local models via Ollama

## Architecture Principles

### Zero Trust Server Model
- Keys stored only in browser memory, localStorage, or sessionStorage
- All AI API calls made directly from client to provider
- Server only receives processed results, never keys or raw prompts
- End-to-end encryption for any server communication

### Provider Abstraction
- Unified interface across all providers
- Provider-specific adapters handle API differences
- Easy to add new providers via adapter pattern
- Automatic model discovery per provider

## Supported Providers
- OpenAI (GPT-4, GPT-3.5, etc.)
- Anthropic (Claude 3, Claude 2)
- Google (Gemini Pro, Gemini Ultra)
- Ollama (Local models - Llama, Mistral, etc.)
- Mistral AI
- Groq
- Cohere
- Together AI
- Fireworks AI
- Perplexity

## Project Structure
```
src/
├── index.ts              # Main SDK entry point
├── core/
│   ├── client.ts         # Unified AI client
│   ├── config.ts         # Configuration management
│   ├── registry.ts       # Provider registry
│   └── types.ts          # Core type definitions
├── providers/
│   ├── base.ts           # Base provider class
│   ├── openai.ts         # OpenAI adapter
│   ├── anthropic.ts      # Anthropic adapter
│   ├── google.ts         # Google Gemini adapter
│   ├── ollama.ts         # Ollama adapter
│   ├── mistral.ts        # Mistral adapter
│   ├── groq.ts           # Groq adapter
│   ├── cohere.ts         # Cohere adapter
│   ├── together.ts       # Together AI adapter
│   ├── fireworks.ts      # Fireworks adapter
│   └── perplexity.ts     # Perplexity adapter
├── keys/
│   ├── manager.ts        # Key management
│   ├── storage.ts        # Secure storage
│   └── encryption.ts     # Client-side encryption
├── streaming/
│   ├── handler.ts        # Stream processing
│   └── parser.ts         # SSE parser
├── utils/
│   ├── tokens.ts         # Token counting
│   ├── cache.ts          # Response caching
│   ├── retry.ts          # Retry logic
│   └── events.ts         # Event system
└── types/
    └── index.ts          # TypeScript definitions
```

## Development Guidelines

### Code Style
- TypeScript-first with full type coverage
- ESM modules as primary format
- No external runtime dependencies (browser-native APIs only)
- Comprehensive JSDoc comments

### Security Requirements
- Never log or expose API keys
- Use Web Crypto API for encryption
- Clear sensitive data from memory when done
- Validate all provider responses

### Testing
- Unit tests with Vitest
- Mock provider responses for testing
- Test streaming functionality
- Coverage target: 80%+

## Build Outputs
- ESM: `dist/esm/` - Modern browsers, bundlers
- UMD: `dist/umd/` - Script tags, legacy support
- CJS: `dist/cjs/` - Node.js compatibility
- Types: `dist/types/` - TypeScript declarations

## Usage Example
```javascript
import { SutraAI } from '@sutraworks/client-ai-sdk';

const ai = new SutraAI();

// User provides their own key (stored locally only)
ai.setKey('openai', 'sk-...');

// Make requests using user's key and compute
const response = await ai.chat({
  provider: 'openai',
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```
