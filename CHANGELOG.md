# Changelog

All notable changes to the Sutraworks Client AI SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-01-15

### 🎯 Zero Technical Debt Release

Comprehensive code quality improvements eliminating all identified technical debt.

### Critical Fixes

- **Package.json Exports**: Fixed `types` ordering in exports (now before `import`/`require` for proper TypeScript resolution)
- **SutraEventType**: Added `provider:registered` to the type union for proper event typing
- **Parser Lexical Declaration**: Fixed `no-case-declarations` lint error in SSE parser
- **Version Sync**: Synchronized version across `package.json`, `index.ts`, and `README.md`
- **Circuit Breaker Integration**: `executeChat()` now uses `registry.executeWithCircuitBreaker()` for actual request protection
- **Token Rate Limiting**: Replaced O(n) `array.shift()` with O(1) `CircularBuffer` in rate limit middleware
- **Anthropic Models Updated**: Added Claude Sonnet 4, Claude 3.5 Sonnet/Haiku; marked older models as deprecated
- **Fallback Hash Warning**: Added console warning when crypto API unavailable and falling back to FNV-1a
- **Request Cancellation**: Added proper cleanup of abort listeners in finally blocks to prevent memory leaks

### Code Quality Fixes

- **Test File Cleanup**: Removed unused imports and variables across test files
- **Type Safety**: Replaced `as any` with proper `as ProviderName` type assertions in tests
- **Unused Variables**: Used underscore prefix convention for intentionally unused catch variables

### Significant Fixes


- **Middleware Error Stacks**: Preserved original error stack traces in middleware wrapping
- **Error Mapping**: Deprecated `SutraError.fromResponse()` in favor of `createErrorFromResponse()` utility
- **Configuration Validation**: Added validation for timeout (positive), maxRetries (non-negative), baseUrl (valid URL)
- **IndexedDB Connection**: Added `close()` method to `IndexedDBStorage` for proper database lifecycle management
- **Token Estimation Docs**: Added comprehensive module documentation about estimation limitations
- **Header Merge Docs**: Documented header priority order in `BaseProvider.makeRequest()`

### Moderate Fixes

- **Circuit Breaker Constants**: Extracted magic numbers to `CIRCUIT_BREAKER_DEFAULTS` constant
- **Batch Retry Budget**: Added `maxTotalRetries` option to `BatchRequest` to prevent retry storms
- **CORS Documentation**: Added Ollama CORS configuration guide for browser usage

### Added

- `IKeyStorage.close()` optional method for resource cleanup
- `CIRCUIT_BREAKER_DEFAULTS` exported constant for configuration reference
- `BatchRequest.maxTotalRetries` for batch retry budget control
- Comprehensive JSDoc documentation throughout codebase

### Changed

- `CircularBuffer` now imported in middleware for O(1) token tracking
- Provider configuration validation runs at `ConfigManager` construction time

---

## [2.0.3] - 2026-01-13

### 🏢 Enterprise-Level Fixes - Zero Technical Debt

### Added

#### Performance & Reliability
- **Sliding Window Metrics**: Circuit breaker now uses bounded 100-sample sliding window instead of unbounded accumulation
- **O(1) Rate Limiting**: New `CircularBuffer`, `TimeWindowCounter`, `TokenBucket` utilities replace O(n) array operations
- **Provider Health Checks**: New `registry.warmup()` method for proactive startup validation
- **Stream Abort Cleanup**: Proper `reader.cancel()` and abort handler cleanup prevents zombie connections

#### Observability
- **Telemetry Hooks**: New `TelemetryManager` for OpenTelemetry/DataDog integration
  - `onRequestStart`, `onRequestEnd`, `onRequestError`
  - `onStreamChunk`, `onStreamEnd`, `onStreamError`
  - `onRetry`, `onCircuitBreakerOpen`, `onCircuitBreakerClose`
- **Console Telemetry Hook**: `createConsoleTelemetryHook()` for debugging

#### API Improvements
- **Middleware Priority Constants**: `MIDDLEWARE_PRIORITY.FIRST/HIGH/RATE_LIMIT/NORMAL/LOW/LAST`
- **EventEmitter Limits**: Warning at 10 listeners, hard limit at 100 (prevents memory leaks)
- **Salt Rotation**: `Encryption.reEncryptWithNewPassword()` for key migration
- **ModelRegistry**: Added `getProviders()`, `getLastUpdated()`, `findModel()` methods

### Changed

- **Test Count**: 554 tests (up from 551)
- **Rate limit middleware**: Now uses `TimeWindowCounter` for O(1) performance
- **Metrics structure**: `totalLatency` replaced with `latencyWindow[]` sliding window
- `VERSION` export synchronized with package.json

### Fixed

- Memory leak in circuit breaker metrics (unbounded `totalLatency` accumulation)
- Zombie connections from aborted streams (missing reader cleanup)
- EventEmitter memory leak potential (no listener limits)
- SessionStorage test mocking in jsdom environment
- Duplicate `VERSION` export in index.ts

---

## [2.0.2] - 2026-01-13

### Added

#### Security Enhancements
- **Provider-Specific Key Validation**: Added format validation for all providers
  - OpenAI: `sk-` prefix validation
  - Anthropic: `sk-ant-` prefix validation
  - Google: `AIza` prefix validation
  - Groq: `gsk_` prefix validation
  - And 8 more providers with specific patterns
  - `skipFormatCheck` option for custom providers

- **Key Rotation Support**: New `rotateKey()` method
  - Secure key updates with fingerprint tracking
  - Validates new key before rotation
  - Emits `key:rotate` event

- **Audit Event System**: New events for security monitoring
  - `key:error` - Key operation failures with stack trace
  - `key:rotate` - Key rotation events
  - `key:validate` - Key validation results (pass/fail)
  - `security:warning` - Security configuration warnings

- **Enhanced Error Handling**: Replaced silent error swallowing with event emission
  - All key operation failures now emit `key:error` events
  - Fallback storage failures are properly logged

### Changed

- **Concurrent Access Tests**: Now use true concurrent operations with `Promise.all()`
- **Test Keys**: Updated to use valid provider-specific formats
- **Test Count**: 551 tests (up from 516)

### Fixed

- Silent error swallowing in key manager's fallback storage operations
- Misleading "concurrent access" tests that were actually sequential

---

## [2.0.1] - 2026-01-10

### Fixed

- **Examples**: Fixed all TypeScript errors in example files
  - `basic-usage.ts`: Updated model names, added void references for optional functions
  - `streaming.ts`: Removed unused `ChatResponse` import
  - `ollama-local.ts`: Fixed unused `_remoteAI` variable, added cleanup
  - `secure-rag/index.ts`: Removed unused import
  
- **Model Names**: Updated to current versions
  - `gpt-4-turbo-preview` → `gpt-4-turbo`
  - `claude-3-sonnet-20240229` → `claude-sonnet-4-20250514`
  - `mixtral-8x7b-32768` → `llama-3.3-70b-versatile`

### Added

- **NPM Scripts**: New convenience scripts
  - `npm run test:integration` - Run Ollama integration tests
  - `npm run example` - Run basic usage example
  - `npm run example:streaming` - Run streaming examples
  - `npm run example:ollama` - Run Ollama local examples

### Documentation

- Updated README with accurate Anthropic model claims
- Enhanced ARCHITECTURE.md with provider support table and file structure
- Updated CONTRIBUTING.md with new npm scripts

---

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
- **516 tests** across 16 test files
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
