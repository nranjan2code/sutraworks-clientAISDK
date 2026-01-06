"use client"

import React, { useState, useEffect } from 'react';
import { SecureRedactor } from '@/lib/solutions/pii-redactor';
import { CostRouter } from '@/lib/solutions/cost-router';
import { ModelArena } from '@/lib/solutions/model-arena';
import { SecureRAG } from '@/lib/solutions/secure-rag';

export default function Playground() {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'PII' | 'ROUTER' | 'ARENA' | 'RAG'>('PII');
    const [keys, setKeys] = useState({ openai: '', anthropic: '', groq: '' });

    // PII State
    const [piiInput, setPiiInput] = useState('');
    const [piiResult, setPiiResult] = useState<any>(null);
    const [piiLoading, setPiiLoading] = useState(false);

    // Router State
    const [routerInput, setRouterInput] = useState('');
    const [routerTier, setRouterTier] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');
    const [routerResult, setRouterResult] = useState<any>(null);
    const [routerLoading, setRouterLoading] = useState(false);
    const [routerSpend, setRouterSpend] = useState(0);

    // Arena State
    const [arenaInput, setArenaInput] = useState('');
    const [arenaResults, setArenaResults] = useState<any[]>([]);
    const [arenaLoading, setArenaLoading] = useState(false);

    // RAG State
    const [ragDocId, setRagDocId] = useState('doc-1');
    const [ragContent, setRagContent] = useState('Sutra AI Connect is a middleware that allows secure client-side AI processing. It supports various providers like OpenAI and Anthropic.');
    const [ragQuery, setRagQuery] = useState('');
    const [ragAnswer, setRagAnswer] = useState('');
    const [ragIngestedCount, setRagIngestedCount] = useState(0);
    const [ragLoading, setRagLoading] = useState(false);
    const [ragInstance, setRagInstance] = useState<SecureRAG | null>(null);

    // --- Actions ---

    const handleSaveKeys = () => {
        localStorage.setItem('sutra_keys', JSON.stringify(keys));
        alert('Keys saved to LocalStorage!');
    };

    useEffect(() => {
        const saved = localStorage.getItem('sutra_keys');
        if (saved) setKeys(JSON.parse(saved));
    }, []);

    // PII Action
    const runRedaction = async () => {
        if (!keys.openai) return alert('OpenAI Key required');
        setPiiLoading(true);
        try {
            const redactor = new SecureRedactor(keys.openai);
            const result = await redactor.redact(piiInput);
            setPiiResult(result);
        } catch (e: any) {
            alert(e.message);
        }
        setPiiLoading(false);
    };

    // Router Action
    const runRouter = async () => {
        if (!keys.openai || !keys.groq) return alert('OpenAI & Groq Keys required (Simulator)');
        setRouterLoading(true);
        try {
            const router = new CostRouter(keys as any);
            const res = await router.routeAndExecute('user-123', routerTier, routerInput);
            setRouterResult(res);
            setRouterSpend(router.getSpend('user-123'));
        } catch (e: any) {
            alert(e.message);
        }
        setRouterLoading(false);
    };

    // Arena Action
    const runArena = async () => {
        if (!keys.openai) return alert('OpenAI Key required (as Judge)');
        setArenaLoading(true);
        try {
            const arena = new ModelArena(keys);
            const contestants = [
                { provider: 'openai', model: 'gpt-3.5-turbo' },
                { provider: 'groq', model: 'llama3-8b-8192' }, // Assuming Groq key present if used
                // Add more if keys exist
            ];
            // Filter contestants based on available keys
            const validContestants = contestants.filter(c => keys[c.provider as keyof typeof keys]);

            if (validContestants.length < 2) return alert('Need at least 2 providers with keys for Arena');

            const results = await arena.fight(arenaInput, validContestants);
            setArenaResults(results);
        } catch (e: any) {
            alert(e.message);
        }
        setArenaLoading(false);
    };

    // RAG Action
    const runIngest = async () => {
        if (!keys.openai) return alert('OpenAI Key required');
        setRagLoading(true);
        try {
            const rag = new SecureRAG(keys.openai);
            const count = await rag.ingest(ragDocId, ragContent);
            setRagIngestedCount(count);
            setRagInstance(rag);
            alert(`Ingested ${count} chunks!`);
        } catch (e: any) {
            alert(e.message);
        }
        setRagLoading(false);
    };

    const runRagQuery = async () => {
        if (!ragInstance) return alert('Ingest document first');
        setRagLoading(true);
        try {
            const ans = await ragInstance.query(ragQuery);
            setRagAnswer(ans);
        } catch (e: any) {
            alert(e.message);
        }
        setRagLoading(false);
    };


    // --- Render Helpers ---

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
            <header className="max-w-6xl mx-auto mb-12 text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                    Sutraworks Enterprise Playground
                </h1>
                <p className="text-slate-400">Secure Client-Side AI Middleware Demonstrations</p>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* Sidebar: Config */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 text-white">🔑 Configuration</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase mb-1">OpenAI Key</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none"
                                    value={keys.openai}
                                    onChange={e => setKeys({ ...keys, openai: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 uppercase mb-1">Anthropic Key</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none"
                                    value={keys.anthropic}
                                    onChange={e => setKeys({ ...keys, anthropic: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 uppercase mb-1">Groq Key</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none"
                                    value={keys.groq}
                                    onChange={e => setKeys({ ...keys, groq: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={handleSaveKeys}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 rounded transition"
                            >
                                Save Locally
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 text-white">Select Solution</h2>
                        <nav className="space-y-2">
                            {['PII', 'ROUTER', 'ARENA', 'RAG'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === tab ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/50' : 'hover:bg-slate-800 text-slate-400'}`}
                                >
                                    {tab === 'PII' && '🛡️ PII Redactor'}
                                    {tab === 'ROUTER' && '💸 Cost Router'}
                                    {tab === 'ARENA' && '🥊 Model Arena'}
                                    {tab === 'RAG' && '🧠 Secure RAG'}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl min-h-[600px] p-8 shadow-2xl">

                        {/* PII SECTION */}
                        {activeTab === 'PII' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Privacy Redactor</h2>
                                    <p className="text-slate-400">Hybrid Regex + LLM architecture to strip sensitive data before it leaves your app context (demo sends to LLM for redaction, but imagine a local small model!).</p>
                                </div>
                                <textarea
                                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:border-cyan-500 outline-none resize-none"
                                    placeholder="Enter text with sensitive info (Email, SSN, etc.)..."
                                    value={piiInput}
                                    onChange={e => setPiiInput(e.target.value)}
                                />
                                <button
                                    onClick={runRedaction}
                                    disabled={piiLoading}
                                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
                                >
                                    {piiLoading ? 'Redacting...' : 'Protect Privacy'}
                                </button>

                                {piiResult && (
                                    <div className="mt-8 bg-black/30 rounded-xl p-6 border border-slate-800">
                                        <div className="flex items-center gap-4 mb-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${piiResult.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                                    piiResult.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                                                }`}>
                                                RISK: {piiResult.riskLevel}
                                            </span>
                                            <span className="text-slate-500 text-sm">Method: {piiResult.processingMethod}</span>
                                        </div>
                                        <div className="font-mono text-sm space-y-4">
                                            <div>
                                                <div className="text-slate-500 text-xs mb-1">DETECTED FIELDS</div>
                                                <div className="flex gap-2 flex-wrap">
                                                    {piiResult.fieldsDetected.map((f: string, i: number) => (
                                                        <span key={i} className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs">{f}</span>
                                                    ))}
                                                    {piiResult.fieldsDetected.length === 0 && <span className="text-slate-600">None</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500 text-xs mb-1">REDACTED OUTPUT</div>
                                                <p className="text-emerald-400">{piiResult.redactedText}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ROUTER SECTION */}
                        {activeTab === 'ROUTER' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Smart Cost Router</h2>
                                    <p className="text-slate-400">Intelligent routing based on user tier, budget, and query complexity.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">User Tier</label>
                                        <select
                                            className="w-full bg-slate-950 border border-slate-800 rounded p-2"
                                            value={routerTier}
                                            onChange={(e: any) => setRouterTier(e.target.value)}
                                        >
                                            <option value="FREE">Free Tier (Cheap Models Only)</option>
                                            <option value="PRO">Pro Tier (Smart Routing)</option>
                                            <option value="ENTERPRISE">Enterprise (Uncapped)</option>
                                        </select>
                                    </div>
                                    <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                                        <div className="text-xs text-slate-400">Current Spend</div>
                                        <div className="text-xl font-mono text-emerald-400">${routerSpend.toFixed(4)}</div>
                                    </div>
                                </div>
                                <textarea
                                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 focus:border-cyan-500 outline-none resize-none"
                                    placeholder="Ask something... (try simple 'hi' vs complex 'analyze this code')"
                                    value={routerInput}
                                    onChange={e => setRouterInput(e.target.value)}
                                />
                                <button
                                    onClick={runRouter}
                                    disabled={routerLoading}
                                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
                                >
                                    {routerLoading ? 'Routing...' : 'Execute Request'}
                                </button>

                                {routerResult && !routerResult.error && (
                                    <div className="mt-8 bg-black/30 rounded-xl p-6 border border-slate-800">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-2xl">{routerResult.model.includes('gpt-4') ? '🧠' : '🚀'}</span>
                                            <div>
                                                <div className="font-bold text-white">Routed to: {routerResult.provider} / {routerResult.model}</div>
                                                <div className="text-xs text-cyan-400">{routerResult.reason || 'Optimal Route'}</div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-900 rounded border border-slate-800 text-slate-300 text-sm whitespace-pre-wrap">
                                            {routerResult.choices[0].message.content}
                                        </div>
                                    </div>
                                )}
                                {routerResult?.error && (
                                    <div className="mt-8 bg-red-900/20 text-red-400 p-4 rounded border border-red-900/50">
                                        🚨 {routerResult.error}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ARENA SECTION */}
                        {activeTab === 'ARENA' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Model Arena</h2>
                                    <p className="text-slate-400">Run multiple models in parallel and use an AI Judge to score the best answer.</p>
                                </div>
                                <input
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 focus:border-cyan-500 outline-none"
                                    placeholder="Enter a prompt for the models to fight over..."
                                    value={arenaInput}
                                    onChange={e => setArenaInput(e.target.value)}
                                />
                                <button
                                    onClick={runArena}
                                    disabled={arenaLoading}
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50 w-full"
                                >
                                    {arenaLoading ? 'FIGHTING...' : '🥊 START FIGHT 🥊'}
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    {arenaResults.map((res: any, idx: number) => (
                                        <div key={idx} className={`p-4 rounded-xl border ${res.vote >= 8.5 ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-950 border-slate-800'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-bold text-sm text-slate-300">{res.provider}/{res.model}</div>
                                                {res.vote && <div className="text-xs bg-slate-800 px-2 py-1 rounded text-cyan-400 font-mono">Score: {res.vote}/10</div>}
                                            </div>
                                            <div className="text-xs text-slate-400 mb-2">
                                                Latency: {res.latency}ms | Tokens: {res.tokens}
                                            </div>
                                            <div className="text-sm text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                {res.content}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* RAG SECTION */}
                        {activeTab === 'RAG' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Secure Client RAG</h2>
                                    <p className="text-slate-400">Ingest documents and query them entirely in the browser using client-side vector logic.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-6 h-[400px]">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs text-slate-500">Document Content</label>
                                        <textarea
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-400 text-sm resize-none focus:border-cyan-500 outline-none"
                                            value={ragContent}
                                            onChange={e => setRagContent(e.target.value)}
                                        />
                                        <button
                                            onClick={runIngest}
                                            disabled={ragLoading}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded"
                                        >
                                            Ingest Document
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 mb-1 block">Ask Question</label>
                                            <input
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300"
                                                placeholder="Ask about the doc..."
                                                value={ragQuery}
                                                onChange={e => setRagQuery(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={runRagQuery}
                                            disabled={ragLoading || !ragInstance}
                                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2 rounded"
                                        >
                                            Query
                                        </button>
                                        <div className="flex-1 bg-black/20 rounded-xl p-4 border border-slate-800 overflow-y-auto">
                                            <div className="text-xs text-slate-500 mb-2">ANSWER</div>
                                            <p className="text-slate-200 text-sm whitespace-pre-wrap">{ragAnswer || '...'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
