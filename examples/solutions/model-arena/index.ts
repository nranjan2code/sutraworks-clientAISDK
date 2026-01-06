import { SutraAI, ChatResponse } from '@sutraworks/client-ai-sdk';

/**
 * Model Arena Example
 * 
 * Demonstrates:
 * 1. Batch processing with concurrency control
 * 2. Side-by-side comparison of multiple providers
 * 3. Unified response handling
 */

export class ModelArena {
    private client: SutraAI;

    constructor(keys: Partial<Record<string, string>>) {
        this.client = new SutraAI();
        this.client.setKeys(keys);
    }

    /**
     * Run the same prompt against multiple contestants (models)
     */
    async fight(prompt: string, contestants: Array<{ provider: string, model: string }>): Promise<Map<string, string>> {
        console.log(`🥊 Starting Arena Fight! Prompt: "${prompt.substring(0, 30)}..."`);

        // Create batch requests
        const requests = contestants.map(c => ({
            provider: c.provider as any,
            model: c.model,
            messages: [{ role: 'user' as const, content: prompt }]
        }));

        // Execute in parallel
        const batchResult = await this.client.batch({
            requests,
            concurrency: 3, // Run 3 at a time
            stopOnError: false // Don't stop if one fails
        });

        // Format results
        const results = new Map<string, string>();

        batchResult.results.forEach((result: ChatResponse | Error, index: number) => {
            const contestant = contestants[index];
            const name = `${contestant.provider}/${contestant.model}`;

            if ('error' in result || result instanceof Error) {
                results.set(name, `DEAD 💀 (Error: ${result instanceof Error ? result.message : 'Unknown'})`);
            } else {
                const content = (result as ChatResponse).choices[0].message.content as string;
                const duration = (result as ChatResponse).timing?.duration ?? 0;
                const meta = `[${duration}ms]`;
                results.set(name, `${meta}\n${content}`);
            }
        });

        return results;
    }
}
