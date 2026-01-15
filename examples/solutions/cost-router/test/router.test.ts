import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CostRouter } from '../src/index';

// Mock SutraAI
const mockChat = vi.fn();
const mockEstimateTokens = vi.fn();
const mockEstimateCost = vi.fn();

vi.mock('@sutraworks/client-ai-sdk', () => {
    return {
        SutraAI: vi.fn().mockImplementation(() => ({
            setKeys: vi.fn(),
            chat: mockChat,
            estimateTokens: mockEstimateTokens,
            estimateCost: mockEstimateCost
        }))
    };
});

describe('CostRouter', () => {
    let router: CostRouter;

    beforeEach(() => {
        router = new CostRouter({ openai: 'key', anthropic: 'key', groq: 'key' });
        mockChat.mockReset();
        mockChat.mockResolvedValue({ usage: { prompt_tokens: 10, completion_tokens: 10 } });
        mockEstimateTokens.mockReturnValue(50); // Default input size
        mockEstimateCost.mockReturnValue({ total: 0.01 });
    });

    it('should route simple prompts to fast provider for PRO users', async () => {
        await router.routeAndExecute('u1', 'PRO', 'hello world');

        expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({
            provider: 'groq',
            model: 'llama-3.1-8b-instant'
        }));
    });

    it('should route complex prompts to smart provider for PRO users', async () => {
        await router.routeAndExecute('u1', 'PRO', 'Analyze and critique this math problem regarding quantum physics');

        expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({
            provider: 'openai',
            model: 'gpt-4o'
        }));
    });

    it('should restrict Free users to fast models regardless of complexity', async () => {
        // Even with "Analyze", free tier goes to cheap model
        await router.routeAndExecute('u1', 'FREE', 'Analyze this complicated topic');

        expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({
            provider: 'groq',
            model: 'llama-3.1-8b-instant'
        }));
    });

    it('should block execution if budget exceeded', async () => {
        // Max budget for FREE is 1.00
        // Mock that the first call costs 1.50
        mockEstimateCost.mockReturnValueOnce({ total: 1.50 });

        await router.routeAndExecute('u1', 'FREE', 'test');
        // Initial spend 1.50 > 1.00 limit for next call

        const res = await router.routeAndExecute('u1', 'FREE', 'test 2');
        expect(res).toHaveProperty('error');
        expect((res as any).error).toContain('Budget exceeded');
    });
});
