# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.2.x   | :white_check_mark: |
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |


## Security Architecture

### BYOK (Bring Your Own Key) Model

This SDK implements a **Zero Trust Server Model** where:

- **API keys are NEVER transmitted to any server** - All AI API calls are made directly from the client browser to the AI provider
- **Keys are stored only on the client** - Memory, localStorage, sessionStorage, or IndexedDB
- **The hosting server only receives processed results** - Never raw prompts, keys, or sensitive data

### Encryption Standards (OWASP 2024 Compliant)

When encryption is enabled, the SDK uses:

- **Key Derivation**: PBKDF2 with 600,000 iterations (OWASP 2024 recommendation)
- **Hash Algorithm**: SHA-512
- **Encryption**: AES-256-GCM with authenticated encryption
- **Salt**: Cryptographically random 16 bytes
- **IV**: Cryptographically random 12 bytes per encryption

### Security Features

1. **Memory Safety**
   - Sensitive data cleared from memory after use
   - Uint8Array overwriting for key material
   - No key persistence in JavaScript heap after cleanup

2. **Thread Safety**
   - AsyncMutex for concurrent key operations
   - Queue-based locking prevents race conditions
   - Atomic key rotation operations

3. **Constant-Time Operations**
   - Key comparison uses constant-time algorithms
   - Prevents timing attacks on authentication

4. **Input Validation**
   - **Provider-specific key format validation** (OpenAI `sk-`, Anthropic `sk-ant-`, etc.)
   - Comprehensive request validation middleware
   - Content sanitization (XSS prevention)
   - Provider response validation

5. **Key Rotation Support**
   - Secure key rotation with `rotateKey()` method
   - Fingerprint tracking for audit trails
   - Validation of new key before committing

6. **Audit Event System**
   - `key:set` - Key storage events
   - `key:remove` - Key removal events
   - `key:rotate` - Key rotation events
   - `key:validate` - Key validation results
   - `key:error` - Key operation errors
   - `security:warning` - Security configuration warnings

7. **Circuit Breaker Pattern**
   - Automatic failure detection
   - Prevents cascade failures
   - Self-healing recovery
   - Configurable via `CIRCUIT_BREAKER_DEFAULTS`

8. **Configuration Validation**
   - Validates `timeout` is positive
   - Validates `maxRetries` is non-negative
   - Validates `baseUrl` is a valid URL
   - Prevents runtime errors from invalid config

9. **IndexedDB Connection Management**
    - Explicit `close()` method for cleanup
    - Prevents persistent connections

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email: security@sutraworks.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

| Phase | Timeline |
| ----- | -------- |
| Initial Response | 24 hours |
| Assessment | 72 hours |
| Fix Development | 7-14 days (severity dependent) |
| Public Disclosure | After fix is released |

### What to Expect

- Acknowledgment of your report within 24 hours
- Regular updates on our progress
- Credit in release notes (if desired)
- No legal action for good-faith security research

## Security Best Practices for Users

### API Key Management

```typescript
// ✅ DO: Use encryption for persistent storage
const ai = new SutraAI({
  keyStorage: 'localStorage',
  encryption: {
    enabled: true,
    key: userProvidedPassword // User provides encryption password
  }
});

// ✅ DO: Clear keys when no longer needed
await ai.destroy();

// ✅ DO: Use key rotation for regular key updates
const result = await ai.rotateKey('openai', 'sk-new-key-...');
console.log('Old key fingerprint:', result.oldFingerprint);
console.log('New key fingerprint:', result.newFingerprint);

// ✅ DO: Listen to security events
ai.on('key:validate', (event) => {
  if (!event.valid) {
    console.warn('Key validation failed:', event.reason);
  }
});

ai.on('security:warning', (event) => {
  console.warn('Security warning:', event.message);
});

// ❌ DON'T: Store keys in plain text in code
const ai = new SutraAI();
ai.setKey('openai', 'sk-actual-key'); // Bad if key is hardcoded
```

### Content Security Policy (CSP)

If using CSP headers, allow connections to AI providers:

```http
Content-Security-Policy: 
  connect-src 'self' 
    https://api.openai.com 
    https://api.anthropic.com 
    https://generativelanguage.googleapis.com 
    https://api.mistral.ai 
    https://api.groq.com 
    https://api.cohere.ai 
    https://api.together.xyz 
    https://api.fireworks.ai 
    https://api.perplexity.ai;
```

### Subresource Integrity (SRI)

When loading from CDN, use SRI hashes:

```html
<script 
  src="https://cdn.jsdelivr.net/npm/@sutraworks/client-ai-sdk/dist/umd/sutra-ai.min.js"
  integrity="sha384-[hash]"
  crossorigin="anonymous">
</script>
```

## Security Audit

This SDK has undergone:

- Static code analysis with ESLint security rules
- Dependency vulnerability scanning
- OWASP compliance review for encryption
- Race condition analysis for concurrent operations

## Known Limitations

1. **Browser Security Model**: This SDK inherits all browser security limitations
2. **Client-Side Execution**: Code is visible to users; don't embed secrets
3. **Key Exposure Risk**: Keys in browser memory can be accessed by browser extensions or XSS attacks
4. **No Server Validation**: Without a backend, there's no additional validation layer

## Security-Related Configuration

```typescript
const ai = new SutraAI({
  // Enable request validation
  enableValidation: true,
  
  // Configure retry behavior to prevent abuse
  retry: {
    maxRetries: 3,
    retryableStatusCodes: [429, 500, 502, 503, 504]
  },
  
  // Rate limiting
  deduplicateRequests: true,
  
  // Encrypted key storage
  encryption: {
    enabled: true,
    key: encryptionPassword
  }
});
```

## Updates and Patches

Security patches are released as soon as possible after a vulnerability is confirmed. We recommend:

1. **Enable Dependabot** or similar for automatic dependency updates
2. **Subscribe to releases** on GitHub for security announcements
3. **Update promptly** when security releases are announced

## Contact

- Security Reports: security@sutraworks.com
- General Questions: support@sutraworks.com
- GitHub Issues: [Non-security bugs only](https://github.com/sutraworks/client-ai-sdk/issues)
