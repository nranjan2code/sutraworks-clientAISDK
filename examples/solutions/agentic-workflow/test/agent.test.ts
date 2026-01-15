import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/index';

// Mock SutraAI
const mockChat = vi.fn();

vi.mock('@sutraworks/client-ai-sdk', () => {
    return {
        SutraAI: vi.fn().mockImplementation(() => ({
            setKey: vi.fn(),
            chat: mockChat
        }))
    };
});

describe('Agent', () => {
    let agent: Agent;
    const mockTools = {
        test_tool: vi.fn().mockResolvedValue('Tool Result')
    };

    beforeEach(() => {
        agent = new Agent('key', {
            name: 'TestBot',
            role: 'Tester',
            tools: mockTools
        });
        mockChat.mockReset();
        mockTools.test_tool.mockClear();
    });

    it('should complete a single-step goal without tools', async () => {
        mockChat.mockResolvedValueOnce({
            choices: [{ message: { content: 'Simple Answer', tool_calls: [] } }]
        });

        const result = await agent.run('Hello');
        expect(result).toBe('Simple Answer');
        expect(mockTools.test_tool).not.toHaveBeenCalled();
    });

    it('should execute a tool loop', async () => {
        // Step 1: Model calls tool
        mockChat.mockResolvedValueOnce({
            choices: [{
                message: {
                    content: null,
                    tool_calls: [{
                        id: 'call_1',
                        type: 'function',
                        function: { name: 'test_tool', arguments: '{"query":"input"}' }
                    }]
                }
            }]
        });

        // Step 2: Model receives tool output and finishes
        mockChat.mockResolvedValueOnce({
            choices: [{
                message: { content: 'Final Answer based on Tool Result', tool_calls: [] }
            }]
        });

        const result = await agent.run('Do task');

        expect(mockTools.test_tool).toHaveBeenCalledWith('input');
        expect(result).toBe('Final Answer based on Tool Result');
        expect(mockChat).toHaveBeenCalledTimes(2);
    });

    it('should handle tool errors gracefully', async () => {
        mockTools.test_tool.mockRejectedValue(new Error('Tool Failed'));

        mockChat.mockResolvedValueOnce({
            choices: [{
                message: {
                    tool_calls: [{
                        id: 'call_1',
                        function: { name: 'test_tool', arguments: '{}' }
                    }]
                }
            }]
        });

        mockChat.mockResolvedValueOnce({
            choices: [{ message: { content: 'I encountered an error.' } }]
        });

        const result = await agent.run('Do task');

        // The error should be fed back to the model, which then produces the final answer
        expect(result).toBe('I encountered an error.');
    });
});
