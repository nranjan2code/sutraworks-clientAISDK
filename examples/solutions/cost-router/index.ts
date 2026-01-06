import { SutraAI, ChatResponse } from '@sutraworks/client-ai-sdk';

/**
 * Hybrid Cost Router Example
 * 
 * Demonstrates:
 * 1. Hybrid model usage (Cheap local/cloud vs Expensive cloud)
 * 2. Dynamic routing logic based on complexity
 * 3. Cost estimation before execution
 */

interface RouterStats {
    moneySaved: number;
    fastRoutes: number;
    slowRoutes: number;
}

export class CostRouter {
    private client: SutraAI;
    private stats: RouterStats = { moneySaved: 0, fastRoutes: 0, slowRoutes: 0 };

    // Cost per 1k input tokens (Approximate)
    private readonly COSTS = {
        fast: 0.0005, // e.g., GPT-3.5 or Haiku
        smart: 0.01,   // e.g., GPT-4
    };

    constructor(keys: { openai: string; anthropic: string; groq: string }) {
        this.client = new SutraAI();
        this.client.setKeys(keys);
    }

    /**
     * Intelligently routes the query based on heuristic complexity
     */
    async smartQuery(prompt: string): Promise<ChatResponse> {
        const complexity = this.analyzeComplexity(prompt);

        // Estimate token count
        const tokens = this.client.estimateTokens([{ role: 'user', content: prompt }]);
        console.log(`Input tokens: ${tokens}, Complexity: ${complexity}`);

        if (complexity === 'LOW' || complexity === 'MEDIUM') {
            return this.executeFastPath(prompt, tokens);
        } else {
            return this.executeSmartPath(prompt);
        }
    }

    /**
     * Determine complexity based on keywords and length
     * In a real app, you might use a tiny classifier model here (e.g. 0.5b model via Ollama)
     */
    private analyzeComplexity(prompt: string): 'LOW' | 'MEDIUM' | 'HIGH' {
        const complexKeywords = ['analyze', 'compare', 'contrast', 'code', 'refactor', 'math', 'reason'];
        const lower = prompt.toLowerCase();

        if (prompt.length > 500) return 'HIGH';
        if (complexKeywords.some(k => lower.includes(k))) return 'HIGH';
        if (prompt.length > 100) return 'MEDIUM';
        return 'LOW';
    }

    private async executeFastPath(prompt: string, tokens: number): Promise<ChatResponse> {
        console.log("🚀 Routing to FAST model (Groq/Llama3 or GPT-3.5)...");
        this.stats.fastRoutes++;

        // Calculate simulated savings
        const baseCost = (tokens / 1000) * this.COSTS.smart;
        const fastCost = (tokens / 1000) * this.COSTS.fast;
        this.stats.moneySaved += (baseCost - fastCost);

        // Use Groq for speed/cost if available
        return this.client.chat({
            provider: 'groq',
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: prompt }]
        });
    }

    private async executeSmartPath(prompt: string): Promise<ChatResponse> {
        console.log("🧠 Routing to SMART model (GPT-4)...");
        this.stats.slowRoutes++;

        return this.client.chat({
            provider: 'openai',
            model: 'gpt-4-turbo',
            messages: [{ role: 'user', content: prompt }]
        });
    }

    getStats(): RouterStats {
        return this.stats;
    }
}
