import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function ShowcaseDocsPage() {
    return (
        <>
            <Header />

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
                        <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
                        <span>/</span>
                        <span className="text-cyan-400">Showcase</span>
                    </div>

                    {/* Hero */}
                    <div className="mb-12">
                        <span className="badge purple mb-4">Live Demo</span>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            Smart Support <span className="gradient-text">Dashboard</span>
                        </h1>
                        <p className="text-xl text-gray-400 mb-8">
                            A reference implementation of a real-world support application built with the Sutraworks Client AI SDK.
                        </p>
                        <div className="flex gap-4">
                            <Link href="/demo" className="btn-primary">
                                Try Live Demo
                            </Link>
                            <a href="https://github.com/nranjan2code/sutraworks-clientAISDK/tree/main/website/src/app/demo" target="_blank" className="btn-secondary">
                                View Source Code
                            </a>
                        </div>
                    </div>

                    {/* Overview */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-6">Overview</h2>
                        <div className="prose prose-invert max-w-none text-gray-300">
                            <p className="mb-4">
                                The Smart Support Dashboard demonstrates how to build a secure, client-side AI application using the BYOK (Bring Your Own Key) architecture.
                                It features three main AI capabilities:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mb-6">
                                <li><strong className="text-white">Sentiment Analysis:</strong> Automatically tagging tickets based on customer tone.</li>
                                <li><strong className="text-white">Priority Classification:</strong> Assessing urgency from ticket content.</li>
                                <li><strong className="text-white">Auto-Response Drafting:</strong> Generating context-aware email replies.</li>
                            </ul>
                            <p>
                                All of these features run <strong>entirely in the browser</strong>. The API keys are stored in `sessionStorage` and never transmitted to our servers.
                            </p>
                        </div>
                    </section>

                    {/* Architecture */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-6">Architecture</h2>
                        <div className="glass-card p-8 mb-6">
                            <div className="flex items-center justify-between text-sm font-mono text-gray-400 mb-8">
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-2 text-cyan-400">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </div>
                                    User Browser
                                </div>
                                <div className="flex-1 border-t-2 border-dashed border-gray-700 mx-4 relative">
                                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0a0f] px-2 text-xs">Direct API Calls</span>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-2 text-green-400">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    </div>
                                    OpenAI / Anthropic
                                </div>
                            </div>
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm text-center">
                                ❌ No Backend Middleware Required
                            </div>
                        </div>
                    </section>

                    {/* Implementation Highlights */}
                    <section className="mb-16">
                        <h2 className="text-2xl font-bold mb-6">Code Highlights</h2>

                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-4 text-white">1. Initializing the Client</h3>
                            <div className="code-block">
                                <code className="text-sm">
                                    <span className="text-purple-400">import</span> {"{"} SutraAI {"}"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@sutraworks/client-ai-sdk&apos;</span>;{"\n\n"}
                                    <span className="text-purple-400">const</span> client = <span className="text-purple-400">new</span> <span className="text-cyan-400">SutraAI</span>();{"\n"}
                                    <span className="text-purple-400">await</span> client.<span className="text-cyan-400">setKey</span>(<span className="text-green-400">&quot;openai&quot;</span>, apiKey);
                                </code>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-lg font-semibold mb-4 text-white">2. Generating a Response</h3>
                            <div className="code-block">
                                <code className="text-sm">
                                    <span className="text-purple-400">const</span> result = <span className="text-purple-400">await</span> client.<span className="text-cyan-400">chat</span>({"{"}{"\n"}
                                    {"  "}provider: <span className="text-green-400">&quot;openai&quot;</span>,{"\n"}
                                    {"  "}model: <span className="text-green-400">&quot;gpt-4o&quot;</span>,{"\n"}
                                    {"  "}messages: [{"{"}{"\n"}
                                    {"    "}role: <span className="text-green-400">&quot;system&quot;</span>,{"\n"}
                                    {"    "}content: <span className="text-green-400">&quot;You are a support agent. Draft a reply...&quot;</span>{"\n"}
                                    {"  "}{"}"}, {"{"}{"\n"}
                                    {"    "}role: <span className="text-green-400">&quot;user&quot;</span>,{"\n"}
                                    {"    "}content: ticketMetadata{"\n"}
                                    {"  "}{"}"}]{"\n"}
                                    {"}"});
                                </code>
                            </div>
                        </div>
                    </section>

                </div>
            </main>

            <Footer />
        </>
    );
}
