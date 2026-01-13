/**
 * Key validation utilities for Sutraworks Client AI SDK
 * Provider-specific key format validation
 * @module keys/validation
 */

import type { ProviderName } from '../types';

/**
 * Key format patterns for known providers
 * These are best-effort patterns - providers may change formats
 */
export const KEY_PATTERNS: Record<string, {
    pattern: RegExp;
    description: string;
    minLength: number;
    maxLength?: number;
}> = {
    openai: {
        pattern: /^sk-[a-zA-Z0-9_-]{20,}$/,
        description: 'OpenAI keys start with "sk-" followed by alphanumeric characters',
        minLength: 30,
        maxLength: 150,
    },
    anthropic: {
        pattern: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
        description: 'Anthropic keys start with "sk-ant-" followed by alphanumeric characters',
        minLength: 40,
        maxLength: 150,
    },
    google: {
        pattern: /^AIza[a-zA-Z0-9_-]{30,}$/,
        description: 'Google API keys start with "AIza" followed by alphanumeric characters',
        minLength: 35,
        maxLength: 60,
    },
    groq: {
        pattern: /^gsk_[a-zA-Z0-9]{50,}$/,
        description: 'Groq keys start with "gsk_" followed by alphanumeric characters',
        minLength: 50,
        maxLength: 100,
    },
    mistral: {
        pattern: /^[a-zA-Z0-9]{32,}$/,
        description: 'Mistral keys are alphanumeric strings',
        minLength: 32,
        maxLength: 64,
    },
    cohere: {
        pattern: /^[a-zA-Z0-9]{40,}$/,
        description: 'Cohere keys are alphanumeric strings',
        minLength: 40,
        maxLength: 64,
    },
    together: {
        pattern: /^[a-f0-9]{64}$/,
        description: 'Together AI keys are 64-character hex strings',
        minLength: 64,
        maxLength: 64,
    },
    fireworks: {
        pattern: /^fw_[a-zA-Z0-9]{20,}$/,
        description: 'Fireworks keys start with "fw_" followed by alphanumeric characters',
        minLength: 24,
        maxLength: 100,
    },
    perplexity: {
        pattern: /^pplx-[a-zA-Z0-9]{48,}$/,
        description: 'Perplexity keys start with "pplx-"',
        minLength: 50,
        maxLength: 100,
    },
    deepseek: {
        pattern: /^sk-[a-zA-Z0-9]{30,}$/,
        description: 'DeepSeek keys start with "sk-"',
        minLength: 30,
        maxLength: 100,
    },
    xai: {
        pattern: /^xai-[a-zA-Z0-9]{30,}$/,
        description: 'xAI keys start with "xai-"',
        minLength: 30,
        maxLength: 100,
    },
    // Ollama doesn't require keys
    ollama: {
        pattern: /^.{0,}$/,
        description: 'Ollama is local and does not require an API key',
        minLength: 0,
        maxLength: 1000,
    },
};

/**
 * Result of key validation
 */
export interface KeyValidationResult {
    valid: boolean;
    provider: ProviderName;
    errors: string[];
    warnings: string[];
}

/**
 * Options for key validation
 */
export interface KeyValidationOptions {
    /**
     * Skip format validation (only check basic requirements)
     */
    skipFormatCheck?: boolean;

    /**
     * Strict mode - fail on warnings
     */
    strict?: boolean;

    /**
     * Allow custom/unknown providers
     */
    allowUnknownProviders?: boolean;
}

/**
 * Validate an API key for a specific provider
 */
export function validateKey(
    provider: ProviderName,
    key: string,
    options: KeyValidationOptions = {}
): KeyValidationResult {
    const result: KeyValidationResult = {
        valid: true,
        provider,
        errors: [],
        warnings: [],
    };

    // Basic validation - always required
    if (!key) {
        result.valid = false;
        result.errors.push('API key is required');
        return result;
    }

    if (typeof key !== 'string') {
        result.valid = false;
        result.errors.push('API key must be a string');
        return result;
    }

    // Trim check
    if (key !== key.trim()) {
        result.warnings.push('API key contains leading or trailing whitespace');
        if (options.strict) {
            result.valid = false;
            result.errors.push('API key contains whitespace (strict mode)');
        }
    }

    const trimmedKey = key.trim();

    // Minimum length check
    if (trimmedKey.length < 10) {
        result.valid = false;
        result.errors.push('API key is too short (minimum 10 characters)');
        return result;
    }

    // Skip further validation for Ollama
    if (provider === 'ollama') {
        return result;
    }

    // Get provider pattern
    const providerPattern = KEY_PATTERNS[provider];

    if (!providerPattern) {
        if (!options.allowUnknownProviders) {
            result.warnings.push(`Unknown provider "${provider}" - format validation skipped`);
        }
        return result;
    }

    // Skip format validation if requested
    if (options.skipFormatCheck) {
        return result;
    }

    // Length validation
    if (trimmedKey.length < providerPattern.minLength) {
        result.valid = false;
        result.errors.push(
            `API key too short for ${provider} (expected at least ${providerPattern.minLength} characters, got ${trimmedKey.length})`
        );
    }

    if (providerPattern.maxLength && trimmedKey.length > providerPattern.maxLength) {
        result.valid = false;
        result.errors.push(
            `API key too long for ${provider} (expected at most ${providerPattern.maxLength} characters, got ${trimmedKey.length})`
        );
    }

    // Pattern validation
    if (!providerPattern.pattern.test(trimmedKey)) {
        result.valid = false;
        result.errors.push(
            `API key format invalid for ${provider}. ${providerPattern.description}`
        );
    }

    return result;
}

/**
 * Quick check if a key looks valid for a provider
 * Returns true if the key passes basic format checks
 */
export function isValidKeyFormat(provider: ProviderName, key: string): boolean {
    const result = validateKey(provider, key, { skipFormatCheck: false });
    return result.valid;
}

/**
 * Get the expected key format description for a provider
 */
export function getKeyFormatDescription(provider: ProviderName): string | null {
    const pattern = KEY_PATTERNS[provider];
    return pattern?.description ?? null;
}

/**
 * Detect provider from key prefix (best-effort)
 */
export function detectProviderFromKey(key: string): ProviderName | null {
    if (!key || typeof key !== 'string') return null;

    const trimmed = key.trim();

    if (trimmed.startsWith('sk-ant-')) return 'anthropic';
    if (trimmed.startsWith('sk-')) return 'openai'; // Also matches deepseek
    if (trimmed.startsWith('AIza')) return 'google';
    if (trimmed.startsWith('gsk_')) return 'groq';
    if (trimmed.startsWith('fw_')) return 'fireworks';
    if (trimmed.startsWith('pplx-')) return 'perplexity';
    if (trimmed.startsWith('xai-')) return 'xai';

    return null;
}
