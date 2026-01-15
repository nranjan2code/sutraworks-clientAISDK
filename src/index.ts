/**
 * Sutraworks Client AI SDK
 * Universal client-side AI SDK with BYOK (Bring Your Own Key) architecture
 * 
 * Features:
 * - Zero-trust server model with client-side key storage
 * - Support for 12+ AI providers
 * - Streaming with proper cleanup and abort handling
 * - Middleware pipeline for request/response transformation
 * - Request batching and deduplication
 * - Built-in prompt templates
 * - Token counting and cost estimation
 * - Comprehensive caching with SHA-256 hashing
 * - OWASP 2024 compliant encryption
 * - Provider-specific key validation
 * - Key rotation with audit trail
 *
 * @packageDocumentation
 * @module @sutraworks/client-ai-sdk
 */

/** SDK Version - synchronized with package.json */
export const VERSION = '2.0.0';

// Core modules
export { SutraAI } from './core/client';
export { ConfigManager, DEFAULT_PROVIDER_CONFIGS } from './core/config';
export { ProviderRegistry } from './core/registry';
export type { ProviderConstructor, ProviderPlugin, ProviderHealth } from './core/registry';
export { ModelRegistry, getModelRegistry, resetModelRegistry, MODEL_REGISTRY } from './core/models';
export type { ExtendedModelInfo, ModelPricing } from './core/models';

// Key management
export { KeyManager } from './keys/manager';
export { Encryption } from './keys/encryption';
export {
  createStorage,
  MemoryStorage,
  LocalStorageImpl,
  SessionStorageImpl,
  IndexedDBStorage,
} from './keys/storage';
export type { IKeyStorage } from './keys/storage';
export {
  validateKey,
  isValidKeyFormat,
  getKeyFormatDescription,
  detectProviderFromKey,
  KEY_PATTERNS,
} from './keys/validation';
export type { KeyValidationResult, KeyValidationOptions } from './keys/validation';

// Providers
export { BaseProvider } from './providers/base';
export { OpenAIProvider } from './providers/openai';
export { AnthropicProvider } from './providers/anthropic';
export { GoogleProvider } from './providers/google';
export { OllamaProvider } from './providers/ollama';
export { MistralProvider } from './providers/mistral';
export { GroqProvider } from './providers/groq';
export { CohereProvider } from './providers/cohere';
export { TogetherProvider } from './providers/together';
export { FireworksProvider } from './providers/fireworks';
export { PerplexityProvider } from './providers/perplexity';

// Middleware
export {
  MiddlewareManager,
  createLoggingMiddleware,
  createRetryMiddleware,
  createRateLimitMiddleware,
  createTimeoutMiddleware,
  createContentFilterMiddleware,
  createFallbackMiddleware,
  createMetricsMiddleware,
  createValidationMiddleware,
  createSanitizingMiddleware,
  validateRequest,
  sanitizeRequest,
  MODEL_CONTEXT_WINDOWS,
} from './middleware';
export type { MiddlewareManager as IMiddlewareManager, ValidationOptions, ValidationError } from './middleware';

// Streaming
export {
  StreamHandler,
  streamContent,
  collectStream,
  bufferedStream,
  timedStream,
} from './streaming/handler';
export type {
  StreamHandlerOptions,
  StreamState,
  StreamProgress,
  StreamStats,
} from './streaming/handler';
export {
  parseSSEStream,
  parseSSEData,
  parseJSONStream,
  parseNDJSONStream,
} from './streaming/parser';

// Utilities
export { EventEmitter, EventFactory, generateRequestId } from './utils/events';
export {
  withRetry,
  defaultShouldRetry,
  calculateDelay,
  extractRetryAfter,
  sleep,
  createRetryWrapper,
  CircuitBreaker,
} from './utils/retry';
export {
  estimateTokens,
  estimateMessagesTokens,
  estimateCost,
  formatCost,
  TokenCounter,

} from './utils/tokens';

export {
  PricingRegistry,
  pricingRegistry,
} from './utils/pricing';
export {
  MemoryCache,
  IndexedDBCache,
  generateCacheKey,
  generateCacheKeyAsync,
  createCache,
} from './utils/cache';
export {
  createErrorFromResponse,
  createErrorFromException,
  createStreamError,
  createValidationError,
  isSutraError,
  withErrorHandling,
  ErrorAggregator,
} from './utils/errors';

// Types - Core
export type {
  // Provider types
  ProviderName,
  ProviderConfig,

  // Message types
  MessageRole,
  Message,
  ContentPart,
  ToolCall,
  Tool,

  // Request types
  BaseRequestOptions,
  ChatRequest,
  CompletionRequest,
  EmbeddingRequest,
  RequestPriority,

  // Batch types
  BatchRequest,
  BatchResponse,

  // Response types
  Usage,
  ChatChoice,
  ChatResponse,
  ChatStreamDelta,
  EmbeddingResponse,
  ModelInfo,

  // Middleware types
  Middleware,
  MiddlewareContext,
  RequestMiddleware,
  ResponseMiddleware,
  ErrorMiddleware,

  // Template types
  PromptTemplate,
  TemplateVariable,

  // Key management types
  KeyStorageType,
  KeyStorageOptions,
  StoredKeyMeta,

  // Event types
  SutraEventType,
  SutraEventBase,
  RequestEvent,
  StreamEvent,
  SutraEventListener,

  // Cache types
  CacheEntry,
  CacheOptions,

  // Rate limit types
  RateLimitConfig,

  // Config types
  SutraConfig,

  // Error types
  SutraErrorCode,
} from './types';

// Error class
export { SutraError } from './types';

// Circular buffer utilities (O(1) rate limiting)
export { CircularBuffer, TimeWindowCounter, TokenBucket } from './utils/circular-buffer';

// Telemetry and observability
export {
  TelemetryManager,
  defaultTelemetryManager,
  createConsoleTelemetryHook,
} from './utils/telemetry';
export type { TelemetryHook, TelemetryContext, RequestMetrics } from './utils/telemetry';

// Middleware priority constants
export { MIDDLEWARE_PRIORITY } from './middleware';
export type { MiddlewarePriority } from './middleware';

// Default export
import { SutraAI } from './core/client';
export default SutraAI;
