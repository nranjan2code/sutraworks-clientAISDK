/**
 * Token counting utilities
 * @module utils/tokens
 */

/**
 * Simple token estimation (approximation)
 * For accurate counts, use provider-specific tokenizers
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Simple heuristic: ~4 characters per token on average for English
  // This is a rough approximation; actual token counts vary by model
  const charCount = text.length;
  
  // Count whitespace-separated words
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  
  // Average of character-based and word-based estimates
  const charBasedEstimate = Math.ceil(charCount / 4);
  const wordBasedEstimate = Math.ceil(wordCount * 1.3);
  
  return Math.ceil((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Estimate tokens for messages
 */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string | unknown }>
): number {
  let tokens = 0;

  for (const message of messages) {
    // Each message has overhead (~4 tokens for role, formatting)
    tokens += 4;

    // Count content
    if (typeof message.content === 'string') {
      tokens += estimateTokens(message.content);
    } else if (Array.isArray(message.content)) {
      // Multimodal content
      for (const part of message.content) {
        if (typeof part === 'object' && part !== null) {
          if ('text' in part && typeof part.text === 'string') {
            tokens += estimateTokens(part.text);
          }
          // Images add significant tokens (rough estimate)
          if ('image_url' in part || 'image_base64' in part) {
            tokens += 85; // Low detail image estimate
          }
        }
      }
    }
  }

  // Add conversation overhead
  tokens += 3;

  return tokens;
}

/**
 * Provider-specific pricing (per 1M tokens)
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4-turbo-preview': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-4-32k': { input: 60, output: 120 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'gpt-3.5-turbo-16k': { input: 1, output: 2 },

  // Anthropic
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-3-sonnet-20240229': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

  // Google
  'gemini-pro': { input: 0.5, output: 1.5 },
  'gemini-ultra': { input: 10, output: 30 },

  // Mistral
  'mistral-large-latest': { input: 4, output: 12 },
  'mistral-medium-latest': { input: 2.7, output: 8.1 },
  'mistral-small-latest': { input: 1, output: 3 },

  // Groq (very affordable)
  'mixtral-8x7b-32768': { input: 0.27, output: 0.27 },
  'llama-3-70b-8192': { input: 0.59, output: 0.79 },

  // Cohere
  'command-r-plus': { input: 3, output: 15 },
  'command-r': { input: 0.5, output: 1.5 },

  // Default for unknown models
  'default': { input: 1, output: 2 },
};

/**
 * Estimate cost for a request
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): { input: number; output: number; total: number } {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['default'];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
  };
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(cost);
}

/**
 * Token counter for tracking usage across requests
 */
export class TokenCounter {
  private inputTokens = 0;
  private outputTokens = 0;
  private requests = 0;
  private costs: Array<{ model: string; input: number; output: number; cost: number }> = [];

  /**
   * Record token usage
   */
  record(model: string, inputTokens: number, outputTokens: number): void {
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
    this.requests++;

    const cost = estimateCost(inputTokens, outputTokens, model);
    this.costs.push({
      model,
      input: inputTokens,
      output: outputTokens,
      cost: cost.total,
    });
  }

  /**
   * Get total usage
   */
  getTotals(): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    requests: number;
    estimatedCost: number;
  } {
    const estimatedCost = this.costs.reduce((sum, c) => sum + c.cost, 0);

    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
      requests: this.requests,
      estimatedCost,
    };
  }

  /**
   * Get usage by model
   */
  getByModel(): Record<string, { input: number; output: number; cost: number }> {
    const byModel: Record<string, { input: number; output: number; cost: number }> = {};

    for (const record of this.costs) {
      if (!byModel[record.model]) {
        byModel[record.model] = { input: 0, output: 0, cost: 0 };
      }
      byModel[record.model].input += record.input;
      byModel[record.model].output += record.output;
      byModel[record.model].cost += record.cost;
    }

    return byModel;
  }

  /**
   * Reset counters
   */
  reset(): void {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.requests = 0;
    this.costs = [];
  }
}
