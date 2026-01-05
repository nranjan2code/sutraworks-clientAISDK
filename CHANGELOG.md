# Changelog

All notable changes to the Sutraworks Client AI SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-05

### 🚀 Major Release - Enterprise Edition

This release represents a complete overhaul of the SDK with enterprise-grade features, comprehensive testing, and zero technical debt.

### Added

#### Core Features
- **Circuit Breaker Pattern**: Automatic failure detection and recovery for provider resilience
- **Provider Plugin System**: Extensible architecture for custom provider integration
- **Centralized Model Registry**: Single source of truth for 100+ models across all providers
- **Request Validation Middleware**: Comprehensive input validation with sanitization
- **Error Handling Utilities**: Centralized error creation, aggregation, and handling

#### Security Enhancements
- **OWASP 2024 Compliance**: 600,000 PBKDF2 iterations, SHA-512, AES-256-GCM
- **AsyncMutex**: Thread-safe key management with proper queue-based locking
- **Memory Leak Prevention**: Proper cleanup in streaming handlers and event emitters

#### New Providers
- DeepSeek support
- xAI (Grok) support

#### Testing
- **482 tests** across 16 test files
- **80.59% code coverage** (up from 44%)
- Comprehensive provider test suites
- Middleware and validation test coverage

### Changed

#### Breaking Changes
- `MiddlewareContext` is now required for middleware functions
- `StreamHandlerOptions.flushInterval` renamed to `bufferTimeout`
- `collectStream()` no longer accepts `onChunk` option (use events instead)
- `SutraConfig.timeout` → `SutraConfig.defaultTimeout`
- `SutraConfig.maxRetries` → `SutraConfig.defaultMaxRetries`
- `ModelInfo.deprecated` is now `string` (date) instead of `boolean`

#### Improvements
- **AsyncMutex**: Fixed race condition and deadlock bugs in key manager
- **Stream Handler**: Fixed memory leak with proper cleanup on abort/error
- **Error Codes**: Standardized to `SutraErrorCode` type (e.g., `KEY_INVALID` instead of `AUTH_FAILED`)
- **Type Safety**: All TypeScript compilation errors resolved

### Fixed

- Race condition in `AsyncMutex` causing deadlocks under high concurrency
- Memory leak in `StreamHandler` when streams were aborted
- Missing `provider` field in `ChatResponse` objects
- Generic type parameter missing in `MemoryCache` usage
- Incorrect option names in middleware configuration
- Dead code in provider implementations

### Security

- Updated encryption to OWASP 2024 standards
- Added constant-time comparison for sensitive operations
- Implemented secure memory wiping for key material

### Documentation

- Updated README with accurate test count and coverage
- Created comprehensive CHANGELOG
- Created CONTRIBUTING guidelines
- Updated API documentation
- Enhanced inline JSDoc comments

---

## [1.0.0] - 2025-05-01

### Initial Release

- Core SDK with BYOK architecture
- Support for 10 AI providers
- Streaming support
- Basic middleware system
- Key management with encryption
- Response caching

---

## Migration Guide: v1.x → v2.0

### Configuration Changes

```typescript
// Before (v1.x)
const ai = new SutraAI({
  timeout: 60000,
  maxRetries: 5,
});

// After (v2.0)
const ai = new SutraAI({
  defaultTimeout: 60000,
  defaultMaxRetries: 5,
});
```

### Middleware Changes

```typescript
// Before (v1.x)
await collectStream(stream, {
  onChunk: (chunk) => console.log(chunk),
  // ...
});

// After (v2.0) - Use events instead
events.on('stream:chunk', (chunk) => console.log(chunk));
await collectStream(stream, { /* options */ });
```

### Error Handling Changes

```typescript
// Before (v1.x)
if (error.code === 'AUTH_FAILED') { ... }

// After (v2.0)
if (error.code === 'KEY_INVALID') { ... }
```

### Model Deprecation

```typescript
// Before (v1.x)
const model = { deprecated: true };

// After (v2.0) - Use ISO date string
const model = { deprecated: '2024-12-01' };
```

---

## Versioning Policy

- **Major versions** (X.0.0): Breaking API changes
- **Minor versions** (0.X.0): New features, backward compatible
- **Patch versions** (0.0.X): Bug fixes, backward compatible

## Support

- v2.x: Active development, full support
- v1.x: Security fixes only until 2026-07-01

---

[2.0.0]: https://github.com/sutraworks/client-ai-sdk/releases/tag/v2.0.0
[1.0.0]: https://github.com/sutraworks/client-ai-sdk/releases/tag/v1.0.0
