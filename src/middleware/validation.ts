/**
 * Request validation middleware for Sutraworks Client AI SDK
 * Provides comprehensive validation for all request parameters
 * @module middleware/validation
 */

import type { Middleware, ChatRequest, ProviderName, Message } from '../types';
import { SutraError } from '../types';

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation options for the middleware
 */
export interface ValidationOptions {
  /** Validate message array structure */
  validateMessages?: boolean;
  /** Validate temperature range (0-2) */
  validateTemperature?: boolean;
  /** Validate max_tokens is positive */
  validateMaxTokens?: boolean;
  /** Validate model string format */
  validateModel?: boolean;
  /** Maximum allowed messages in conversation */
  maxMessages?: number;
  /** Maximum content length per message (chars) */
  maxContentLength?: number;
  /** Allowed providers (empty = all) */
  allowedProviders?: ProviderName[];
  /** Custom validation function */
  customValidator?: (request: ChatRequest) => ValidationError[];
  /** Whether to throw or just warn */
  strict?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<ValidationOptions, 'customValidator' | 'allowedProviders'>> = {
  validateMessages: true,
  validateTemperature: true,
  validateMaxTokens: true,
  validateModel: true,
  maxMessages: 1000,
  maxContentLength: 1_000_000, // 1M chars
  strict: true,
};

/**
 * Known model context windows for validation
 */
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI
  'gpt-4': 8192,
  'gpt-4-turbo': 128000,
  'gpt-4-turbo-preview': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-3.5-turbo': 16385,
  'gpt-3.5-turbo-16k': 16385,
  // Anthropic
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-sonnet-4': 200000,
  'claude-3.5-sonnet': 200000,
  // Google
  'gemini-pro': 32768,
  'gemini-2.0-flash': 1000000,
  'gemini-1.5-pro': 1000000,
  // Mistral
  'mistral-large': 128000,
  'mistral-medium': 32768,
  'mistral-small': 32768,
  // Others
  'llama-3.3-70b': 128000,
  'llama-3.2': 128000,
};

/**
 * Validate a single message
 */
function validateMessage(message: Message, index: number, maxContentLength: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `messages[${index}]`;

  // Check role
  if (!message.role) {
    errors.push({ field: `${prefix}.role`, message: 'Message role is required' });
  } else if (!['system', 'user', 'assistant', 'tool'].includes(message.role)) {
    errors.push({
      field: `${prefix}.role`,
      message: `Invalid role: ${message.role}. Must be one of: system, user, assistant, tool`,
      value: message.role,
    });
  }

  // Check content
  if (message.content === undefined || message.content === null) {
    errors.push({ field: `${prefix}.content`, message: 'Message content is required' });
  } else if (typeof message.content === 'string') {
    if (message.content.length > maxContentLength) {
      errors.push({
        field: `${prefix}.content`,
        message: `Content exceeds maximum length of ${maxContentLength} characters`,
        value: message.content.length,
      });
    }
  } else if (Array.isArray(message.content)) {
    // Validate content parts
    for (let i = 0; i < message.content.length; i++) {
      const part = message.content[i];
      if (!part.type) {
        errors.push({
          field: `${prefix}.content[${i}].type`,
          message: 'Content part type is required',
        });
      } else if (!['text', 'image_url', 'image_base64', 'audio', 'video'].includes(part.type)) {
        errors.push({
          field: `${prefix}.content[${i}].type`,
          message: `Invalid content part type: ${part.type}`,
          value: part.type,
        });
      }
    }
  }

  // Check tool_call_id for tool messages
  if (message.role === 'tool' && !message.tool_call_id) {
    errors.push({
      field: `${prefix}.tool_call_id`,
      message: 'tool_call_id is required for tool messages',
    });
  }

  return errors;
}

/**
 * Validate temperature parameter
 */
function validateTemperature(temperature: number | undefined): ValidationError[] {
  if (temperature === undefined) return [];

  const errors: ValidationError[] = [];

  if (typeof temperature !== 'number') {
    errors.push({
      field: 'temperature',
      message: 'Temperature must be a number',
      value: temperature,
    });
  } else if (temperature < 0 || temperature > 2) {
    errors.push({
      field: 'temperature',
      message: 'Temperature must be between 0 and 2',
      value: temperature,
    });
  }

  return errors;
}

/**
 * Validate max_tokens parameter
 */
