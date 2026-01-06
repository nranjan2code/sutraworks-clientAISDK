import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
    title: "Features | Sutraworks Client AI SDK",
    description: "Explore all features of the Sutraworks Client AI SDK - security, providers, streaming, middleware, caching, and more.",
};

export default function FeaturesPage() {
    return (
        <>
            <Header />

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Hero */}
                    <div className="text-center mb-16">
                        <span className="badge purple mb-4">Full Feature Set</span>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Built for <span className="gradient-text">Production</span>
                        </h1>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Every feature you need to build secure, scalable AI applications directly in the browser.
                        </p>
                    </div>

                    {/* Security Section */}
                    <section className="mb-20">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold">Security First</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="glass-card p-6">
                                <h3 className="font-semibold text-lg mb-3 text-cyan-400">OWASP 2024 Compliant</h3>
                                <ul className="space-y-2 text-gray-400">
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        600,000 PBKDF2 iterations for key derivation
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        SHA-512 for secure hashing
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        AES-256-GCM authenticated encryption
                                    </li>
                                </ul>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="font-semibold text-lg mb-3 text-cyan-400">Advanced Protection</h3>
                                <ul className="space-y-2 text-gray-400">
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Constant-time comparison prevents timing attacks
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Memory wiping for sensitive data
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Key fingerprinting without exposure
                                    </li>
                                </ul>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="font-semibold text-lg mb-3 text-cyan-400">Flexible Storage</h3>
                                <ul className="space-y-2 text-gray-400">
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 2 3 4 3h8c2 0 4-1 4-3V7M4 7c0-2 2-3 4-3h8c2 0 4 1 4 3" />
                                        </svg>
                                        Memory (default, most secure)
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 2 3 4 3h8c2 0 4-1 4-3V7M4 7c0-2 2-3 4-3h8c2 0 4 1 4 3" />
                                        </svg>
                                        localStorage with encryption
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 2 3 4 3h8c2 0 4-1 4-3V7M4 7c0-2 2-3 4-3h8c2 0 4 1 4 3" />
                                        </svg>
                                        IndexedDB for larger datasets
                                    </li>
                                </ul>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="font-semibold text-lg mb-3 text-cyan-400">Auto Expiration</h3>
                                <ul className="space-y-2 text-gray-400">
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Configurable auto-clear timers
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Session-based key persistence
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Lifecycle management with destroy()
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Middleware Section */}
                    <section className="mb-20">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold">Middleware Pipeline</h2>
                        </div>

                        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[
                                { name: "Logging", desc: "Request/response logging (never logs keys)", icon: "📝" },
                                { name: "Retry", desc: "Exponential backoff with jitter", icon: "🔄" },
                                { name: "Rate Limit", desc: "Client-side request throttling", icon: "⏱️" },
                                { name: "Timeout", desc: "Request timeout handling", icon: "⌛" },
                                { name: "Content Filter", desc: "Filter/sanitize content", icon: "🛡️" },
                                { name: "Fallback", desc: "Auto-switch to backup provider", icon: "🔀" },
                                { name: "Metrics", desc: "Performance monitoring", icon: "📊" },
                                { name: "Custom", desc: "Build your own middleware", icon: "🔧" },
                            ].map((mw) => (
                                <div key={mw.name} className="glass-card p-4 hover:scale-[1.02] transition-transform">
                                    <div className="text-2xl mb-2">{mw.icon}</div>
                                    <h3 className="font-semibold mb-1">{mw.name}</h3>
                                    <p className="text-sm text-gray-500">{mw.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 code-block">
                            <code className="text-sm">
                                <span className="text-gray-500">// Chain middleware together</span>{"\n"}
                                ai.<span className="text-cyan-400">use</span>(<span className="text-cyan-400">createLoggingMiddleware</span>())<br />
                                {"  "}.<span className="text-cyan-400">use</span>(<span className="text-cyan-400">createRetryMiddleware</span>({"{"} maxRetries: <span className="text-purple-400">3</span> {"}"}))<br />
                                {"  "}.<span className="text-cyan-400">use</span>(<span className="text-cyan-400">createRateLimitMiddleware</span>({"{"} requestsPerMinute: <span className="text-purple-400">60</span> {"}"}));
                            </code>
                        </div>
                    </section>

                    {/* Performance Section */}
                    <section className="mb-20">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold">Performance</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="glass-card p-6">
                                <h3 className="font-semibold text-lg mb-4 text-green-400">Intelligent Caching</h3>
                                <ul className="space-y-3 text-gray-400">
                                    <li>• SHA-256 cache keys for request matching</li>
                                    <li>• LRU eviction for memory efficiency</li>
                                    <li>• Configurable TTL and max size</li>
                                    <li>• Cache stats and hit/miss tracking</li>
                                </ul>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="font-semibold text-lg mb-4 text-green-400">Request Optimization</h3>
                                <ul className="space-y-3 text-gray-400">
                                    <li>• Request deduplication</li>
                                    <li>• Batch processing with concurrency control</li>
                                    <li>• Circuit breaker for resilient retries</li>
                                    <li>• Progress callbacks for batch operations</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Developer Experience */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold">Developer Experience</h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="glass-card p-6 text-center">
                                <div className="text-4xl mb-4">📦</div>
                                <h3 className="font-semibold mb-2">Multiple Builds</h3>
                                <p className="text-sm text-gray-500">ESM, CJS, UMD for any environment</p>
                            </div>
                            <div className="glass-card p-6 text-center">
                                <div className="text-4xl mb-4">🎯</div>
                                <h3 className="font-semibold mb-2">Full TypeScript</h3>
                                <p className="text-sm text-gray-500">Rich types with autocomplete</p>
                            </div>
                            <div className="glass-card p-6 text-center">
                                <div className="text-4xl mb-4">📋</div>
                                <h3 className="font-semibold mb-2">Prompt Templates</h3>
                                <p className="text-sm text-gray-500">Reusable prompts with variables</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <Footer />
        </>
    );
}
