import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelArena } from '../src/index';

// Mock SutraAI
const mockBatch = vi.fn();
const mockChat = vi.fn();

vi.mock('@sutraworks/client-ai-sdk', () => {
    return {
        SutraAI: vi.fn().mockImplementation(() => ({
            setKeys: vi.fn(),
            batch: mockBatch,
            chat: mockChat
        }))
    };
});

describe('ModelArena', () => {
    let arena: ModelArena;

    beforeEach(() => {
        arena = new ModelArena({ openai: 'key' });
        mockBatch.mockReset();
        mockChat.mockReset();
    });

    it('should execute parallel requests and judge results', async () => {
        // Mock Contestants
        mockBatch.mockResolvedValue({
            results: [
                { choices: [{ message: { content: 'Response 1' } }], timing: { duration: 100 }, usage: { total_tokens: 50 }, model: 'model-a' },
                { choices: [{ message: { content: 'Response 2' } }], timing: { duration: 150 }, usage: { total_tokens: 60 }, model: 'model-b' }
            ]
        });

        // Mock Judge
        mockChat.mockResolvedValue({
            choices: [{
                message: { content: JSON.stringify({ scores: [8.5, 9.0] }) }
            }]
        });

        const results = await arena.fight('test prompt', [
            { provider: 'p1', model: 'model-a' },
            { provider: 'p2', model: 'model-b' }
        ]);

        expect(mockBatch).toHaveBeenCalled();
        expect(mockChat).toHaveBeenCalled(); // The Judge was called

        expect(results).toHaveLength(2);
        expect(results[0].vote).toBe(8.5);
        expect(results[1].vote).toBe(9.0);
    });

    it('should handle contestant errors gracefully', async () => {
        mockBatch.mockResolvedValue({
            results: [
                new Error('API Timeout'),
                { choices: [{ message: { content: 'Response 2' } }] }
            ]
        });

        const results = await arena.fight('test', [
            { provider: 'p1', model: 'fail' },
            { provider: 'p2', model: 'pass' }
        ]);

        expect(results[0].content).toContain('[ERROR]');
        expect(results[0].vote).toBe(0); // Failed contestant gets 0

        // Judge should probably not be called or be called with only valid ones.
        // In current impl, it checks if validResults.length >= 2. Here we have 1 valid.
        // So judge should NOT be called.
        expect(mockChat).not.toHaveBeenCalled();
    });
});
