/**
 * Pricing Registry for managing model costs dynamically
 * @module utils/pricing
 */

export interface ModelPricing {
    input: number;
    output: number;
}

export class PricingRegistry {
    private static instance: PricingRegistry;
    private pricing: Map<string, ModelPricing> = new Map();

    private constructor() {
        this.loadDefaults();
    }

    static getInstance(): PricingRegistry {
        if (!PricingRegistry.instance) {
            PricingRegistry.instance = new PricingRegistry();
        }
        return PricingRegistry.instance;
    }

    /**
     * Load default pricing
     */
    private loadDefaults(): void {
        const defaults: Record<string, ModelPricing> = {
            // OpenAI
            'o1-pro': { input: 30, output: 120 },
            'gpt-4o': { input: 2.5, output: 10 },
            'gpt-4o-mini': { input: 0.15, output: 0.6 },
            'gpt-4-turbo': { input: 10, output: 30 },
            'gpt-4': { input: 30, output: 60 },
            'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

            // Anthropic
            'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
            'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
            'claude-3-opus-20240229': { input: 15, output: 75 },

            // Google
            'gemini-1.5-pro': { input: 1.25, output: 5 },
            'gemini-1.5-flash': { input: 0.075, output: 0.3 },

            // Default
            'default': { input: 1, output: 2 },
        };

        for (const [model, price] of Object.entries(defaults)) {
            this.pricing.set(model, price);
        }
    }

    /**
     * Get pricing for a model
     */
    getPricing(model: string): ModelPricing {
        return this.pricing.get(model) ?? this.pricing.get('default')!;
    }

    /**
     * Update or add pricing for a model
     */
    setPricing(model: string, pricing: ModelPricing): void {
        this.pricing.set(model, pricing);
    }

    /**
     * Bulk update pricing
     */
    updatePricing(pricingMap: Record<string, ModelPricing>): void {
        for (const [model, price] of Object.entries(pricingMap)) {
            this.pricing.set(model, price);
        }
    }
}

export const pricingRegistry = PricingRegistry.getInstance();
