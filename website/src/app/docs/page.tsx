import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
    title: "Documentation | Sutraworks Client AI SDK",
    description: "Quick start guide and API reference for the Sutraworks Client AI SDK.",
};

export default function DocsPage() {
    return (
        <>
            <Header />

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Hero */}
                    <div className="text-center mb-16">
                        <span className="badge green mb-4">Get Started</span>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            <span className="gradient-text">Documentation</span>
                        </h1>
                        <p className="text-xl text-gray-400">
                            Everything you need to integrate Sutraworks into your application.
                        </p>
                    </div>

                    {/* Quick Start */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm">1</span>
                            Installation
                        </h2>
                        <div className="space-y-4">
                            <div className="code-block">
                                <div className="text-gray-500 text-sm mb-2"># Install from GitHub Releases</div>
                                <code>npm install github:nranjan2code/sutraworks-clientAISDK</code>
                            </div>
                            <div className="code-block">
                                <div className="text-gray-500 text-sm mb-2"># Or clone and install locally</div>
                                <code>git clone https://github.com/nranjan2code/sutraworks-clientAISDK.git{"\n"}cd sutraworks-clientAISDK && npm install && npm run build</code>
                            </div>
                            <div className="code-block">
                                <div className="text-gray-500 text-sm mb-2"># CDN (Browser) - use jsDelivr with GitHub</div>
                                <code>&lt;script src=&quot;https://cdn.jsdelivr.net/gh/nranjan2code/sutraworks-clientAISDK@latest/dist/umd/sutra-ai.umd.js&quot;&gt;&lt;/script&gt;</code>
                            </div>
                        </div>
                    </section>


                    {/* Basic Usage */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm">2</span>
                            Basic Usage
                        </h2>
                        <div className="code-block">
                            <code className="text-sm">
                                <span className="text-purple-400">import</span> {"{"} SutraAI {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@sutraworks/client-ai-sdk&apos;</span>;{"\n\n"}
                                <span className="text-gray-500">// Initialize the client</span>{"\n"}
                                <span className="text-purple-400">const</span> ai = <span className="text-purple-400">new</span> <span className="text-cyan-400">SutraAI</span>();{"\n\n"}
                                <span className="text-gray-500">// Set your API key (stored locally, never sent to a server)</span>{"\n"}
                                <span className="text-purple-400">await</span> ai.<span className="text-cyan-400">setKey</span>(<span className="text-green-400">&apos;openai&apos;</span>, <span className="text-green-400">&apos;sk-...&apos;</span>);{"\n\n"}
                                <span className="text-gray-500">// Make a chat request</span>{"\n"}
                                <span className="text-purple-400">const</span> response = <span className="text-purple-400">await</span> ai.<span className="text-cyan-400">chat</span>({"{"}{"\n"}
                                {"  "}provider: <span className="text-green-400">&apos;openai&apos;</span>,{"\n"}
                                {"  "}model: <span className="text-green-400">&apos;gemini-3-flash&apos;</span>,{"\n"}
                                {"  "}messages: [{"{"} role: <span className="text-green-400">&apos;user&apos;</span>, content: <span className="text-green-400">&apos;Hello!&apos;</span> {"}"}]{"\n"}
                                {"}"});{"\n\n"}
                                console.<span className="text-cyan-400">log</span>(response.choices[<span className="text-purple-400">0</span>].message.content);
                            </code>
                        </div>
                    </section>

                    {/* Streaming */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 text-sm">3</span>
                            Streaming Responses
                        </h2>
                        <div className="code-block">
                            <code className="text-sm">
                                <span className="text-purple-400">for await</span> (<span className="text-purple-400">const</span> chunk <span className="text-purple-400">of</span> ai.<span className="text-cyan-400">chatStream</span>({"{"}{"\n"}
                                {"  "}provider: <span className="text-green-400">&apos;openai&apos;</span>,{"\n"}
                                {"  "}model: <span className="text-green-400">&apos;gemini-3-flash&apos;</span>,{"\n"}
                                {"  "}messages: [{"{"} role: <span className="text-green-400">&apos;user&apos;</span>, content: <span className="text-green-400">&apos;Write a poem&apos;</span> {"}"}]{"\n"}
                                {"}"})) {"{"}{"\n"}
                                {"  "}process.stdout.<span className="text-cyan-400">write</span>(chunk.choices[<span className="text-purple-400">0</span>]?.delta?.content ?? <span className="text-green-400">&apos;&apos;</span>);{"\n"}
                                {"}"}
                            </code>
                        </div>
                    </section>

                    {/* API Reference Table */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 text-sm">4</span>
                            API Reference
                        </h2>
                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left p-4 text-gray-400 font-medium">Method</th>
                                        <th className="text-left p-4 text-gray-400 font-medium">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">setKey(provider, key)</td>
                                        <td className="p-4 text-gray-400">Set API key for a provider</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">setKeys(keys)</td>
                                        <td className="p-4 text-gray-400">Set multiple API keys at once</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">chat(request)</td>
                                        <td className="p-4 text-gray-400">Execute chat completion</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">chatStream(request)</td>
                                        <td className="p-4 text-gray-400">Stream chat completion</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">complete(prompt)</td>
                                        <td className="p-4 text-gray-400">Simple text completion</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">embed(request)</td>
                                        <td className="p-4 text-gray-400">Generate embeddings</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">batch(requests)</td>
                                        <td className="p-4 text-gray-400">Process multiple requests</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">use(middleware)</td>
                                        <td className="p-4 text-gray-400">Add middleware to pipeline</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">getUsageStats()</td>
                                        <td className="p-4 text-gray-400">Get usage statistics</td>
                                    </tr>
                                    <tr>
                                        <td className="p-4 font-mono text-cyan-400">destroy()</td>
                                        <td className="p-4 text-gray-400">Clean up all resources</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Showcase */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400 text-sm">★</span>
                            Showcase Application
                        </h2>
                        <div className="glass-card p-8 border-pink-500/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-pink-500/20 transition-colors"></div>

                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-2 text-white">Smart Support Dashboard</h3>
                                <p className="text-gray-400 mb-6 max-w-2xl">
                                    Explore a production-ready reference implementation featuring intelligent ticket routing,
                                    sentiment analysis, and auto-response drafting — all powered by client-side AI.
                                </p>
                                <div className="flex gap-4">
                                    <a href="/docs/showcase" className="btn-primary">
                                        Read Architecture Guide
                                    </a>
                                    <a href="/demo" className="btn-secondary">
                                        View Live Demo
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Links */}
                    <section>
                        <h2 className="text-2xl font-bold mb-6">More Resources</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <a
                                href="https://github.com/nranjan2code/sutraworks-clientAISDK"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glass-card p-6 flex items-center gap-4 hover:scale-[1.02] transition-transform"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold">GitHub Repository</h3>
                                    <p className="text-sm text-gray-500">Full source code and examples</p>
                                </div>
                            </a>

                            <a
                                href="https://github.com/nranjan2code/sutraworks-clientAISDK/blob/main/docs/API.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glass-card p-6 flex items-center gap-4 hover:scale-[1.02] transition-transform"
                            >
                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Full API Docs</h3>
                                    <p className="text-sm text-gray-500">Complete API reference</p>
                                </div>
                            </a>

                            <a
                                href="https://github.com/nranjan2code/sutraworks-clientAISDK/releases"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glass-card p-6 flex items-center gap-4 hover:scale-[1.02] transition-transform"
                            >
                                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold">GitHub Releases</h3>
                                    <p className="text-sm text-gray-500">Download latest release</p>
                                </div>
                            </a>

                            <a
                                href="https://github.com/nranjan2code/sutraworks-clientAISDK/blob/main/CONTRIBUTING.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="glass-card p-6 flex items-center gap-4 hover:scale-[1.02] transition-transform"
                            >
                                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Contributing</h3>
                                    <p className="text-sm text-gray-500">How to contribute</p>
                                </div>
                            </a>
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </>
    );
}
