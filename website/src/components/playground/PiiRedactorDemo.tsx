"use client";

import { useState } from "react";
import { SutraAI } from "@sutraworks/client-ai-sdk";
import KeyInput from "./KeyInput";

export default function PiiRedactorDemo() {
    const [apiKey, setApiKey] = useState("");
    const [input, setInput] = useState(
        "My name is Sarah Connor. You can reach me at 555-0199 or sarah.connor@skynet.com. My address is 123 Tech Blvd, Los Angeles, CA 90210."
    );
    const [result, setResult] = useState<{ redactedText: string; fieldsDetected: string[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRedact = async () => {
        if (!apiKey) return;
        setLoading(true);
        setError("");
        setResult(null);

        try {
            const client = new SutraAI();
            client.setKey("openai", apiKey);

            const response = await client.chat({
                provider: "openai",
                model: "gpt-4-turbo",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: `You are a strict PII (Personally Identifiable Information) Redaction System.
          
          TASK:
          1. Identify all PII in the user input (Names, Emails, Phone Numbers, Addresses, SSNs, Credit Cards).
          2. Replace them with [REDACTED_TYPE] tags (e.g., [REDACTED_NAME], [REDACTED_EMAIL]).
          3. Return the result in the following JSON structure:
          {
            "original_text": string,
            "redacted_text": string,
            "detected_pii": Array<{ "type": string, "value": string }> // value is strictly for internal debug, do not expose if not needed
          }
          
          WARNING: Do not output any markings other than the JSON object.`
                    },
                    { role: "user", content: input }
                ]
            });

            const content = response.choices[0].message.content as string;
            if (!content) throw new Error("No content received");

            const parsed = JSON.parse(content);
            setResult({
                redactedText: parsed.redacted_text,
                fieldsDetected: parsed.detected_pii.map((p: any) => p.type)
            });
        } catch (err: any) {
            setError(err.message || "Failed to redact");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Zero-Liability PII Redactor</h2>
                <p className="text-gray-400">
                    Process sensitive text directly in the browser. The sensitive data goes only to the AI provider and back - never to our servers.
                </p>
            </div>

            <KeyInput provider="openai" onKeySet={setApiKey} />

            <div className="grid md:grid-cols-2 gap-6">
                {/* Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Input Text</label>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full h-64 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
                        placeholder="Enter text with PII..."
                    />
                </div>

                {/* Output */}
                <div className="space-y-2 relative">
                    <label className="text-sm font-medium text-gray-300">Redacted Output</label>
                    <div className={`w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 text-sm overflow-y-auto ${!result && 'flex items-center justify-center text-gray-500'}`}>
                        {loading ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                <span>Redacting...</span>
                            </div>
                        ) : result ? (
                            <div className="space-y-4">
                                <div className="text-green-400 font-mono whitespace-pre-wrap">
                                    {result.redactedText}
                                </div>
                                {result.fieldsDetected.length > 0 && (
                                    <div className="pt-4 border-t border-white/10">
                                        <p className="text-xs text-gray-400 mb-2">Detected Types:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {result.fieldsDetected.map((field, i) => (
                                                <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20">
                                                    {field}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            error ? <span className="text-red-400">{error}</span> : "Waiting for input..."
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleRedact}
                    disabled={!apiKey || loading || !input}
                    className="btn-primary"
                >
                    {loading ? "Processing..." : "Redact PII"}
                </button>
            </div>
        </div>
    );
}
