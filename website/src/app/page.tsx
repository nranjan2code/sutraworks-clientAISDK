import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />

      <main className="pt-24">
        {/* Hero Section */}
        <section className="min-h-[90vh] flex items-center justify-center px-6">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fade-in">
              <span className="badge cyan">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Zero-Trust Security
              </span>
              <span className="badge green">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                516+ Tests Passing
              </span>
              <span className="badge purple">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Zero Dependencies
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
              The Universal{" "}
              <span className="gradient-text">Client-Side AI SDK</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
              BYOK Architecture — Your API keys never leave your device.{" "}
              <span className="text-white">One SDK, 12+ providers, zero server trust.</span>
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="text-center">
                <div className="text-4xl font-bold gradient-text">12+</div>
                <div className="text-gray-500">AI Providers</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold gradient-text">81%</div>
                <div className="text-gray-500">Test Coverage</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold gradient-text">0</div>
                <div className="text-gray-500">Dependencies</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold gradient-text">MIT</div>
                <div className="text-gray-500">License</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center gap-4 mb-12 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <a
                href="https://github.com/nranjan2code/sutraworks-clientAISDK/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Get from GitHub
              </a>
              <a
                href="https://github.com/nranjan2code/sutraworks-clientAISDK"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>

            {/* Code Example */}
            <div className="max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <div className="code-block text-left">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                  <span className="text-gray-500 text-sm">Quick Start</span>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
                  </div>
                </div>
                <code>
                  <span className="text-purple-400">import</span> {"{"} SutraAI {"}"}{" "}
                  <span className="text-purple-400">from</span>{" "}
                  <span className="text-green-400">&apos;@sutraworks/client-ai-sdk&apos;</span>;{"\n\n"}
                  <span className="text-gray-500">// Initialize with your own API key</span>{"\n"}
                  <span className="text-purple-400">const</span> ai ={" "}
                  <span className="text-purple-400">new</span>{" "}
                  <span className="text-cyan-400">SutraAI</span>();{"\n"}
                  <span className="text-purple-400">await</span> ai.
                  <span className="text-cyan-400">setKey</span>(
                  <span className="text-green-400">&apos;openai&apos;</span>,{" "}
                  <span className="text-green-400">&apos;sk-...&apos;</span>);{"\n\n"}
                  <span className="text-gray-500">// Your key stays in the browser!</span>{"\n"}
                  <span className="text-purple-400">const</span> response ={" "}
                  <span className="text-purple-400">await</span> ai.
                  <span className="text-cyan-400">chat</span>({"{"}{"\n"}
                  {"  "}provider: <span className="text-green-400">&apos;openai&apos;</span>,{"\n"}
                  {"  "}model: <span className="text-green-400">&apos;gpt-4-turbo&apos;</span>,{"\n"}
                  {"  "}messages: [{"{"} role: <span className="text-green-400">&apos;user&apos;</span>, content: <span className="text-green-400">&apos;Hello!&apos;</span> {"}"}]{"\n"}
                  {"}"});
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Comparison */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Why <span className="gradient-text">BYOK</span>?
            </h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              Traditional AI integrations require sending your API keys to a backend server.
              Sutraworks flips this model — all calls happen directly from the browser.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Traditional */}
              <div className="glass-card p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Traditional Architecture</h3>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-center gap-4 text-gray-400">
                    <span className="text-cyan-400">Browser</span>
                    <span>→</span>
                    <span className="text-orange-400">Your Server</span>
                    <span>→</span>
                    <span className="text-purple-400">AI Provider</span>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                    ⚠️ Keys stored on server = Single point of failure
                  </div>
                </div>
              </div>

              {/* Sutraworks */}
              <div className="glass-card p-8 relative overflow-hidden border-cyan-500/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Sutraworks Architecture</h3>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-center gap-4 text-gray-400">
                    <span className="text-cyan-400">Browser</span>
                    <span>──────────────→</span>
                    <span className="text-purple-400">AI Provider</span>
                  </div>
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                    ✅ Keys stay in browser = Zero server trust required
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-6 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              A complete toolkit for building AI-powered applications with best-in-class security.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Security */}
              <div className="glass-card p-6 group hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Security First</h3>
                <p className="text-gray-400 text-sm">
                  OWASP 2024 compliant encryption with 600K PBKDF2 iterations, AES-256-GCM, and constant-time comparisons.
                </p>
              </div>

              {/* Providers */}
              <div className="glass-card p-6 group hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">12+ Providers</h3>
                <p className="text-gray-400 text-sm">
                  OpenAI, Anthropic, Google Gemini, Ollama, Groq, Mistral, Cohere, and more with a unified interface.
                </p>
              </div>

              {/* Streaming */}
              <div className="glass-card p-6 group hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Real-time Streaming</h3>
                <p className="text-gray-400 text-sm">
                  Stream responses in real-time with proper SSE parsing and async iterators.
                </p>
              </div>

              {/* Middleware */}
              <div className="glass-card p-6 group hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Middleware Pipeline</h3>
                <p className="text-gray-400 text-sm">
                  Logging, retry, rate limiting, timeout, content filtering, fallback, and metrics middleware.
                </p>
              </div>

              {/* Caching */}
              <div className="glass-card p-6 group hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Intelligent Caching</h3>
                <p className="text-gray-400 text-sm">
                  SHA-256 cache keys with LRU eviction. Request deduplication to prevent duplicate API calls.
                </p>
              </div>

              {/* TypeScript */}
              <div className="glass-card p-6 group hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Full TypeScript</h3>
                <p className="text-gray-400 text-sm">
                  Rich type definitions, ESM/CJS/UMD builds, and excellent IDE support with autocomplete.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Providers Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Supported <span className="gradient-text">Providers</span>
            </h2>
            <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
              Use the same API to work with any of these AI providers — switch with a single line.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { name: "OpenAI", color: "bg-green-500/20", textColor: "text-green-400" },
                { name: "Anthropic", color: "bg-orange-500/20", textColor: "text-orange-400" },
                { name: "Google", color: "bg-blue-500/20", textColor: "text-blue-400" },
                { name: "Ollama", color: "bg-gray-500/20", textColor: "text-gray-400" },
                { name: "Groq", color: "bg-red-500/20", textColor: "text-red-400" },
                { name: "Mistral", color: "bg-purple-500/20", textColor: "text-purple-400" },
                { name: "Cohere", color: "bg-cyan-500/20", textColor: "text-cyan-400" },
                { name: "Together", color: "bg-yellow-500/20", textColor: "text-yellow-400" },
                { name: "Fireworks", color: "bg-orange-500/20", textColor: "text-orange-400" },
                { name: "Perplexity", color: "bg-teal-500/20", textColor: "text-teal-400" },
                { name: "DeepSeek", color: "bg-blue-500/20", textColor: "text-blue-400" },
                { name: "xAI Grok", color: "bg-white/10", textColor: "text-white" },
              ].map((provider) => (
                <div
                  key={provider.name}
                  className="glass-card p-4 flex items-center justify-center hover:scale-105 transition-transform cursor-default"
                >
                  <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center mr-3`}>
                    <span className={`font-bold text-sm ${provider.textColor}`}>
                      {provider.name.charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium text-sm">{provider.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10"></div>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Build?
                </h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                  Get started in seconds from GitHub. Join developers who trust Sutraworks for their AI integrations.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <a
                    href="https://github.com/nranjan2code/sutraworks-clientAISDK/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    Install from GitHub
                  </a>
                  <a href="/docs" className="btn-secondary">
                    Read the Docs
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
