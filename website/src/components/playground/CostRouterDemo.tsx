"use client";

import { useState } from "react";
import { SutraAI } from "@sutraworks/client-ai-sdk";
import KeyInput from "./KeyInput";

export default function CostRouterDemo() {
    const [openaiKey, setOpenaiKey] = useState("");
    const [groqKey, setGroqKey] = useState("");

    // Configuration
    const [fastProvider, setFastProvider] = useState<'groq' | 'ollama'>('groq');
    const [ollamaModel, setOllamaModel] = useState("llama3");

    const [prompt, setPrompt] = useState("Calculate the 100th fibonacci number.");
    const [decision, setDecision] = useState<{
        route: 'FAST' | 'SMART';
        complexity: string;
        reason: string;
        model: string;
        tokens: number;
        response?: string;
        cost: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    // Simulated costs per 1k tokens
    const COSTS = {
        FAST: fastProvider === 'groq' ? 0.0005 : 0, // Ollama is free
        SMART: 0.01
    };

    const analyzeComplexity = (text: string): 'LOW' | 'HIGH' => {
        const complexKeywords = ['analyze', 'compare', 'contrast', 'code', 'refactor', 'math', 'reason', 'why', 'explain'];
        const lower = text.toLowerCase();

        if (text.length > 200) return 'HIGH';
        if (complexKeywords.some(k => lower.includes(k))) return 'HIGH';
        return 'LOW';
    };

    const handleRoute = async () => {
        if (!openaiKey && fastProvider === 'groq' && !groqKey) return;
        setLoading(true);
        setDecision(null);

        try {
            const client = new SutraAI();
            if (openaiKey) client.setKey("openai", openaiKey);
            if (fastProvider === 'groq' && groqKey) client.setKey("groq", groqKey);
            // Ollama usually doesn't need a key, default is empty string or handled by SDK config

            // 1. Analyze
            const complexity = analyzeComplexity(prompt);
            const tokens = client.estimateTokens([{ role: 'user', content: prompt }]);

            // 2. Decide
            let route: 'FAST' | 'SMART' = 'FAST';
            let provider: string = fastProvider;
            let model = fastProvider === 'groq' ? 'llama3-8b-8192' : ollamaModel;

            // Logic: If complex, go SMART. If simple, go FAST.
            // Constraint: If "Fast" provider isn't ready (missing key for Groq), try SMART.
            const fastReady = fastProvider === 'ollama' || (fastProvider === 'groq' && !!groqKey);

            if (complexity === 'HIGH' || !fastReady) {
                if (openaiKey) {
                    route = 'SMART';
                    provider = 'openai';
                    model = 'gpt-4-turbo';
                }
            }

            // If we routed Fast but it's not ready, force Smart (already handled above, but double check)
            if (route === 'FAST' && !fastReady && openaiKey) {
                route = 'SMART';
                provider = 'openai';
                model = 'gpt-4-turbo';
            }

            setDecision({
                route,
                complexity,
                reason: complexity === 'HIGH' ? "Complex keywords/length detected" : "Simple query detected",
                model: `${provider}/${model}`,
                tokens,
                cost: (tokens / 1000) * COSTS[route],
                response: undefined
            });

            // 3. Execute
            const response = await client.chat({
                provider: provider as any,
                model: model,
                messages: [{ role: 'user', content: prompt }]
            });

            setDecision(prev => prev ? ({
                ...prev,
                response: (response.choices[0].message.content as string) || ""
            }) : null);

        } catch (err) {
            console.error(err);
            alert("Error executing request: " + (err as Error).message + (fastProvider === 'ollama' ? "\n\nTip: For Ollama, make sure to run: OLLAMA_ORIGINS=\"*\" ollama serve" : ""));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Hybrid Cost Router</h2>
                <p className="text-gray-400">
                    Dynamically routes queries to the cheapest effective model. Try asking simple questions ("Hello") vs complex ones ("Explain quantum physics").
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Smart Provider - Always OpenAI for this demo */}
                <KeyInput label="OpenAI Key (Smart Model)" provider="openai" onKeySet={setOpenaiKey} />

                {/* Fast Provider - Toggle */}
                <div className="glass-card p-4 mb-6 border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-medium text-gray-300">Fast/Cheap Route</label>
                        <div className="flex bg-black/40 rounded-lg p-1">
                            <button
                                onClick={() => setFastProvider('groq')}
                                className={`text-xs px-3 py-1 rounded-md transition-all ${fastProvider === 'groq' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}
                            >
                                Groq (Cloud)
                            </button>
                            <button
                                onClick={() => setFastProvider('ollama')}
                                className={`text-xs px-3 py-1 rounded-md transition-all ${fastProvider === 'ollama' ? 'bg-orange-500/20 text-orange-400' : 'text-gray-500 hover:text-white'}`}
                            >
                                Ollama (Local)
                            </button>
                        </div>
                    </div>

                    {fastProvider === 'groq' ? (
                        <KeyInput label="Groq Key" provider="groq" onKeySet={setGroqKey} />
                    ) : (
                        <div className="space-y-3 animate-fade-in">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Local Model Name</label>
                                <input
                                    type="text"
                                    value={ollamaModel}
                                    onChange={(e) => setOllamaModel(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                                    placeholder="e.g. llama3, mistral, phi3"
                                />
                            </div>
                            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                <p className="text-xs text-orange-400 flex items-start gap-2">
                                    <span className="mt-0.5">⚠️</span>
                                    <span>
                                        <strong>CORS Setup Required:</strong><br />
                                        Run Ollama with: <code className="bg-black/30 px-1 rounded">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</code>
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-4 mb-8">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                    placeholder="Enter your prompt..."
                />
                <button
                    onClick={handleRoute}
                    disabled={loading || (!openaiKey && fastProvider === 'groq' && !groqKey)}
                    className="btn-primary min-w-[120px]"
                >
                    {loading ? "Routing..." : "Route & Run"}
                </button>
            </div>

            {/* Visualization */}
            <div className="grid md:grid-cols-3 gap-6">
                {/* Router Logic */}
                <div className="col-span-1 space-y-4">
                    <div className="glass-card p-4 relative overflow-hidden">
                        <h3 className="text-sm font-medium text-gray-400 mb-4">Router Decision</h3>
                        {!decision ? (
                            <div className="text-center text-gray-600 py-8">Waiting...</div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Complexity</div>
                                    <div className={`text-lg font-bold ${decision.complexity === 'HIGH' ? 'text-purple-400' : 'text-green-400'}`}>
                                        {decision.complexity}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{decision.reason}</p>
                                </div>
                                <div className="h-px bg-white/10"></div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Detailed Path</div>
                                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${decision.route === 'SMART' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                                        {decision.route} PATH
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Output */}
                <div className="md:col-span-2">
                    <div className="glass-card p-4 min-h-[300px]">
                        <h3 className="text-sm font-medium text-gray-400 mb-4">Output</h3>
                        {loading && !decision?.response ? (
                            <div className="flex items-center justify-center h-40">
                                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : decision?.response ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                    <span>Model: {decision.model}</span>
                                    <span>•</span>
                                    <span>Tokens: ~{decision.tokens}</span>
                                    <span>•</span>
                                    <span>Est. Cost: ${decision.cost.toFixed(6)}</span>
                                </div>
                                <div className="markdown-body text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                                    {decision.response}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-40 text-gray-600">
                                Result will appear here
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