function validateMaxTokens(maxTokens: number | undefined, model: string): ValidationError[] {
  if (maxTokens === undefined) return [];

  const errors: ValidationError[] = [];

  if (typeof maxTokens !== 'number') {
    errors.push({
      field: 'max_tokens',
      message: 'max_tokens must be a number',
      value: maxTokens,
    });
  } else if (maxTokens < 1) {
    errors.push({
      field: 'max_tokens',
      message: 'max_tokens must be at least 1',
      value: maxTokens,
    });
  } else if (!Number.isInteger(maxTokens)) {
    errors.push({
      field: 'max_tokens',
      message: 'max_tokens must be an integer',
      value: maxTokens,
    });
  }

  // Check against model context window
  const contextWindow = Object.entries(MODEL_CONTEXT_WINDOWS).find(([key]) =>
    model.toLowerCase().includes(key.toLowerCase())
  )?.[1];

  if (contextWindow && maxTokens > contextWindow) {
    errors.push({
      field: 'max_tokens',
      message: `max_tokens (${maxTokens}) exceeds model context window (${contextWindow})`,
      value: maxTokens,
    });
  }

  return errors;
}

/**
 * Validate model string
 */
function validateModel(model: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!model || typeof model !== 'string') {
    errors.push({
      field: 'model',
      message: 'Model is required and must be a string',
      value: model,
    });
    return errors;
  }

  if (model.length < 2) {
    errors.push({
      field: 'model',
      message: 'Model name is too short',
      value: model,
    });
  }

  if (model.length > 256) {
    errors.push({
      field: 'model',
      message: 'Model name exceeds maximum length',
      value: model.length,
    });
  }

  // Check for suspicious characters
  if (/[<>{}\\]/.test(model)) {
    errors.push({
      field: 'model',
      message: 'Model name contains invalid characters',
      value: model,
    });
  }

  return errors;
}

/**
 * Validate provider
 */
function validateProvider(provider: ProviderName, allowedProviders?: ProviderName[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!provider || typeof provider !== 'string') {
    errors.push({
      field: 'provider',
      message: 'Provider is required and must be a string',
      value: provider,
    });
    return errors;
  }

  if (allowedProviders && allowedProviders.length > 0 && !allowedProviders.includes(provider)) {
    errors.push({
      field: 'provider',
      message: `Provider '${provider}' is not allowed. Allowed: ${allowedProviders.join(', ')}`,
      value: provider,
    });
  }

  return errors;
}

/**
 * Validate tools array
 */
