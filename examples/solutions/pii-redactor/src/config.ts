export interface PIIConfig {
    /**
     * Custom regex patterns to override defaults
     */
    patterns?: Partial<Record<string, RegExp>>;

    /**
     * Whitelist of exact strings that should NOT be redacted
     * (e.g. company support emails, public phone numbers)
     */
    allowList?: string[];

    /**
     * Confidence threshold for regex matching (0-1)
     * Typically not used for simple regex, but placeholders for advanced logic
     */
    confidenceThreshold?: number;
}
