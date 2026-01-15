import { SutraAI, ChatRequest, Message, Tool } from '../../../../src';

/**
 * Agentic Workflow Example
 * 
 * Demonstrates:
 * 1. ReAct Loop (Reasoning + Acting)
 * 2. Automatic Tool Execution
 * 3. recursive tool usage
 */

export interface AgentConfig {
    name: string;
    role: string;
    tools?: Record<string, (...args: any[]) => any>;
    model?: string;
    provider?: string;
}

export class Agent {
    private client: SutraAI;
    private config: AgentConfig;
    private history: Message[] = [];
    private maxSteps = 10;

    constructor(apiKey: string, config: AgentConfig) {
        this.client = new SutraAI();
        this.client.setKey('openai', apiKey); // Defaulting to OpenAI for best tool support
        this.config = {
            model: 'gpt-4o',
            provider: 'openai',
            ...config
        };

        // Initialize system prompt
        this.history.push({
            role: 'system',
            content: `You are ${config.name}, a helpful assistant. Role: ${config.role}`
        });
    }

    /**
     * Define the tools schema for the LLM
     */
    private getToolDefinitions(): Tool[] {
        if (!this.config.tools) return [];

        // In a real app, you'd generate JSON Schema from types or Zod.
        // For this demo, we infer simple signatures or expect predefined schemas.
        // Here we map function names to simple dummy schemas for demonstration.
        return Object.keys(this.config.tools).map(name => ({
            type: 'function',
            function: {
                name,
                description: `Executes ${name}`,
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The query to search/execute' }
                    },
                    required: ['query']
                }
            }
        }));
    }

    /**
     * Main Agent Loop
     */
    async run(goal: string): Promise<string> {
        this.history.push({ role: 'user', content: goal });

        let step = 0;
        while (step++ < this.maxSteps) {
            console.log(`🤖 Agent Step ${step}...`);

            const request: ChatRequest = {
                provider: this.config.provider as any,
                model: this.config.model!,
                messages: this.history,
                tools: this.getToolDefinitions(),
                tool_choice: this.config.tools ? 'auto' : undefined
            };

            const response = await this.client.chat(request);
            const message = response.choices[0].message;
            this.history.push(message);

            // Check if tool called
            if (message.tool_calls && message.tool_calls.length > 0) {
                console.log(`🛠️ Tool Calls: ${message.tool_calls.length}`);

                for (const toolCall of message.tool_calls) {
                    const fnName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments);

                    const toolFn = this.config.tools?.[fnName];
                    if (toolFn) {
                        try {
                            const result = await toolFn(args.query);
                            this.history.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify(result)
                            });
                        } catch (e) {
                            this.history.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: `Error executing tool: ${e instanceof Error ? e.message : 'Unknown'}`
                            });
                        }
                    }
                }
                // Loop continues to let Model process tool output
            } else {
                // No tools called, final answer
                return message.content as string;
            }
        }

        return "Max steps reached without final answer.";
    }
}
