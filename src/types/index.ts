/**
 * Core type definitions for Sutraworks Client AI SDK v2.0
 * @module types
 */

// ============================================================================
// Provider Types
// ============================================================================

/** Supported AI provider identifiers */
export type ProviderName =
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
  | (string & {}); // Allow custom providers with autocomplete

/** Provider configuration */
export interface ProviderConfig {
  /** Provider identifier */
  name: ProviderName;
  /** Base URL for API calls (optional, uses default if not set) */
  baseUrl?: string;
  /** Default model for this provider */
  defaultModel?: string;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries on failure */
  maxRetries?: number;
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig;
}

/** Rate limit configuration per provider */
export interface RateLimitConfig {
  /** Maximum requests per minute */
  requestsPerMinute?: number;
  /** Maximum tokens per minute */
  tokensPerMinute?: number;
  /** Maximum concurrent requests */
  maxConcurrent?: number;
  /** Alias for maxConcurrent */
  concurrentRequests?: number;
  /** Rate limiting strategy */
  strategy?: 'fixed-window' | 'sliding-window' | 'token-bucket';
}

// ============================================================================
// Message Types
// ============================================================================

/** Role of the message sender */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** Content part for multimodal messages */
export interface ContentPart {
  type: 'text' | 'image_url' | 'image_base64' | 'audio' | 'video';
  text?: string;
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' };
  image_base64?: { data: string; media_type: string };
  audio?: { data: string; format: 'mp3' | 'wav' | 'opus' };
  video?: { url: string };
}

/** Chat message structure */
export interface Message {
  /** Role of the message sender */
  role: MessageRole;
  /** Message content (string or multimodal parts) */
  content: string | ContentPart[];
  /** Optional name for the participant */
  name?: string;
  /** Tool calls made by the assistant */
  tool_calls?: ToolCall[];
  /** Tool call ID (for tool responses) */
  tool_call_id?: string;
  /** Reasoning content for models that support it */
  reasoning?: string;
}

/** Tool/function call structure */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
  /** Index in tool_calls array (for streaming) */
  index?: number;
}

/** Tool/function definition */
export interface Tool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
    strict?: boolean;
  };
}

// ============================================================================
// Request Types
// ============================================================================

/** Request priority levels */
export type RequestPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

/** Base request options shared across all request types */
export interface BaseRequestOptions {
  /** Provider to use */
  provider: ProviderName;
  /** Model to use */
  model: string;
  /** Temperature (0-2) */
  temperature?: number;
  /** Top P sampling */
  top_p?: number;
  /** Maximum tokens in response */
  max_tokens?: number;
  /** Stop sequences */
  stop?: string | string[];
  /** Presence penalty (-2 to 2) */
  presence_penalty?: number;
  /** Frequency penalty (-2 to 2) */
  frequency_penalty?: number;
  /** Enable streaming */
  stream?: boolean;
  /** Request timeout override */
  timeout?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Custom headers for this request */
  headers?: Record<string, string>;
  /** Request priority for queue management */
  priority?: RequestPriority;
  /** Request metadata for tracking */
  metadata?: Record<string, unknown>;
  /** Skip cache for this request */
  skipCache?: boolean;
}

/** Chat completion request */
export interface ChatRequest extends BaseRequestOptions {
  /** Messages in the conversation */
  messages: Message[];
  /** Tools available for the model */
  tools?: Tool[];
  /** Tool choice preference */
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  /** Response format */
  response_format?: { type: 'text' | 'json_object' | 'json_schema'; json_schema?: Record<string, unknown> };
  /** Seed for deterministic outputs */
  seed?: number;
  /** User identifier for abuse detection */
  user?: string;
  /** Enable reasoning tokens (for supported models) */
  reasoning?: boolean;
  /** Parallel tool calls */
  parallel_tool_calls?: boolean;
}

/** Text completion request (legacy) */
export interface CompletionRequest extends BaseRequestOptions {
  /** Prompt text */
  prompt: string;
  /** Number of completions to generate */
  n?: number;
  /** Echo back the prompt */
  echo?: boolean;
  /** Log probabilities */
  logprobs?: number;
  /** Best of N completions */
  best_of?: number;
}

