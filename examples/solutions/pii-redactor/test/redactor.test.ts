import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecureRedactor } from '../src/index';

// Mock SutraAI
const mockChat = vi.fn();
vi.mock('@sutraworks/client-ai-sdk', () => {
    return {
        SutraAI: vi.fn().mockImplementation(() => ({
            setKey: vi.fn(),
            chat: mockChat
        }))
    };
});

describe('SecureRedactor', () => {
    let redactor: SecureRedactor;

    beforeEach(() => {
        redactor = new SecureRedactor('fake-key');
        mockChat.mockReset();
    });

    it('should identify basic patterns via regex', async () => {
        // Setup mock to return what we expect (though scanRegex runs before chat)
        mockChat.mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        redacted_text: 'My email is [REDACTED_EMAIL]',
                        detected_types: ['EMAIL'],
                        risk_level: 'MEDIUM'
                    })
                }
            }]
        });

        const result = await redactor.redact('My email is test@example.com');

        expect(result.processingMethod).toBe('HYBRID');
        expect(result.fieldsDetected).toContain('EMAIL');
        expect(result.riskLevel).toBe('MEDIUM');
    });

    it('should fallback to regex if LLM fails', async () => {
        mockChat.mockRejectedValue(new Error('API Failure'));

        const result = await redactor.redact('Call me at 555-123-4567');

        expect(result.processingMethod).toBe('FALLBACK');
        expect(result.redactedText).toContain('[REDACTED_PHONE]');
        // Original text shouldn't be null
        expect(result.originalText).toBe('Call me at 555-123-4567');
    });

    it('should respect allowList', async () => {
        redactor = new SecureRedactor('fake-key', {
            allowList: ['support@safe.com']
        });

        // Force fallback to test the regex replacement logic directly
        mockChat.mockRejectedValue(new Error('API Failure'));

        const result = await redactor.redact('Emails: user@bad.com and support@safe.com');

        // user@bad.com should be redacted, support@safe.com should not
        expect(result.redactedText).toContain('[REDACTED_EMAIL]');
        expect(result.redactedText).toContain('support@safe.com');
    });
});
