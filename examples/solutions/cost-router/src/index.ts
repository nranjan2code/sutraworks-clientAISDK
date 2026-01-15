import { SutraAI, ChatResponse } from '../../../../src';
import { pricingRegistry } from '../../../../src/utils/pricing';

/**
 * Hybrid Cost Router Example
 * 
 * Demonstrates:
 * 1. Hybrid model usage (Cheap local/cloud vs Expensive cloud)
 * 2. Dynamic routing logic based on complexity
 * 3. Cost estimation using centralized PricingRegistry
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
        FREE: { monthlyBudget: 1.00 },
        PRO: { monthlyBudget: 20.00 },
        ENTERPRISE: { monthlyBudget: 1000.00 }
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

        // Define models available
        const fastModel = { provider: 'groq', model: 'llama-3.1-8b-instant' };
        const smartModel = { provider: 'openai', model: 'gpt-4o' };
        const balancedModel = { provider: 'openai', model: 'gpt-4o-mini' };

        if (tier === 'FREE') {
            // Free users ALWAYS go to fast/cheap models
            decision = this.createDecision(fastModel, tokens, 'Free Tier Policy');
        } else {
            // Pro/Enterprise get smart routing
            if (complexity === 'HIGH') {
                decision = this.createDecision(smartModel, tokens, 'High Complexity Detected');
            } else if (complexity === 'MEDIUM') {
                decision = this.createDecision(balancedModel, tokens, 'Medium Complexity Optimization');
            } else {
                decision = this.createDecision(fastModel, tokens, 'Low Complexity Efficiency');
            }
        }

        console.log(`Routing ${userId} [${tier}] -> ${decision.provider}/${decision.model} (${decision.reason}) Cost Est: $${decision.estimatedCost.toFixed(6)}`);

        // 3. Execute
        try {
            const response = await this.client.chat({
                provider: decision.provider as any,
                model: decision.model,
                messages: [{ role: 'user', content: prompt }]
            });

            // 4. Update Spend (Real calculation)
            if (response.usage) {
                const { total } = this.client.estimateCost(
                    response.usage.prompt_tokens,
                    response.usage.completion_tokens,
                    decision.model
                );
                this.userBudgets.set(userId, currentSpend + total);
            }

            return response;
        } catch (e) {
            return { error: `Execution failed: ${e instanceof Error ? e.message : 'Unknown'}` };
        }
    }

    private createDecision(
        target: { provider: string, model: string },
        inputTokens: number,
        reason: string
    ): RouteDecision {
        const pricing = pricingRegistry.getPricing(target.model);
        // Estimate output as approx 2x input for rough budget check
        const estimatedOutput = inputTokens * 2;
        const cost = (inputTokens / 1_000_000 * pricing.input) + (estimatedOutput / 1_000_000 * pricing.output);

        return {
            model: target.model,
            provider: target.provider,
            reason,
            estimatedCost: cost
        };
    }

    private analyzeComplexity(prompt: string): 'LOW' | 'MEDIUM' | 'HIGH' {
        const highKeywords = ['analyze', 'critique', 'refactor', 'math', 'reason', 'why'];
        const mediumKeywords = ['write', 'summarize', 'outline', 'explain'];
        const lower = prompt.toLowerCase();

        if (prompt.length > 1000) return 'HIGH';
        if (highKeywords.some(k => lower.includes(k))) return 'HIGH';
        if (mediumKeywords.some(k => lower.includes(k))) return 'MEDIUM';
        return 'LOW';
    }

    getSpend(userId: string): number {
        return this.userBudgets.get(userId) || 0;
    }
}
