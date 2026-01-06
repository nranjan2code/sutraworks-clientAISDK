import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
    title: "Providers | Sutraworks Client AI SDK",
    description: "12+ AI providers supported with a unified interface - OpenAI, Anthropic, Google Gemini, Ollama, and more.",
};

const providers = [
    {
        name: "OpenAI",
        slug: "openai",
        models: ["GPT-4o", "GPT-4 Turbo", "GPT-3.5 Turbo"],
        features: { chat: true, streaming: true, embeddings: true, vision: true },
        color: "from-green-500 to-emerald-600",
        description: "Industry-leading models including GPT-4o with vision and function calling.",
    },
    {
        name: "Anthropic",
        slug: "anthropic",
        models: ["Claude 4", "Claude 3.5 Sonnet", "Claude 3 Opus"],
        features: { chat: true, streaming: true, embeddings: false, vision: true },
        color: "from-orange-500 to-amber-600",
        description: "Claude models known for safety, helpfulness, and long context windows.",
    },
    {
        name: "Google Gemini",
        slug: "google",
        models: ["Gemini 2.0 Flash", "Gemini Pro", "Gemini Ultra"],
        features: { chat: true, streaming: true, embeddings: true, vision: true },
        color: "from-blue-500 to-indigo-600",
        description: "Google's multimodal AI with excellent reasoning capabilities.",
    },
    {
        name: "Ollama",
        slug: "ollama",
        models: ["Llama 3.2", "Mistral", "Code Llama", "Custom"],
        features: { chat: true, streaming: true, embeddings: true, vision: true },
        color: "from-gray-500 to-gray-700",
        description: "Run open-source models locally. No API key required!",
        local: true,
    },
    {
        name: "Groq",
        slug: "groq",
        models: ["Llama 3", "Mixtral"],
        features: { chat: true, streaming: true, embeddings: false, vision: false },
        color: "from-red-500 to-rose-600",
        description: "Ultra-fast inference with their custom LPU hardware.",
    },
    {
        name: "Mistral",
        slug: "mistral",
        models: ["Mistral Large", "Mistral Medium", "Codestral"],
        features: { chat: true, streaming: true, embeddings: true, vision: false },
        color: "from-purple-500 to-violet-600",
        description: "European AI with excellent multilingual support.",
    },
    {
        name: "Cohere",
        slug: "cohere",
        models: ["Command R+", "Command R", "Embed"],
        features: { chat: true, streaming: true, embeddings: true, vision: false },
        color: "from-cyan-500 to-teal-600",
        description: "Enterprise-focused with RAG and semantic search.",
    },
    {
        name: "Together AI",
        slug: "together",
        models: ["Llama 3", "Mixtral", "WizardLM"],
        features: { chat: true, streaming: true, embeddings: true, vision: true },
        color: "from-yellow-500 to-orange-600",
        description: "Access to many open-source models via API.",
    },
    {
        name: "Fireworks AI",
        slug: "fireworks",
        models: ["FireLLaVA", "Mixtral", "Llama 3"],
        features: { chat: true, streaming: true, embeddings: true, vision: true },
        color: "from-orange-500 to-red-600",
        description: "Optimized inference for speed and efficiency.",
    },
    {
        name: "Perplexity",
        slug: "perplexity",
        models: ["Sonar", "Sonar Pro"],
        features: { chat: true, streaming: true, embeddings: false, vision: false },
        color: "from-teal-500 to-cyan-600",
        description: "AI with real-time internet search capabilities.",
    },
    {
        name: "DeepSeek",
        slug: "deepseek",
        models: ["DeepSeek Chat", "DeepSeek Coder"],
        features: { chat: true, streaming: true, embeddings: false, vision: false },
        color: "from-blue-600 to-blue-800",
        description: "Strong reasoning and coding capabilities.",
    },
    {
        name: "xAI Grok",
        slug: "xai",
        models: ["Grok-1", "Grok-2"],
        features: { chat: true, streaming: true, embeddings: false, vision: false },
        color: "from-gray-700 to-gray-900",
        description: "Elon Musk's AI with a unique personality.",
    },
];

