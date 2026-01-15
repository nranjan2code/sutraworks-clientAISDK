import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalAssistant } from '../src/index';

// Mock SutraAI
const mockEmbed = vi.fn();
const mockChat = vi.fn();

vi.mock('@sutraworks/client-ai-sdk', () => {
    return {
        SutraAI: vi.fn().mockImplementation(() => ({
            setKey: vi.fn(),
            embed: mockEmbed,
            chat: mockChat
        }))
    };
});

describe('LocalAssistant', () => {
    let assistant: LocalAssistant;

    beforeEach(() => {
        assistant = new LocalAssistant();
        mockEmbed.mockReset();
        mockChat.mockReset();
    });

    it('should digest documents and store vectors', async () => {
        // Mock Embedding Response
        mockEmbed.mockResolvedValue({
            data: [{ embedding: [0.1, 0.2, 0.3] }]
        });

        await assistant.digest(['doc1']);

        // Since vectorStore is private, we verify via the interaction flow in ask()
        // Or we assume digest worked if no error threw.
        expect(mockEmbed).toHaveBeenCalledWith(expect.objectContaining({
            input: 'doc1',
            model: 'nomic-embed-text'
        }));
    });

    it('should retrieve context and answer questions', async () => {
        // Mock Embeddings for Question and Documents
        // Logic: [1,0] vs [1,0] (perfect match) and [0,1] (no match)

        let callCount = 0;
        mockEmbed.mockImplementation(async () => {
            callCount++;
            return {
                data: [{ embedding: callCount === 1 ? [1, 0] : [1, 0] }] // Simplified
            };
        });

        mockChat.mockResolvedValue({
            choices: [{ message: { content: 'Based on context: Answer' } }]
        });

        await assistant.digest(['Relevant Doc']);
        const answer = await assistant.ask('Question');

        expect(answer).toContain('Answer');

        // Verify Prompt Construction contains context
        const chatCall = mockChat.mock.calls[0][0];
        expect(chatCall.messages[0].content).toContain('Relevant Doc');
    });
});
