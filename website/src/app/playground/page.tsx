"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PiiRedactorDemo from "@/components/playground/PiiRedactorDemo";
import CostRouterDemo from "@/components/playground/CostRouterDemo";
import ModelArenaDemo from "@/components/playground/ModelArenaDemo";

export default function PlaygroundPage() {
    const [activeTab, setActiveTab] = useState<'PII' | 'ROUTER' | 'ARENA'>('PII');

    return (
        <>
            <Header />
            <main className="pt-32 pb-20 min-h-screen">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Solution <span className="gradient-text">Playground</span>
                        </h1>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Test drive real-world architectures built with the Sutra Client AI SDK.
                            Your keys and data never leave this browser tab.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex justify-center mb-12">
                        <div className="glass-card p-1.5 flex gap-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('PII')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'PII'
                                        ? "bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                Zero-Liability PII
                            </button>
                            <button
                                onClick={() => setActiveTab('ROUTER')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'ROUTER'
                                        ? "bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/10"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                Cost Router
                            </button>
                            <button
                                onClick={() => setActiveTab('ARENA')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'ARENA'
                                        ? "bg-green-500/20 text-green-400 shadow-lg shadow-green-500/10"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                Model Arena
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="animate-fade-in">
                        {activeTab === 'PII' && <PiiRedactorDemo />}
                        {activeTab === 'ROUTER' && <CostRouterDemo />}
                        {activeTab === 'ARENA' && <ModelArenaDemo />}
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
