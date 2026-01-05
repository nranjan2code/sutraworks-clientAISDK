/**
 * Centralized error handling utilities for consistent error management
 * @module utils/errors
 */

import { SutraError, SutraErrorCode, ProviderName } from '../types';

/**
 * Provider-specific error response structures
 */
interface OpenAIErrorResponse {
  error?: {
    message: string;
    type?: string;
    code?: string;
    param?: string;
  };
}

interface AnthropicErrorResponse {
  error?: {
    type: string;
    message: string;
  };
  type?: string;
  message?: string;
}

interface GoogleErrorResponse {
  error?: {
    message: string;
    code?: number;
    status?: string;
    details?: unknown[];
  };
}

interface GenericErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
  message?: string;
  detail?: string;
  details?: string;
}

type ProviderErrorResponse =
  | OpenAIErrorResponse
  | AnthropicErrorResponse
  | GoogleErrorResponse
  | GenericErrorResponse;

/**
 * Maps HTTP status codes to SutraError codes
 */
function mapStatusToErrorCode(status: number): SutraErrorCode {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
    case 403:
      return 'KEY_INVALID';
    case 404:
      return 'MODEL_NOT_FOUND';
    case 408:
      return 'TIMEOUT';
    case 413:
      return 'CONTEXT_LENGTH_EXCEEDED';
    case 429:
      return 'RATE_LIMITED';
    case 451:
      return 'CONTENT_FILTERED';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'REQUEST_FAILED';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Extracts the error message from provider-specific error response formats
 */
function extractErrorMessage(body: unknown, provider: ProviderName): string {
  if (!body || typeof body !== 'object') {
    return 'Unknown error occurred';
  }

  const errorBody = body as ProviderErrorResponse;

  // OpenAI format
  if ('error' in errorBody && errorBody.error?.message) {
    return errorBody.error.message;
  }

  // Anthropic format (sometimes top-level)
  if ('message' in errorBody && typeof errorBody.message === 'string') {
    return errorBody.message;
  }

  // Generic detail format
  if ('detail' in errorBody && typeof errorBody.detail === 'string') {
    return errorBody.detail;
  }

  if ('details' in errorBody && typeof errorBody.details === 'string') {
    return errorBody.details;
  }

  return `${provider} request failed`;
}

/**
 * Extracts retry-after value from response headers or body
 */
function extractRetryAfter(headers: Headers, body: unknown): number | undefined {
  // Check headers first
  const retryAfterHeader = headers.get('retry-after');
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }
    // Could be a date
    const date = Date.parse(retryAfterHeader);
    if (!isNaN(date)) {
      return Math.max(0, date - Date.now());
    }
  }

  // Check body
  if (body && typeof body === 'object') {
    const errorBody = body as Record<string, unknown>;
    if ('retry_after' in errorBody && typeof errorBody.retry_after === 'number') {
      return errorBody.retry_after * 1000;
    }
  }

  return undefined;
}

/**
 * Determines if an error is retryable based on status code
 */