function validateTools(tools: ChatRequest['tools']): ValidationError[] {
  if (!tools || tools.length === 0) return [];

  const errors: ValidationError[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const prefix = `tools[${i}]`;

    if (tool.type !== 'function') {
      errors.push({
        field: `${prefix}.type`,
        message: 'Tool type must be "function"',
        value: tool.type,
      });
    }

    if (!tool.function?.name) {
      errors.push({
        field: `${prefix}.function.name`,
        message: 'Tool function name is required',
      });
    } else {
      // Check for duplicate names
      if (seenNames.has(tool.function.name)) {
        errors.push({
          field: `${prefix}.function.name`,
          message: `Duplicate tool name: ${tool.function.name}`,
          value: tool.function.name,
        });
      }
      seenNames.add(tool.function.name);

      // Validate name format
      if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(tool.function.name)) {
        errors.push({
          field: `${prefix}.function.name`,
          message: 'Tool name must start with letter/underscore and contain only alphanumeric, underscore, or hyphen',
          value: tool.function.name,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate response format
 */
function validateResponseFormat(responseFormat: ChatRequest['response_format']): ValidationError[] {
  if (!responseFormat) return [];

  const errors: ValidationError[] = [];

  if (!['text', 'json_object', 'json_schema'].includes(responseFormat.type)) {
    errors.push({
      field: 'response_format.type',
      message: `Invalid response format type: ${responseFormat.type}`,
      value: responseFormat.type,
    });
  }

  if (responseFormat.type === 'json_schema' && !responseFormat.json_schema) {
    errors.push({
      field: 'response_format.json_schema',
      message: 'json_schema is required when type is "json_schema"',
    });
  }

  return errors;
}

/**
 * Full request validation
 */
export function validateRequest(request: ChatRequest, options: ValidationOptions = {}): ValidationError[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: ValidationError[] = [];

  // Provider validation
  errors.push(...validateProvider(request.provider, opts.allowedProviders));

  // Model validation
  if (opts.validateModel) {
    errors.push(...validateModel(request.model));
  }

  // Messages validation
  if (opts.validateMessages) {
    if (!request.messages || !Array.isArray(request.messages)) {
      errors.push({
        field: 'messages',
        message: 'Messages must be a non-empty array',
        value: request.messages,
      });
    } else {
      if (request.messages.length === 0) {
        errors.push({
          field: 'messages',
          message: 'Messages array cannot be empty',
        });
      }

      if (request.messages.length > opts.maxMessages) {
        errors.push({
          field: 'messages',
          message: `Too many messages: ${request.messages.length}. Maximum: ${opts.maxMessages}`,
          value: request.messages.length,
        });
      }

      for (let i = 0; i < request.messages.length; i++) {
        errors.push(...validateMessage(request.messages[i], i, opts.maxContentLength));
      }
    }
  }

  // Temperature validation
  if (opts.validateTemperature) {
    errors.push(...validateTemperature(request.temperature));
  }

  // Max tokens validation
  if (opts.validateMaxTokens) {
    errors.push(...validateMaxTokens(request.max_tokens, request.model));
  }

  // Tools validation
  errors.push(...validateTools(request.tools));

  // Response format validation
  errors.push(...validateResponseFormat(request.response_format));

  // Other parameter validations
  if (request.top_p !== undefined) {
    if (typeof request.top_p !== 'number' || request.top_p < 0 || request.top_p > 1) {
      errors.push({
        field: 'top_p',
        message: 'top_p must be a number between 0 and 1',
        value: request.top_p,
      });
    }
  }

  if (request.presence_penalty !== undefined) {
    if (typeof request.presence_penalty !== 'number' || request.presence_penalty < -2 || request.presence_penalty > 2) {
      errors.push({
        field: 'presence_penalty',
        message: 'presence_penalty must be a number between -2 and 2',
        value: request.presence_penalty,
      });
    }
  }

  if (request.frequency_penalty !== undefined) {
    if (typeof request.frequency_penalty !== 'number' || request.frequency_penalty < -2 || request.frequency_penalty > 2) {
      errors.push({
        field: 'frequency_penalty',
        message: 'frequency_penalty must be a number between -2 and 2',
        value: request.frequency_penalty,
      });
    }
  }

  // Custom validator
  if (opts.customValidator) {
    errors.push(...opts.customValidator(request));
  }

  return errors;
}

/**
 * Create validation middleware
 * Validates all request parameters before sending to provider
 */
export function createValidationMiddleware(options: ValidationOptions = {}): Middleware {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: 'validation',
    priority: 0, // Run first before any other middleware

    beforeRequest: async (request, _context) => {
      const errors = validateRequest(request, opts);

      if (errors.length > 0) {
        if (opts.strict) {
          const errorMessage = errors
            .map((e) => `${e.field}: ${e.message}`)
            .join('; ');

          throw new SutraError(
            `Validation failed: ${errorMessage}`,
            'VALIDATION_ERROR',
            {
              details: { errors },
            }
          );
        } else {
          // Log warnings but continue
          console.warn('[SutraAI Validation]', errors);
        }
      }

      return request;
    },
  };
}

/**
 * Sanitize request by fixing common issues
 * Returns sanitized request
 */
export function sanitizeRequest(request: ChatRequest): ChatRequest {
  const sanitized = { ...request };

  // Clamp temperature
  if (sanitized.temperature !== undefined) {
    sanitized.temperature = Math.max(0, Math.min(2, sanitized.temperature));
  }

  // Ensure max_tokens is positive integer
  if (sanitized.max_tokens !== undefined) {
    sanitized.max_tokens = Math.max(1, Math.floor(sanitized.max_tokens));
  }

  // Clamp top_p
  if (sanitized.top_p !== undefined) {
    sanitized.top_p = Math.max(0, Math.min(1, sanitized.top_p));
  }

  // Clamp penalties
  if (sanitized.presence_penalty !== undefined) {
    sanitized.presence_penalty = Math.max(-2, Math.min(2, sanitized.presence_penalty));
  }
  if (sanitized.frequency_penalty !== undefined) {
    sanitized.frequency_penalty = Math.max(-2, Math.min(2, sanitized.frequency_penalty));
  }

  // Trim model name
  if (sanitized.model) {
    sanitized.model = sanitized.model.trim();
  }

  // Trim message contents
  if (sanitized.messages) {
    sanitized.messages = sanitized.messages.map((msg) => ({
      ...msg,
      content: typeof msg.content === 'string' ? msg.content.trim() : msg.content,
    }));
  }

  return sanitized;
}

/**
 * Create sanitizing middleware that auto-fixes common issues
 */
export function createSanitizingMiddleware(): Middleware {
  return {
    name: 'sanitize',
    priority: -1, // Run before validation

    beforeRequest: async (request, _context) => {
      return sanitizeRequest(request);
    },
  };
}

export { MODEL_CONTEXT_WINDOWS };