/** Embedding request */
export interface EmbeddingRequest {
  /** Provider to use */
  provider: ProviderName;
  /** Model to use */
  model: string;
  /** Input text(s) to embed */
  input: string | string[];
  /** Encoding format */
  encoding_format?: 'float' | 'base64';
  /** Dimensions (for models that support it) */
  dimensions?: number;
  /** User identifier */
  user?: string;
  /** Request timeout override */
  timeout?: number;
  /** Abort signal */
  signal?: AbortSignal;
  /** Request priority */
  priority?: RequestPriority;
}

/** Batch request for multiple completions */
export interface BatchRequest {
  /** Array of chat requests to process */
  requests: ChatRequest[];
  /** Maximum concurrent requests */
  concurrency?: number;
  /** Stop on first error or continue */
  stopOnError?: boolean;
  /** Progress callback */
  onProgress?: (completed: number, total: number, result?: ChatResponse) => void;
}

/** Batch response */
export interface BatchResponse {
  /** Results for each request (in order) */
  results: Array<ChatResponse | SutraError>;
  /** Summary statistics */
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalDuration: number;
    totalTokens: number;
  };
}

// ============================================================================
// Response Types
// ============================================================================

/** Token usage information */
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** Reasoning tokens (for models that support it) */
  reasoning_tokens?: number;
  /** Cached tokens (for models with caching) */
  cached_tokens?: number;
}

/** Choice in a chat completion response */
export interface ChatChoice {
  index: number;
  message: Message;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | null;
  logprobs?: {
    content: Array<{
      token: string;
      logprob: number;
      bytes?: number[];
      top_logprobs?: Array<{ token: string; logprob: number; bytes?: number[] }>;
    }>;
  };
}

/** Chat completion response */
export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  provider: ProviderName;
  choices: ChatChoice[];
  usage?: Usage;
  system_fingerprint?: string;
  /** Response timing information */
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
    timeToFirstToken?: number;
  };
}

/** Streaming delta for chat completion */
export interface ChatStreamDelta {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  provider: ProviderName;
  choices: {
    index: number;
    delta: Partial<Message>;
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error' | null;
  }[];
  usage?: Usage;
}

/** Embedding response */
export interface EmbeddingResponse {
  object: 'list';
  data: {
    object: 'embedding';
    index: number;
    embedding: number[];
  }[];
  model: string;
  provider: ProviderName;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/** Model information */
export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderName;
  type: 'chat' | 'completion' | 'embedding' | 'image' | 'audio' | 'multimodal';
  context_window?: number;
  max_output_tokens?: number;
  supports_vision?: boolean;
  supports_tools?: boolean;
  supports_streaming?: boolean;
  supports_json_mode?: boolean;
  supports_reasoning?: boolean;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  /** Model release date */
  released?: string;
  /** Deprecation date if applicable */
  deprecated?: string;
}

// ============================================================================
// Key Management Types
// ============================================================================

/** Storage type for API keys */
export type KeyStorageType = 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';

/** Key storage options */
export interface KeyStorageOptions {
  /** Storage type */
  type: KeyStorageType;
  /** Encrypt keys at rest */
  encrypt?: boolean;
  /** Encryption key (derived from password if not provided) */
  encryptionKey?: string;
  /** Key prefix for storage */
  prefix?: string;
  /** Auto-clear keys after duration (ms) */
  autoClearAfter?: number;
  /** Fallback storage if primary fails */
  fallback?: KeyStorageType;
}

