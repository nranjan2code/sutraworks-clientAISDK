/**
 * Tests for xAI (Grok) provider
 * @module providers/xai.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { XAIProvider } from './xai';
import { EventEmitter } from '../utils/events';
import type { ProviderConfig, ChatRequest } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

describe('XAIProvider', () => {
    let provider: XAIProvider;
    let events: EventEmitter;
    const mockApiKey = 'xai-test-key-12345678901234';
    const config: ProviderConfig = {
        name: 'xai',
        baseUrl: 'https://api.x.ai/v1',
        defaultModel: 'grok-4-1',
        timeout: 60000,
        maxRetries: 3,
    };

    beforeEach(() => {
        events = new EventEmitter();
        provider = new XAIProvider(config, events, () => Promise.resolve(mockApiKey));
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('basic properties', () => {
        it('should have correct name', () => {
            expect(provider.name).toBe('xai');
        });

        it('should support streaming', () => {
            expect(provider.supports('streaming')).toBe(true);
        });

        it('should support tools', () => {
            expect(provider.supports('tools')).toBe(true);
        });

        it('should support vision', () => {
            expect(provider.supports('vision')).toBe(true);
        });

        it('should not support embeddings', () => {
            expect(provider.supports('embeddings')).toBe(false);
        });
    });

    describe('chat', () => {
        it('should make chat completion request', async () => {
            const mockResponse = {
                id: 'chat-123',
                object: 'chat.completion',
                created: Date.now(),
                model: 'grok-4-1',
                choices: [
                    {
                        index: 0,
                        message: { role: 'assistant', content: 'Hello from Grok!' },
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
                provider: 'xai',
                model: 'grok-4-1',
                messages: [{ role: 'user', content: 'Hello' }],
            };

            const response = await provider.chat(request);

            expect(response.provider).toBe('xai');
            expect(response.choices[0].message.content).toBe('Hello from Grok!');
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
                    model: 'grok-4-1',
                    choices: [{ index: 0, message: { role: 'assistant', content: 'Test' }, finish_reason: 'stop' }],
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
                }),
            } as Response);

            const request: ChatRequest = {
                provider: 'xai',
                model: 'grok-4-1',
                messages: [{ role: 'user', content: 'Test' }],
            };

            await provider.chat(request);

            expect(startSpy).toHaveBeenCalled();
            expect(endSpy).toHaveBeenCalled();
        });
    });

    describe('listModels', () => {
        it('should return xAI Grok models', async () => {
            const models = await provider.listModels();

            expect(models.length).toBeGreaterThan(0);
            expect(models.some(m => m.id === 'grok-4-1')).toBe(true);
            expect(models.some(m => m.id === 'grok-4')).toBe(true);
            expect(models.some(m => m.id === 'grok-3')).toBe(true);
            expect(models.some(m => m.id === 'grok-2')).toBe(true);
            expect(models.every(m => m.provider === 'xai')).toBe(true);
        });

        it('should include vision-capable models', async () => {
            const models = await provider.listModels();

            const visionModels = models.filter(m => m.supports_vision);
            expect(visionModels.length).toBeGreaterThan(0);
            expect(visionModels.some(m => m.id === 'grok-4-1')).toBe(true);
            expect(visionModels.some(m => m.id === 'grok-2-vision')).toBe(true);
        });
    });
});
