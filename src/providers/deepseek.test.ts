/**
 * Tests for DeepSeek provider
 * @module providers/deepseek.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeepSeekProvider } from './deepseek';
import { EventEmitter } from '../utils/events';
import type { ProviderConfig, ChatRequest } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

describe('DeepSeekProvider', () => {
    let provider: DeepSeekProvider;
    let events: EventEmitter;
    const mockApiKey = 'sk-deepseek-test-key-12345';
    const config: ProviderConfig = {
        name: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        defaultModel: 'deepseek-v3-2',
        timeout: 60000,
        maxRetries: 3,
    };

    beforeEach(() => {
        events = new EventEmitter();
        provider = new DeepSeekProvider(config, events, () => Promise.resolve(mockApiKey));
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('basic properties', () => {
        it('should have correct name', () => {
            expect(provider.name).toBe('deepseek');
        });

        it('should support streaming', () => {
            expect(provider.supports('streaming')).toBe(true);
        });

        it('should support tools', () => {
            expect(provider.supports('tools')).toBe(true);
        });

        it('should not support embeddings', () => {
            expect(provider.supports('embeddings')).toBe(false);
        });

        it('should not support vision', () => {
            expect(provider.supports('vision')).toBe(false);
        });
    });

    describe('chat', () => {
        it('should make chat completion request', async () => {
            const mockResponse = {
                id: 'chat-123',
                object: 'chat.completion',
                created: Date.now(),
                model: 'deepseek-v3-2',
                choices: [
                    {
                        index: 0,
                        message: { role: 'assistant', content: 'Hello from DeepSeek!' },
                        finish_reason: 'stop',
                    },
                ],
                usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockResponse),
            } as Response);

            const request: ChatRequest = {
                provider: 'deepseek',
                model: 'deepseek-v3-2',
                messages: [{ role: 'user', content: 'Hello' }],
            };

            const response = await provider.chat(request);

            expect(response.provider).toBe('deepseek');
            expect(response.choices[0].message.content).toBe('Hello from DeepSeek!');
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should emit events on chat completion', async () => {
            const startSpy = vi.fn();
            const endSpy = vi.fn();

            events.on('request:start', startSpy);
            events.on('request:end', endSpy);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    id: 'chat-123',
                    object: 'chat.completion',
                    created: Date.now(),
                    model: 'deepseek-v3-2',
                    choices: [{ index: 0, message: { role: 'assistant', content: 'Test' }, finish_reason: 'stop' }],
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
                }),
            } as Response);

            const request: ChatRequest = {
                provider: 'deepseek',
                model: 'deepseek-v3-2',
                messages: [{ role: 'user', content: 'Test' }],
            };

            await provider.chat(request);

            expect(startSpy).toHaveBeenCalled();
            expect(endSpy).toHaveBeenCalled();
        });
    });

    describe('listModels', () => {
        it('should return DeepSeek models', async () => {
            const models = await provider.listModels();

            expect(models.length).toBeGreaterThan(0);
            expect(models.some(m => m.id === 'deepseek-v4')).toBe(true);
            expect(models.some(m => m.id === 'deepseek-r1')).toBe(true);
            expect(models.some(m => m.id === 'deepseek-chat')).toBe(true);
            expect(models.some(m => m.id === 'deepseek-coder')).toBe(true);
            expect(models.every(m => m.provider === 'deepseek')).toBe(true);
        });
    });
});
