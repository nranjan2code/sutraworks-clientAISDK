import { SutraAI } from '../../../../src';
import { PIIConfig } from './config';

export interface RedactionResult {
    originalText: string;
    redactedText: string;
    fieldsDetected: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    processingMethod: 'REGEX' | 'HYBRID' | 'FALLBACK';
}

export class SecureRedactor {
    private client: SutraAI;
    private config: PIIConfig;

    private static DEFAULT_PATTERNS = {
        EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
        CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/g,
        IPV4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
    };

    private patterns: Record<string, RegExp>;

    constructor(apiKey: string, config: PIIConfig = {}) {
        this.client = new SutraAI();
        // Uses OpenAI for high intelligence redaction
        this.client.setKey('openai', apiKey);
        this.config = config;

        // Merge default patterns with custom overrides
        this.patterns = { ...SecureRedactor.DEFAULT_PATTERNS, ...config.patterns };
    }

    /**
     * Redact PII from text using a Hybrid Strategy
     * 1. Fast Regex Scan: If simple patterns match, we flag it.
     * 2. LLM Verification: Contextual redaction.
     */
    async redact(text: string): Promise<RedactionResult> {
        // Step 1: Preliminary Regex Check
        const regexHits = this.scanRegex(text);

        try {
            return await this.performLLMRedaction(text, regexHits);
        } catch (error) {
            console.warn("LLM Redaction failed, falling back to Regex-only", error);
            // Fallback to purely regex (deterministically safe but maybe over-aggressive)
            const regexRedacted = this.applyRegexRedaction(text);
            return {
                originalText: text,
                redactedText: regexRedacted,
                fieldsDetected: regexHits,
                riskLevel: regexHits.length > 0 ? 'MEDIUM' : 'LOW',
                processingMethod: 'FALLBACK'
            };
        }
    }

    private scanRegex(text: string): string[] {
        const hits: string[] = [];
        for (const [key, pattern] of Object.entries(this.patterns)) {
            if (pattern.test(text)) {
                hits.push(key);
            }
        }
        return hits;
    }

    private applyRegexRedaction(text: string): string {
        let redacted = text;
        for (const [key, pattern] of Object.entries(this.patterns)) {
            redacted = redacted.replace(pattern, (match) => {
                if (this.isAllowed(match)) return match;
                return `[REDACTED_${key}]`;
            });
        }
        return redacted;
    }

    private isAllowed(value: string): boolean {
        return this.config.allowList?.includes(value) ?? false;
    }

    private async performLLMRedaction(text: string, regexHits: string[]): Promise<RedactionResult> {
        // Build allow list string for system prompt
        const allowListNote = this.config.allowList
            ? `Do NOT redact the following specific values: ${this.config.allowList.join(', ')}`
            : '';

        const response = await this.client.chat({
            provider: 'openai',
            model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a strict PII Redaction System.
          
          TASK:
          1. Analyze the text for PII (Names, Addresses, Emails, Phones, SSNs, Credit Cards, Medical Info).
          2. Redact them using [REDACTED_TYPE] tags.
          3. Assess the Risk Level based on sensitivity (HIGH for SSN/CC/Medical, MEDIUM for Phones/Emails, LOW for Names).
          
          CONFIG:
          Regex Pre-scan found: ${regexHits.join(', ') || 'None'}
          ${allowListNote}
          
          Return JSON:
          {
            "redacted_text": string,
            "detected_types": string[],
            "risk_level": "LOW" | "MEDIUM" | "HIGH"
          }`
                },
                { role: 'user', content: text }
            ]
        });

        const content = response.choices[0].message.content as string;
        const result = JSON.parse(content);

        return {
            originalText: text,
            redactedText: result.redacted_text,
            fieldsDetected: result.detected_types,
            riskLevel: result.risk_level as 'LOW' | 'MEDIUM' | 'HIGH',
            processingMethod: 'HYBRID'
        };
    }
}