/** Stored key metadata */
export interface StoredKeyMeta {
  provider: ProviderName;
  createdAt: number;
  lastUsedAt?: number;
  expiresAt?: number;
  encrypted: boolean;
  /** Key fingerprint (last 4 chars hash) for identification */
  fingerprint?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/** Event types emitted by the SDK */
export type SutraEventType =
  | 'request:start'
  | 'request:end'
  | 'request:error'
  | 'request:retry'
  | 'stream:start'
  | 'stream:chunk'
  | 'stream:end'
  | 'stream:error'
  | 'key:set'
  | 'key:remove'
  | 'key:expired'
  | 'model:list'
  | 'cache:hit'
  | 'cache:miss'
  | 'cache:set'
  | 'retry:attempt'
  | 'rate:limited'
  | 'middleware:before'
  | 'middleware:after'
  | 'batch:progress'
  | 'batch:complete'
  | 'stream:abort';

/** Base event data */
export interface SutraEventBase {
  type: SutraEventType;
  timestamp: number;
  provider?: ProviderName;
  model?: string;
}

/** Request event data */
export interface RequestEvent extends SutraEventBase {
  type: 'request:start' | 'request:end' | 'request:error' | 'request:retry';
  requestId: string;
  duration?: number;
  usage?: Usage;
  error?: Error;
  retryCount?: number;
  retryAfter?: number;
}

/** Stream event data */
export interface StreamEvent extends SutraEventBase {
  type: 'stream:start' | 'stream:chunk' | 'stream:end' | 'stream:error';
  requestId: string;
  chunk?: ChatStreamDelta;
  totalChunks?: number;
  error?: Error;
  timeToFirstToken?: number;
}

/** Rate limit event data */
export interface RateLimitEvent extends SutraEventBase {
  type: 'rate:limited';
  requestId: string;
  retryAfter: number;
  limit?: number;
  remaining?: number;
  reset?: number;
}

/** Event listener callback */
export type SutraEventListener<T extends SutraEventBase = SutraEventBase> = (event: T) => void;

// ============================================================================
// Middleware Types
// ============================================================================

/** Middleware context passed through the chain */
export interface MiddlewareContext {
  /** Unique request ID */
  requestId: string;
  /** Request start time */
  startTime: number;
  /** Custom data that can be passed between middleware */
  data: Map<string, unknown>;
  /** Abort controller for this request */
  abortController: AbortController;
}

/** Middleware function for request transformation */
export type RequestMiddleware = (
  request: ChatRequest,
  context: MiddlewareContext
) => ChatRequest | Promise<ChatRequest>;

/** Middleware function for response transformation */
export type ResponseMiddleware = (
  response: ChatResponse,
  context: MiddlewareContext
) => ChatResponse | Promise<ChatResponse>;

/** Middleware function for error handling */
export type ErrorMiddleware = (
  error: SutraError,
  context: MiddlewareContext
) => SutraError | ChatResponse | Promise<SutraError | ChatResponse>;

/** Complete middleware definition */
export interface Middleware {
  /** Unique name for the middleware */
  name: string;
  /** Order priority (lower runs first) */
  priority?: number;
  /** Transform request before sending */
  beforeRequest?: RequestMiddleware;
  /** Transform response after receiving */
  afterResponse?: ResponseMiddleware;
  /** Handle errors */
  onError?: ErrorMiddleware;
  /** Whether middleware is enabled */
  enabled?: boolean;
}

// ============================================================================
// Cache Types
// ============================================================================

/** Cache entry */
export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt?: number;
  hits: number;
  /** Size in bytes (estimated) */
  size?: number;
  /** Hash of the request for validation */
  hash?: string;
}

/** Cache options */
export interface CacheOptions {
  /** Enable caching */
  enabled: boolean;
  /** TTL in milliseconds */
  ttl?: number;
  /** Maximum entries */
  maxEntries?: number;
  /** Maximum size in bytes */
  maxSize?: number;
  /** Storage type */
  storage?: 'memory' | 'indexedDB';
  /** Cache key generator */
  keyGenerator?: (request: ChatRequest | CompletionRequest) => string | Promise<string>;
  /** Whether to compress cached data */
  compress?: boolean;
}

// ============================================================================
// SDK Configuration
// ============================================================================

/** Main SDK configuration */
export interface SutraConfig {
  /** Provider-specific configurations */
  providers?: Partial<Record<ProviderName, ProviderConfig>>;
  /** Key storage options */
  keyStorage?: KeyStorageOptions;
  /** Cache options */
  cache?: CacheOptions;
  /** Global rate limit configuration */
  rateLimit?: RateLimitConfig;
  /** Default timeout for all requests (ms) */
  defaultTimeout?: number;
  /** Default max retries */
  defaultMaxRetries?: number;
  /** Enable debug logging (never logs keys) */
  debug?: boolean;
  /** Global middleware */
  middleware?: Middleware[];
  /** Validate models before requests */
  validateModels?: boolean;
  /** Enable request deduplication */
  deduplicateRequests?: boolean;
  /** Default concurrency for batch requests */
  defaultBatchConcurrency?: number;
}

