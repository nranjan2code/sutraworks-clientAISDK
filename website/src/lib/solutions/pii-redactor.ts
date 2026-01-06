import { SutraAI } from '@sutraworks/client-ai-sdk';

/**
 * PII Redactor Example
 * 
 * Demonstrates:
 * 1. Privacy-first architecture (Process sensitive data without sending to backend)
 * 2. Strict system prompts
 * 3. Structured JSON output
 */

export interface RedactionResult {
    originalText: string;
    redactedText: string;
    fieldsDetected: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    processingMethod: 'REGEX' | 'HYBRID' | 'FALLBACK';
}

export class SecureRedactor {
    private client: SutraAI;

    // Regex patterns for fast preliminary scanning
    // Note: These are basic patterns for demonstration. Enterprise compliance needs stricter ones.
    private static PATTERNS = {
        EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
        CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/g
    };

    constructor(apiKey: string) {
        this.client = new SutraAI();
        this.client.setKey('openai', apiKey);
    }

    /**
     * Redact PII from text using a Hybrid Strategy
     * 1. Fast Regex Scan: If simple patterns match, we flag it.
     * 2. LLM Verification: We use the LLM to contextually redact and find things regex missed (like names).
     */
    async redact(text: string): Promise<RedactionResult> {
        // Step 1: Preliminary Regex Check
        const regexHits = this.scanRegex(text);

        // If text is very long or looks safe, we might skip LLM or use a cheaper model
        // For this enterprise sample, we default to maximum security -> LLM

        try {
            return await this.performLLMRedaction(text, regexHits);
        } catch (error) {
            console.warn("LLM Redaction failed, falling back to Regex-only", error);
            return {
                originalText: text,
                redactedText: this.applyRegexRedaction(text),
                fieldsDetected: regexHits,
                riskLevel: regexHits.length > 0 ? 'MEDIUM' : 'LOW',
                processingMethod: 'FALLBACK'
            };
        }
    }

    private scanRegex(text: string): string[] {
        const hits: string[] = [];
        if (SecureRedactor.PATTERNS.EMAIL.test(text)) hits.push('EMAIL');
        if (SecureRedactor.PATTERNS.PHONE.test(text)) hits.push('PHONE');
        if (SecureRedactor.PATTERNS.SSN.test(text)) hits.push('SSN');
        if (SecureRedactor.PATTERNS.CREDIT_CARD.test(text)) hits.push('CREDIT_CARD');
        return hits;
    }

    private applyRegexRedaction(text: string): string {
        let redacted = text;
        redacted = redacted.replace(SecureRedactor.PATTERNS.EMAIL, '[REDACTED_EMAIL]');
        redacted = redacted.replace(SecureRedactor.PATTERNS.PHONE, '[REDACTED_PHONE]');
        redacted = redacted.replace(SecureRedactor.PATTERNS.SSN, '[REDACTED_SSN]');
        redacted = redacted.replace(SecureRedactor.PATTERNS.CREDIT_CARD, '[REDACTED_CC]');
        return redacted;
    }

    private async performLLMRedaction(text: string, regexHits: string[]): Promise<RedactionResult> {
        const response = await this.client.chat({
            provider: 'openai',
            model: 'gpt-4o', // Using a high-intelligence model for better context awareness
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a strict PII Redaction System.
          
          TASK:
          1. Analyze the text for PII (Names, Addresses, Emails, Phones, SSNs, Credit Cards, Medical Info).
          2. Redact them using [REDACTED_TYPE] tags.
          3. Assess the Risk Level based on sensitivity (HIGH for SSN/CC/Medical, MEDIUM for Phones/Emails, LOW for Names).
          
          Regex Pre-scan found: ${regexHits.join(', ') || 'None'}
          
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