export default function ProvidersPage() {
    return (
        <>
            <Header />

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Hero */}
                    <div className="text-center mb-16">
                        <span className="badge cyan mb-4">12+ Providers</span>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            One SDK, <span className="gradient-text">Many Providers</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Switch between providers with a single line of code. Same interface, different models.
                        </p>
                    </div>

                    {/* Feature Matrix Legend */}
                    <div className="flex flex-wrap justify-center gap-6 mb-12">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center text-green-400">✓</span>
                            Chat
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">⚡</span>
                            Streaming
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400">📊</span>
                            Embeddings
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center text-orange-400">👁️</span>
                            Vision
                        </div>
                    </div>

                    {/* Provider Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {providers.map((provider) => (
                            <div
                                key={provider.slug}
                                className="glass-card p-6 hover:scale-[1.02] transition-transform relative overflow-hidden group"
                            >
                                {/* Background gradient */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${provider.color} opacity-5 group-hover:opacity-10 transition-opacity`} />

                                {/* Content */}
                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${provider.color} flex items-center justify-center`}>
                                                <span className="text-white font-bold">{provider.name.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{provider.name}</h3>
                                                {provider.local && (
                                                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Local</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-gray-400 mb-4">{provider.description}</p>

                                    {/* Models */}
                                    <div className="mb-4">
                                        <div className="text-xs text-gray-500 mb-2">Popular Models</div>
                                        <div className="flex flex-wrap gap-1">
                                            {provider.models.slice(0, 3).map((model) => (
                                                <span key={model} className="text-xs bg-white/5 px-2 py-1 rounded">
                                                    {model}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <div className="flex gap-2">
                                        {provider.features.chat && (
                                            <span className="w-7 h-7 rounded bg-green-500/20 flex items-center justify-center text-green-400 text-xs" title="Chat">✓</span>
                                        )}
                                        {provider.features.streaming && (
                                            <span className="w-7 h-7 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs" title="Streaming">⚡</span>
                                        )}
                                        {provider.features.embeddings && (
                                            <span className="w-7 h-7 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs" title="Embeddings">📊</span>
                                        )}
                                        {provider.features.vision && (
                                            <span className="w-7 h-7 rounded bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs" title="Vision">👁️</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Code Example */}
                    <div className="mt-16">
                        <h2 className="text-2xl font-bold text-center mb-8">Switch Providers Instantly</h2>
                        <div className="code-block max-w-3xl mx-auto">
                            <code className="text-sm">
                                <span className="text-gray-500">// Same interface, any provider</span>{"\n\n"}
                                <span className="text-gray-500">// Use OpenAI</span>{"\n"}
                                <span className="text-purple-400">await</span> ai.<span className="text-cyan-400">chat</span>({"{"} provider: <span className="text-green-400">&apos;openai&apos;</span>, model: <span className="text-green-400">&apos;gpt-4-turbo&apos;</span>, ... {"}"});{"\n\n"}
                                <span className="text-gray-500">// Switch to Claude</span>{"\n"}
                                <span className="text-purple-400">await</span> ai.<span className="text-cyan-400">chat</span>({"{"} provider: <span className="text-green-400">&apos;anthropic&apos;</span>, model: <span className="text-green-400">&apos;claude-sonnet-4-20250514&apos;</span>, ... {"}"});{"\n\n"}
                                <span className="text-gray-500">// Or run locally with Ollama</span>{"\n"}
                                <span className="text-purple-400">await</span> ai.<span className="text-cyan-400">chat</span>({"{"} provider: <span className="text-green-400">&apos;ollama&apos;</span>, model: <span className="text-green-400">&apos;llama3.2&apos;</span>, ... {"}"});
                            </code>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