// ============================================================================
// Prompt Template Types
// ============================================================================

/** Variable definition for templates */
export interface TemplateVariable {
  name: string;
  description?: string;
  required?: boolean;
  default?: string;
  validate?: (value: string) => boolean;
}

/** Prompt template definition */
export interface PromptTemplate {
  /** Unique template name */
  name: string;
  /** Template description */
  description?: string;
  /** System message template */
  system?: string;
  /** User message template */
  user: string;
  /** Assistant message prefix */
  assistant?: string;
  /** Variables used in template */
  variables?: TemplateVariable[];
  /** Default model for this template */
  model?: string;
  /** Default provider for this template */
  provider?: ProviderName;
  /** Default options */
  options?: Partial<BaseRequestOptions>;
}

// ============================================================================
// Error Types
// ============================================================================

/** SDK error codes */
export type SutraErrorCode =
  | 'PROVIDER_NOT_FOUND'
  | 'MODEL_NOT_FOUND'
  | 'KEY_NOT_SET'
  | 'KEY_INVALID'
  | 'KEY_EXPIRED'
  | 'REQUEST_FAILED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'NETWORK_ERROR'
  | 'STREAM_ERROR'
  | 'VALIDATION_ERROR'
  | 'ENCRYPTION_ERROR'
  | 'STORAGE_ERROR'
  | 'MIDDLEWARE_ERROR'
  | 'TEMPLATE_ERROR'
  | 'BATCH_ERROR'
  | 'QUOTA_EXCEEDED'
  | 'CONTENT_FILTERED'
  | 'CONTEXT_LENGTH_EXCEEDED'
  | 'UNKNOWN_ERROR';

/** SDK error class */
export class SutraError extends Error {
  code: SutraErrorCode;
  provider?: ProviderName;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number;
  details?: unknown;
  requestId?: string;

  constructor(
    message: string,
    code: SutraErrorCode,
    options?: {
      provider?: ProviderName;
      statusCode?: number;
      retryable?: boolean;
      retryAfter?: number;
      details?: unknown;
      cause?: Error;
      requestId?: string;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SutraError';
    this.code = code;
    this.provider = options?.provider;
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
    this.retryAfter = options?.retryAfter;
    this.details = options?.details;
    this.requestId = options?.requestId;
  }

  /** Create error from HTTP response */
  static fromResponse(
    response: { status: number; statusText: string },
    provider: ProviderName,
    body?: unknown
  ): SutraError {
    const { status } = response;
    let code: SutraErrorCode;
    let retryable = false;
    let retryAfter: number | undefined;

    switch (status) {
      case 400:
        code = 'VALIDATION_ERROR';
        break;
      case 401:
      case 403:
        code = 'KEY_INVALID';
        break;
      case 404:
        code = 'MODEL_NOT_FOUND';
        break;
      case 429:
        code = 'RATE_LIMITED';
        retryable = true;
        // Extract retry-after from body if available
        if (body && typeof body === 'object' && 'retry_after' in body) {
          retryAfter = Number(body.retry_after) * 1000;
        }
        break;
      case 408:
        code = 'TIMEOUT';
        retryable = true;
        break;
      case 413:
        code = 'CONTEXT_LENGTH_EXCEEDED';
        break;
      case 451:
        code = 'CONTENT_FILTERED';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = 'REQUEST_FAILED';
        retryable = true;
        break;
      default:
        code = 'UNKNOWN_ERROR';
    }

    return new SutraError(
      `Request failed: ${response.statusText}`,
      code,
      { provider, statusCode: status, retryable, retryAfter, details: body }
    );
  }

  /** Check if error is retryable */
  canRetry(): boolean {
    return this.retryable && !['KEY_INVALID', 'KEY_NOT_SET', 'KEY_EXPIRED'].includes(this.code);
  }

  /** Get wait time before retry (in ms) */
  getRetryDelay(attempt: number, baseDelay = 1000): number {
    if (this.retryAfter) {
      return this.retryAfter;
    }
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 60000);
  }

  /** Serialize error for logging (safe, no sensitive data) */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      provider: this.provider,
      statusCode: this.statusCode,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
      requestId: this.requestId,
    };
  }
}
