import { SutraAI, ChatResponse } from '../../../../src';

export interface ArenaResult {
    provider: string;
    model: string;
    content: string;
    latency: number;
    tokens: number;
    vote: number | null; // Consensus vote score (0-10)
}

export class ModelArena {
    private client: SutraAI;

    // "Judge" model for consensus
    private readonly JUDGE_MODEL = { provider: 'openai', model: 'gpt-4o' };

    constructor(keys: Partial<Record<string, string>>) {
        this.client = new SutraAI();
        this.client.setKeys(keys);
    }

    /**
     * Run the same prompt against multiple contestants and judge the best answer.
     */
    async fight(prompt: string, contestants: Array<{ provider: string, model: string }>): Promise<ArenaResult[]> {
        console.log(`🥊 Starting Arena Fight! Prompt: "${prompt.substring(0, 30)}..."`);

        // 1. Contestants Fight (Parallel Execution)
        const requests = contestants.map(c => ({
            provider: c.provider as any,
            model: c.model,
            messages: [{ role: 'user' as const, content: prompt }]
        }));

        const batchResult = await this.client.batch({
            requests,
            concurrency: 5,
            stopOnError: false
        });

        // 2. Collect Results
        const results: ArenaResult[] = [];

        batchResult.results.forEach((res: ChatResponse | Error, index: number) => {
            const contestant = contestants[index];
            if ('error' in res || res instanceof Error) {
                results.push({
                    provider: contestant.provider,
                    model: contestant.model,
                    content: `[ERROR] ${res instanceof Error ? res.message : 'Unknown'}`,
                    latency: 0,
                    tokens: 0,
                    vote: 0
                });
            } else {
                const chatRes = res as ChatResponse;
                results.push({
                    provider: contestant.provider,
                    model: contestant.model,
                    content: chatRes.choices[0].message.content as string,
                    latency: chatRes.timing?.duration || 0,
                    tokens: chatRes.usage?.total_tokens || 0,
                    vote: null // To be decided
                });
            }
        });

        // 3. Consensus / Voting (The Judge decides)
        // We only judge if we have at least 2 valid results
        const validResults = results.filter(r => !r.content.startsWith('[ERROR]'));
        if (validResults.length >= 2) {
            await this.judgeResults(prompt, validResults);
        }

        return results;
    }

    private async judgeResults(originalPrompt: string, results: ArenaResult[]) {
        console.log("⚖️ The Judge is deliberating...");

        const candidates = results.map((r, i) => `[Candidate ${i + 1} (${r.model})]:\n${r.content}\n`).join('\n---\n');

        const judgment = await this.client.chat({
            provider: this.JUDGE_MODEL.provider as any,
            model: this.JUDGE_MODEL.model,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are an AI Judge evaluating responses to a prompt.
                    
                    PROMPT: ${originalPrompt}
                    
                    TASK:
                    1. Read the candidates' responses.
                    2. Score each candidate from 0.0 to 10.0 based on accuracy, helpfulness, and tone.
                    3. Return JSON: { "scores": [8.5, 9.2, ...] } corresponding to Candidate 1, 2, ... in order.`
                },
                { role: 'user', content: candidates }
            ]
        });

        try {
            const content = judgment.choices[0].message.content as string;
            const parsed = JSON.parse(content);
            const scores = parsed.scores as number[];

            results.forEach((r, i) => {
                if (scores[i] !== undefined) {
                    r.vote = scores[i];
                }
            });

        } catch (e) {
            console.error("Judge failed to output valid JSON scores", e);
        }
    }

    /**
     * Helper: Calculate pairwise win probability (Elo-like)
     * Demonstrates data analysis utilities
     */
    static calculateWinRate(modelScore: number, opponentScore: number): number {
        // Simple sigmoid / logistic function assumption for demonstration
        return 1 / (1 + Math.pow(10, (opponentScore - modelScore) / 4)); // 4 is arbitrary scale factor
    }
}
