"use client";

import { useState } from "react";
import { SutraAI } from "@sutraworks/client-ai-sdk";
import KeyInput from "./KeyInput";

export default function ModelArenaDemo() {
    const [keys, setKeys] = useState<Record<string, string>>({});
    const [prompt, setPrompt] = useState("Explain the concept of 'Agentic Workflow' in one sentence.");
    const [results, setResults] = useState<Record<string, {
        content: string;
        duration: number;
        loading: boolean;
        error?: string;
    }>>({});

    const PROVIDERS = [
        { id: 'openai', name: 'OpenAI', model: 'gpt-4-turbo' },
        { id: 'anthropic', name: 'Anthropic', model: 'claude-3-opus-20240229' },
        { id: 'groq', name: 'Groq', model: 'llama3-8b-8192' }
    ];

    const handleKeySet = (provider: string, key: string) => {
        setKeys(prev => ({ ...prev, [provider]: key }));
    };

    const handleFight = async () => {
        // Reset results for selected providers
        const initialResults: typeof results = {};
        const activeProviders = PROVIDERS.filter(p => keys[p.id]);

        if (activeProviders.length === 0) return;

        activeProviders.forEach(p => {
            initialResults[p.id] = { content: "", duration: 0, loading: true };
        });
        setResults(initialResults);

        const client = new SutraAI();
        // Set all keys
        Object.entries(keys).forEach(([p, k]) => {
            if (k) client.setKey(p as any, k);
        });

        // We used batch() in the core example, but for a React UI with progress, 
        // it's often nicer to fire individual async calls so we can update state independently.
        // However, to stick to the "SDK Power" theme, let's use batch() but we won't get per-request progress 
        // until the batch chunk returns. Wait, batch executes in parallel but returns when all done.
        // To make the UI feel "alive" like a race, independent promises are better here.

        activeProviders.forEach(async (p) => {
            const startTime = performance.now();
            try {
                const response = await client.chat({
                    provider: p.id as any,
                    model: p.model,
                    messages: [{ role: 'user', content: prompt }]
                });
                const duration = Math.round(performance.now() - startTime);
                setResults(prev => ({
                    ...prev,
                    [p.id]: {
                        content: (response.choices[0].message.content as string) || "",
                        duration,
                        loading: false
                    }
                }));
            } catch (err: any) {
                setResults(prev => ({
                    ...prev,
                    [p.id]: {
                        content: "",
                        duration: 0,
                        loading: false,
                        error: err.message
                    }
                }));
            }
        });
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Model Arena</h2>
                <p className="text-gray-400">
                    Race models against each other. Compare speed and quality side-by-side.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
                {PROVIDERS.map(p => (
                    <KeyInput key={p.id} label={`${p.name} Key`} provider={p.id} onKeySet={(k) => handleKeySet(p.id, k)} />
                ))}
            </div>

            <div className="flex gap-4 mb-8">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                    placeholder="Enter prompt for the arena..."
                />
                <button
                    onClick={handleFight}
                    disabled={Object.values(keys).every(k => !k)}
                    className="btn-primary min-w-[120px]"
                >
                    Fight! 🥊
                </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {PROVIDERS.map(p => {
                    const result = results[p.id];
                    const hasKey = !!keys[p.id];

                    if (!hasKey) return (
                        <div key={p.id} className="glass-card p-6 border-dashed border-white/5 opacity-50 flex items-center justify-center min-h-[200px]">
                            <span className="text-sm text-gray-500">Add Key to Enable {p.name}</span>
                        </div>
                    );

                    return (
                        <div key={p.id} className="glass-card p-0 overflow-hidden flex flex-col h-full min-h-[300px]">
                            <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <span className="font-medium">{p.name}</span>
                                {result && !result.loading && (
                                    <span className="text-xs text-green-400 font-mono">{result.duration}ms</span>
                                )}
                            </div>
                            <div className="p-4 flex-1 text-sm text-gray-300 leading-relaxed overflow-y-auto max-h-[400px]">
                                {result?.loading ? (
                                    <div className="flex items-center gap-2 text-gray-500 animate-pulse">
                                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                ) : result?.error ? (
                                    <span className="text-red-400">Error: {result.error}</span>
                                ) : result?.content ? (
                                    result.content
                                ) : (
                                    <span className="text-gray-600 italic">Ready usually...</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
