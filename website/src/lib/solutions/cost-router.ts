import { SutraAI, ChatResponse } from '@sutraworks/client-ai-sdk';

/**
 * Hybrid Cost Router Example
 * 
 * Demonstrates:
 * 1. Hybrid model usage (Cheap local/cloud vs Expensive cloud)
 * 2. Dynamic routing logic based on complexity
 * 3. Cost estimation before execution
 */

export type UserTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface RouteDecision {
    model: string;
    provider: string;
    reason: string;
    estimatedCost: number;
}

export class CostRouter {
    private client: SutraAI;
    private userBudgets: Map<string, number> = new Map(); // userId -> spent amount

    // Configurable limits per tier
    private readonly LIMITS = {
        FREE: { monthlyBudget: 1.00, allowedModels: ['llama3-8b-8192', 'gpt-3.5-turbo'] },
        PRO: { monthlyBudget: 20.00, allowedModels: ['ALL'] },
        ENTERPRISE: { monthlyBudget: 1000.00, allowedModels: ['ALL'] }
    };

    private readonly COSTS = {
        fast: 0.0005, // e.g., GPT-3.5 or Haiku
        smart: 0.01,   // e.g., GPT-4
    };

    constructor(keys: { openai: string; anthropic: string; groq: string }) {
        this.client = new SutraAI();
        this.client.setKeys(keys);
    }

    /**
     * Smart Route + Budget Check
     */
    async routeAndExecute(userId: string, tier: UserTier, prompt: string): Promise<ChatResponse | { error: string }> {
        // 1. Check Budget
        const currentSpend = this.userBudgets.get(userId) || 0;
        const limit = this.LIMITS[tier].monthlyBudget;

        if (currentSpend >= limit) {
            return { error: `Budget exceeded for ${userId} (${tier}). Upgrade to continue.` };
        }

        // 2. Decide Route
        const tokens = this.client.estimateTokens([{ role: 'user', content: prompt }]);
        const complexity = this.analyzeComplexity(prompt);
        let decision: RouteDecision;

        if (tier === 'FREE') {
            // Free users ALWAYS go to fast/cheap models
            decision = {
                model: 'llama3-8b-8192',
                provider: 'groq',
                reason: 'Free Tier Policy',
                estimatedCost: (tokens / 1000) * this.COSTS.fast
            };
        } else {
            // Pro/Enterprise get smart routing
            if (complexity === 'HIGH') {
                decision = {
                    model: 'gpt-4-turbo',
                    provider: 'openai',
                    reason: 'High Complexity Detected',
                    estimatedCost: (tokens / 1000) * this.COSTS.smart
                };
            } else {
                decision = {
                    model: 'gpt-3.5-turbo',
                    provider: 'openai',
                    reason: 'Low Complexity Efficiency',
                    estimatedCost: (tokens / 1000) * this.COSTS.fast
                };
            }
        }

        console.log(`Routing ${userId} [${tier}] -> ${decision.provider}/${decision.model} (${decision.reason})`);

        // 3. Execute
        try {
            const response = await this.client.chat({
                provider: decision.provider as any,
                model: decision.model,
                messages: [{ role: 'user', content: prompt }]
            });

            // 4. Update Spend (simplified calculation)
            // In a real app, you'd calculate based on input+output tokens from response usage
            this.userBudgets.set(userId, currentSpend + decision.estimatedCost);

            return response;
        } catch (e) {
            return { error: `Execution failed: ${e instanceof Error ? e.message : 'Unknown'}` };
        }
    }

    private analyzeComplexity(prompt: string): 'LOW' | 'MEDIUM' | 'HIGH' {
        const complexKeywords = ['analyze', 'compare', 'critique', 'code', 'refactor', 'math', 'reason'];
        const lower = prompt.toLowerCase();

        if (prompt.length > 500) return 'HIGH';
        if (complexKeywords.some(k => lower.includes(k))) return 'HIGH';
        return 'LOW';
    }

    getSpend(userId: string): number {
        return this.userBudgets.get(userId) || 0;
    }
}
