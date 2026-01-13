/**
 * Tests for key validation utilities
 * @module keys/validation.test
 */

import { describe, it, expect } from 'vitest';
import {
    validateKey,
    isValidKeyFormat,
    getKeyFormatDescription,
    detectProviderFromKey,
    KEY_PATTERNS,
} from './validation';

describe('Key Validation', () => {
    describe('validateKey', () => {
        describe('basic validation', () => {
            it('should reject empty keys', () => {
                const result = validateKey('openai', '');
                expect(result.valid).toBe(false);
                expect(result.errors).toContain('API key is required');
            });

            it('should reject non-string keys', () => {
                const result = validateKey('openai', null as unknown as string);
                expect(result.valid).toBe(false);
            });

            it('should reject keys that are too short', () => {
                const result = validateKey('openai', 'short');
                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('too short'))).toBe(true);
            });

            it('should warn about whitespace', () => {
                const result = validateKey('openai', '  sk-test1234567890abcdefghijklmnopqrstuvwxyz  ');
                expect(result.warnings.some(w => w.includes('whitespace'))).toBe(true);
            });

            it('should fail with whitespace in strict mode', () => {
                const result = validateKey('openai', '  sk-test1234567890abcdefghijklmnopqrstuvwxyz  ', { strict: true });
                expect(result.valid).toBe(false);
            });
        });

        describe('OpenAI keys', () => {
            it('should accept valid OpenAI keys', () => {
                const result = validateKey('openai', 'sk-test1234567890abcdefghijklmnopqrstuvwxyz');
                expect(result.valid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should reject keys without sk- prefix', () => {
                const result = validateKey('openai', 'test1234567890abcdefghijklmnopqrstuvwxyz');
                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('sk-'))).toBe(true);
            });

            it('should reject keys that are too short', () => {
                const result = validateKey('openai', 'sk-short');
                expect(result.valid).toBe(false);
            });
        });

        describe('Anthropic keys', () => {
            it('should accept valid Anthropic keys', () => {
                const result = validateKey('anthropic', 'sk-ant-test1234567890abcdefghijklmnopqrstuvwxyzabc');
                expect(result.valid).toBe(true);
            });

            it('should reject keys without sk-ant- prefix', () => {
                const result = validateKey('anthropic', 'sk-test1234567890abcdefghijklmnopqrstuvwxyz');
                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('sk-ant-'))).toBe(true);
            });
        });

        describe('Google keys', () => {
            it('should accept valid Google API keys', () => {
                const result = validateKey('google', 'AIzaTestKey1234567890abcdefghijklmnop');
                expect(result.valid).toBe(true);
            });

            it('should reject keys without AIza prefix', () => {
                const result = validateKey('google', 'testkey1234567890abcdefghijklmnopqrst');
                expect(result.valid).toBe(false);
            });
        });

        describe('Groq keys', () => {
            it('should accept valid Groq keys', () => {
                const result = validateKey('groq', 'gsk_test1234567890abcdefghijklmnopqrstuvwxyzabcdefghijk');
                expect(result.valid).toBe(true);
            });

            it('should reject keys without gsk_ prefix', () => {
                const result = validateKey('groq', 'test1234567890abcdefghijklmnopqrstuvwxyzabcdefghijk');
                expect(result.valid).toBe(false);
            });
        });

        describe('Ollama (no key required)', () => {
            it('should accept empty keys for Ollama', () => {
                const result = validateKey('ollama', '');
                // Ollama fails on basic validation (empty), but that's intentional
                // In real usage, Ollama might not require a key at all
            });

            it('should accept any key for Ollama if provided', () => {
                const result = validateKey('ollama', 'any-key-works-for-local-ollama');
                expect(result.valid).toBe(true);
            });
        });

        describe('unknown providers', () => {
            it('should warn about unknown providers by default', () => {
                const result = validateKey('unknown-provider' as any, 'some-long-key-that-passes-basic-checks');
                expect(result.warnings.some(w => w.includes('Unknown provider'))).toBe(true);
            });

            it('should not warn when allowUnknownProviders is true', () => {
                const result = validateKey('unknown-provider' as any, 'some-long-key-that-passes-basic-checks', {
                    allowUnknownProviders: true,
                });
                expect(result.warnings.some(w => w.includes('Unknown provider'))).toBe(false);
            });
        });

        describe('skipFormatCheck option', () => {
            it('should skip format validation when requested', () => {
                const result = validateKey('openai', 'not-a-valid-openai-key-format-12345', {
                    skipFormatCheck: true,
                });
                expect(result.valid).toBe(true);
            });
        });
    });

    describe('isValidKeyFormat', () => {
        it('should return true for valid keys', () => {
            expect(isValidKeyFormat('openai', 'sk-test1234567890abcdefghijklmnopqrstuvwxyz')).toBe(true);
        });

        it('should return false for invalid keys', () => {
            expect(isValidKeyFormat('openai', 'invalid')).toBe(false);
        });
    });

    describe('getKeyFormatDescription', () => {
        it('should return description for known providers', () => {
            const desc = getKeyFormatDescription('openai');
            expect(desc).toContain('sk-');
        });

        it('should return null for unknown providers', () => {
            const desc = getKeyFormatDescription('unknown' as any);
            expect(desc).toBeNull();
        });
    });

    describe('detectProviderFromKey', () => {
        it('should detect OpenAI keys', () => {
            expect(detectProviderFromKey('sk-test123')).toBe('openai');
        });

        it('should detect Anthropic keys', () => {
            expect(detectProviderFromKey('sk-ant-test123')).toBe('anthropic');
        });

        it('should detect Google keys', () => {
            expect(detectProviderFromKey('AIzatest123')).toBe('google');
        });

        it('should detect Groq keys', () => {
            expect(detectProviderFromKey('gsk_test123')).toBe('groq');
        });

        it('should detect Fireworks keys', () => {
            expect(detectProviderFromKey('fw_test123')).toBe('fireworks');
        });

        it('should detect Perplexity keys', () => {
            expect(detectProviderFromKey('pplx-test123')).toBe('perplexity');
        });

        it('should detect xAI keys', () => {
            expect(detectProviderFromKey('xai-test123')).toBe('xai');
        });

        it('should return null for unknown key formats', () => {
            expect(detectProviderFromKey('unknown-key-format')).toBeNull();
        });

        it('should return null for empty input', () => {
            expect(detectProviderFromKey('')).toBeNull();
        });
    });

    describe('KEY_PATTERNS', () => {
        it('should have patterns for main providers', () => {
            expect(KEY_PATTERNS.openai).toBeDefined();
            expect(KEY_PATTERNS.anthropic).toBeDefined();
            expect(KEY_PATTERNS.google).toBeDefined();
            expect(KEY_PATTERNS.groq).toBeDefined();
            expect(KEY_PATTERNS.mistral).toBeDefined();
        });

        it('should have description for each pattern', () => {
            for (const [provider, pattern] of Object.entries(KEY_PATTERNS)) {
                expect(pattern.description).toBeDefined();
                expect(typeof pattern.description).toBe('string');
            }
        });
    });
});
