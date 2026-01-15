# Secure Enterprise Proxy (PII Shield)

A privacy-first PII redaction engine that runs entirely client-side (or on your edge), ensuring strict data compliance before information hits external AI providers.

## Features

- **Hybrid Architecture**: Combines deterministic Regex speed + LLM contextual intelligence (GPT-4o).
- **Zero Trust**: Keys and PII never leave the client environment unprocessed.
- **Configurable**: Define custom regex patterns and allow-lists (e.g., specific company emails to keep).
- **Resilient**: Auto-fallbacks to Regex-only mode if the LLM call fails.

## Usage

```typescript
import { SecureRedactor } from './src';

const redactor = new SecureRedactor('sk-openai-key...', {
  allowList: ['support@company.com'], // Don't redact this
  patterns: {
      // Add custom pattern for Internal ID
      INTERNAL_ID: /ID-\d{5}/g 
  }
});

const result = await redactor.redact(
  "Please contact John Doe at john@gmail.com or support@company.com. My ID is ID-12345."
);

console.log(result.redactedText);
// "Please contact [REDACTED_NAME] at [REDACTED_EMAIL] or support@company.com. My ID is [REDACTED_INTERNAL_ID]."
```