function isRetryable(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

/**
 * Extract error code refinements based on error message content
 */
function refineErrorCode(
  baseCode: SutraErrorCode,
  message: string,
  _provider: ProviderName
): SutraErrorCode {
  const lowerMessage = message.toLowerCase();

  // Context length errors
  if (
    lowerMessage.includes('context length') ||
    lowerMessage.includes('maximum context') ||
    lowerMessage.includes('token limit') ||
    lowerMessage.includes('too many tokens') ||
    lowerMessage.includes('reduce the length')
  ) {
    return 'CONTEXT_LENGTH_EXCEEDED';
  }

  // Content filtering
  if (
    lowerMessage.includes('content filter') ||
    lowerMessage.includes('content policy') ||
    lowerMessage.includes('safety') ||
    lowerMessage.includes('blocked')
  ) {
    return 'CONTENT_FILTERED';
  }

  // Quota exceeded
  if (
    lowerMessage.includes('quota') ||
    lowerMessage.includes('billing') ||
    lowerMessage.includes('insufficient')
  ) {
    return 'QUOTA_EXCEEDED';
  }

  // Model not found
  if (
    lowerMessage.includes('model not found') ||
    lowerMessage.includes('does not exist') ||
    lowerMessage.includes('invalid model')
  ) {
    return 'MODEL_NOT_FOUND';
  }

  // Key issues
  if (
    lowerMessage.includes('invalid api key') ||
    lowerMessage.includes('invalid key') ||
    lowerMessage.includes('incorrect api key') ||
    lowerMessage.includes('authentication')
  ) {
    return 'KEY_INVALID';
  }

  return baseCode;
}

/**
 * Creates a SutraError from an HTTP response in a standardized way
 * This is the main entry point for error creation across all providers
 */
export async function createErrorFromResponse(
  response: Response,
  provider: ProviderName,
  requestId?: string
): Promise<SutraError> {
  let body: unknown;
  
  try {
    // Clone response to avoid consuming the body multiple times
    body = await response.clone().json();
  } catch {
    // If JSON parsing fails, try text
    try {
      body = { message: await response.clone().text() };
    } catch {
      body = null;
    }
  }

  const baseCode = mapStatusToErrorCode(response.status);
  const message = extractErrorMessage(body, provider);
  const errorCode = refineErrorCode(baseCode, message, provider);
  const retryable = isRetryable(response.status);
  const retryAfter = extractRetryAfter(response.headers, body);

  return new SutraError(message, errorCode, {
    provider,
    statusCode: response.status,
    retryable,
    retryAfter,
    details: body,
    requestId,
  });
}

/**
 * Creates a SutraError from a caught exception
 */
export function createErrorFromException(
  error: unknown,
  provider: ProviderName,
  requestId?: string
): SutraError {
  // Already a SutraError
  if (error instanceof SutraError) {
    return error;
  }

  // AbortError (request cancelled)
  if (error instanceof Error && error.name === 'AbortError') {
    return new SutraError('Request was aborted', 'ABORTED', {
      provider,
      retryable: false,
      cause: error,
      requestId,
    });
  }

  // Timeout error
  if (error instanceof Error && error.name === 'TimeoutError') {
    return new SutraError('Request timed out', 'TIMEOUT', {
      provider,
      retryable: true,
      cause: error,
      requestId,
    });
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new SutraError('Network error - unable to reach provider', 'NETWORK_ERROR', {
      provider,
      retryable: true,
      cause: error,
      requestId,
    });
  }

  // Generic Error
  if (error instanceof Error) {
    return new SutraError(error.message, 'UNKNOWN_ERROR', {
      provider,
      retryable: false,
      cause: error,
      requestId,
    });
  }

  // Non-Error thrown
  return new SutraError(String(error), 'UNKNOWN_ERROR', {
    provider,
    retryable: false,
    requestId,
  });
}

/**
 * Creates a stream-specific error
 */
export function createStreamError(
  message: string,
  provider: ProviderName,
  cause?: Error,
  requestId?: string
): SutraError {
  return new SutraError(message, 'STREAM_ERROR', {
    provider,
    retryable: false,
    cause,
    requestId,
  });
}

/**
 * Creates a validation error
 */
export function createValidationError(
  message: string,
  provider?: ProviderName,
  details?: unknown,
  requestId?: string
): SutraError {
  return new SutraError(message, 'VALIDATION_ERROR', {
    provider,
    retryable: false,
    details,
    requestId,
  });
}

/**
 * Type guard to check if a value is a SutraError
 */
export function isSutraError(error: unknown): error is SutraError {
  return error instanceof SutraError;
}

/**
 * Wraps an async operation with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  provider: ProviderName,
  requestId?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw createErrorFromException(error, provider, requestId);
  }
}

/**
 * Error aggregator for batch operations
 */
export class ErrorAggregator {
  private errors: SutraError[] = [];

  add(error: SutraError): void {
    this.errors.push(error);
  }

  get count(): number {
    return this.errors.length;
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getAll(): readonly SutraError[] {
    return this.errors;
  }

  getRetryable(): SutraError[] {
    return this.errors.filter((e) => e.retryable);
  }

  getNonRetryable(): SutraError[] {
    return this.errors.filter((e) => !e.retryable);
  }

  toAggregateError(message?: string): SutraError {
    return new SutraError(
      message || `${this.errors.length} errors occurred during batch operation`,
      'BATCH_ERROR',
      {
        retryable: this.errors.some((e) => e.retryable),
        details: this.errors.map((e) => e.toJSON()),
      }
    );
  }
}
