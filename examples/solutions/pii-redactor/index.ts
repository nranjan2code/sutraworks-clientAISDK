import { SutraAI } from '@sutraworks/client-ai-sdk';

/**
 * PII Redactor Example
 * 
 * Demonstrates:
 * 1. Privacy-first architecture (Process sensitive data without sending to backend)
 * 2. Strict system prompts
 * 3. Structured JSON output
 */

export class SecureRedactor {
    private client: SutraAI;

    constructor(apiKey: string) {
        this.client = new SutraAI();
        this.client.setKey('openai', apiKey);
    }

    /**
     * Redact PII from text
     * This runs entirely client-side -> OpenAI. No data sent to your server.
     */
    async redact(text: string): Promise<{ redactedText: string; fieldsDetected: string[] }> {
        const response = await this.client.chat({
            provider: 'openai',
            model: 'gpt-4-turbo',
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a strict PII (Personally Identifiable Information) Redaction System.
          
          TASK:
          1. Identify all PII in the user input (Names, Emails, Phone Numbers, Addresses, SSNs, Credit Cards).
          2. Replace them with [REDACTED_TYPE] tags (e.g., [REDACTED_NAME], [REDACTED_EMAIL]).
          3. Return the result in the following JSON structure:
          {
            "original_text": string,
            "redacted_text": string,
            "detected_pii": Array<{ "type": string, "value": string }>
          }
          
          WARNING: Do not output any markings other than the JSON object.`
                },
                { role: 'user', content: text }
            ]
        });

        try {
            const content = response.choices[0].message.content as string;
            const result = JSON.parse(content);
            return {
                redactedText: result.redacted_text,
                fieldsDetected: result.detected_pii.map((p: any) => p.type)
            };
        } catch (e) {
            console.error("Failed to parse redaction result", e);
            return { redactedText: text, fieldsDetected: [] };
        }
    }
}
