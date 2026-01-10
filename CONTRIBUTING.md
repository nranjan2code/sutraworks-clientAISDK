# Contributing to Sutraworks Client AI SDK

Thank you for your interest in contributing to Sutraworks Client AI SDK! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Adding a New Provider](#adding-a-new-provider)
- [Security Guidelines](#security-guidelines)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please be respectful, inclusive, and constructive in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/client-ai-sdk.git
   cd client-ai-sdk
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/sutraworks/client-ai-sdk.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Setup

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- **TypeScript** 5.8+

### Available Scripts

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run integration tests (requires Ollama)
npm run test:integration

# Run examples
npm run example              # Basic usage example
npm run example:streaming    # Streaming examples
npm run example:ollama       # Ollama local examples

# Build all formats (ESM, CJS, UMD, Types)
npm run build

# Type check without building
npm run typecheck

# Lint code
npm run lint

# Lint and fix
npm run lint:fix

# Format code with Prettier
npm run format
```

### IDE Setup

We recommend using **VS Code** with the following extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

## Project Structure

```
src/
├── index.ts              # Main entry point & exports
├── core/
│   ├── client.ts         # Main SutraAI class
│   ├── config.ts         # Configuration management
│   ├── models.ts         # Centralized model registry
│   └── registry.ts       # Provider registry with circuit breaker
├── providers/
│   ├── base.ts           # Abstract base provider class
│   ├── openai.ts         # OpenAI implementation
│   ├── anthropic.ts      # Anthropic implementation
│   └── ...               # Other provider implementations
├── middleware/
│   ├── index.ts          # Middleware manager & built-in middleware
│   └── validation.ts     # Request validation middleware
├── keys/
│   ├── manager.ts        # Key management with AsyncMutex
│   ├── storage.ts        # Storage implementations
│   └── encryption.ts     # OWASP 2024 compliant encryption
├── streaming/
│   ├── handler.ts        # Stream processing & accumulation
│   └── parser.ts         # SSE/JSON stream parsing
├── utils/
│   ├── cache.ts          # LRU cache with SHA-256 keys
│   ├── errors.ts         # Error handling utilities
│   ├── events.ts         # Event emitter system
│   ├── retry.ts          # Retry logic & circuit breaker
│   └── tokens.ts         # Token counting & cost estimation
└── types/
    └── index.ts          # All TypeScript type definitions
```

## Coding Standards

### TypeScript Guidelines

1. **Use strict TypeScript** - All code must pass `tsc --noEmit` with zero errors
2. **Explicit types** - Avoid `any`; use `unknown` when type is truly unknown
3. **Readonly where possible** - Use `readonly` for properties that shouldn't change
4. **No unused variables** - Code must pass ESLint with no warnings

### Code Style

```typescript
// ✅ Good: Explicit return types
function calculateDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}

// ✅ Good: Destructuring with defaults
function processOptions({ timeout = 30000, retries = 3 }: Options): void {
  // ...
}

// ✅ Good: Async/await with proper error handling
async function fetchData(): Promise<Data> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new SutraError('Request failed', 'REQUEST_FAILED');
    }
    return await response.json();
  } catch (error) {
    throw createErrorFromException(error, 'openai');
  }
}

// ❌ Bad: Using any
function process(data: any): any { ... }

// ❌ Bad: Not handling errors
async function fetchData() {
  return await fetch(url).then(r => r.json());
}
```

### Documentation

- All public APIs must have JSDoc comments
- Include `@param`, `@returns`, and `@throws` tags
- Add `@example` for complex functions

```typescript
/**
 * Execute a chat completion request with the specified provider.
 * 
 * @param request - The chat request configuration
 * @returns Promise resolving to the chat response
 * @throws {SutraError} When provider is not configured or request fails
 * 
 * @example
 * ```typescript
 * const response = await ai.chat({
 *   provider: 'openai',
 *   model: 'gpt-4-turbo',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 */
async chat(request: ChatRequest): Promise<ChatResponse> {
  // ...
}
```

## Testing Requirements

### Coverage Requirements

- **Minimum 80% code coverage** for all new code
- All new features must include tests
- Bug fixes should include regression tests

### Test Structure

```typescript
/**
 * Tests for [Module Name]
 * @module [path/to/module].test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ModuleName', () => {
  let instance: ModuleName;

  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle edge case', () => {
      // ...
    });

    it('should throw on invalid input', () => {
      expect(() => instance.method(invalid)).toThrow(SutraError);
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/core/client.test.ts

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Pull Request Process

### Before Submitting

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Ensure all tests pass**:
   ```bash
   npm test
   ```

4. **Ensure TypeScript compiles**:
   ```bash
   npm run typecheck
   ```

5. **Ensure linting passes**:
   ```bash
   npm run lint
   ```

6. **Update documentation** if needed

7. **Add CHANGELOG entry** for significant changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Coverage meets 80% threshold

## Checklist
- [ ] Code follows project coding standards
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings
- [ ] Documentation updated
- [ ] CHANGELOG updated (for significant changes)
```

### Review Process

1. PRs require at least one approval from a maintainer
2. All CI checks must pass
3. Coverage must not decrease below 80%
4. Breaking changes require discussion in an issue first

## Adding a New Provider

### Step 1: Create Provider File

Create `src/providers/newprovider.ts`:

```typescript
/**
 * NewProvider adapter for Sutraworks Client AI SDK
 * @module providers/newprovider
 */

import type {
  ProviderName,
  ChatRequest,
  ChatResponse,
  ChatStreamDelta,
  ModelInfo,
} from '../types';
import { BaseProvider } from './base';

export class NewProviderProvider extends BaseProvider {
  get name(): ProviderName {
    return 'newprovider';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Implementation
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatStreamDelta> {
    // Implementation
  }

  async listModels(): Promise<ModelInfo[]> {
    // Implementation
  }

  supports(feature: 'streaming' | 'embeddings' | 'vision' | 'tools'): boolean {
    // Implementation
  }
}
```

### Step 2: Add to Registry

Update `src/core/registry.ts`:

```typescript
import { NewProviderProvider } from '../providers/newprovider';

// In registerBuiltInProviders():
this.registerProvider('newprovider', NewProviderProvider);
```

### Step 3: Add to Types

Update `src/types/index.ts`:

```typescript
export type ProviderName =
  | 'openai'
  // ...
  | 'newprovider'
  | (string & {});
```

### Step 4: Add Models

Update `src/core/models.ts` with supported models.

### Step 5: Add Tests

Create `src/providers/newprovider.test.ts` with comprehensive tests.

### Step 6: Update Documentation

- Add to README provider table
- Update API documentation
- Add example usage

## Security Guidelines

### Never Do

- ❌ Log API keys or sensitive data
- ❌ Store keys in plain text
- ❌ Use `eval()` or `Function()`
- ❌ Trust user input without validation
- ❌ Expose internal errors to users

### Always Do

- ✅ Use `Encryption` class for sensitive data
- ✅ Validate all input
- ✅ Use `SutraError` for error handling
- ✅ Clear sensitive data from memory when done
- ✅ Follow OWASP guidelines

### Reporting Security Issues

For security vulnerabilities, please email security@sutraworks.com instead of opening a public issue.

---

## Questions?

- Open a [GitHub Discussion](https://github.com/sutraworks/client-ai-sdk/discussions)
- Check existing [Issues](https://github.com/sutraworks/client-ai-sdk/issues)
- Read the [API Documentation](./docs/API.md)

Thank you for contributing! 🙏
