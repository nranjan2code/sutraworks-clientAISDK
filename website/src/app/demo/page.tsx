"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TicketList from "@/components/demo/TicketList";
import TicketDetail from "@/components/demo/TicketDetail";
import ChatWidget from "@/components/demo/ChatWidget";
import SettingsModal, { DemoConfig } from "@/components/demo/SettingsModal";
import { MOCK_TICKETS } from "@/lib/demo-data";
import { useState, useEffect } from "react";
import { SutraAI } from "@sutraworks/client-ai-sdk";

export default function DemoPage() {
    const [tickets, setTickets] = useState(MOCK_TICKETS);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Settings State
    const [config, setConfig] = useState<DemoConfig>({
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4o'
    });
    const [isConfigured, setIsConfigured] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Load config from session
    useEffect(() => {
        const storedConfig = sessionStorage.getItem("demo_config");
        if (storedConfig) {
            try {
                const parsed = JSON.parse(storedConfig);
                setConfig(parsed);
                // Basic validation to see if "Configured"
                if ((parsed.provider === 'openai' && parsed.apiKey) || parsed.provider === 'ollama') {
                    setIsConfigured(true);
                }
            } catch (e) {
                console.error("Failed to parse config", e);
            }
        }
    }, []);

    const handleSaveConfig = (newConfig: DemoConfig) => {
        setConfig(newConfig);
        sessionStorage.setItem("demo_config", JSON.stringify(newConfig));
        setIsConfigured(true);
        setIsSettingsOpen(false);
    };

    const selectedTicket = tickets.find(t => t.id === selectedId) || null;

    const handleGenerateResponse = async (ticketId: string) => {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        setIsGenerating(true);

        try {
            let responseContent = "";

            if (isConfigured) {
                // Real SDK Call
                const client = new SutraAI();
                if (config.provider === 'openai') {
                    await client.setKey("openai", config.apiKey);
                }
                // Ollama doesn't strictly need a key set, but we can set a dummy one if SDK requires it, 
                // or relies on default base URL. If custom base URL:
                // Note: Current SDK version might assume localhost for Ollama if not configured differently.
                // If the SDK supports setKey for ollama or setBaseUrl, we should use that.
                // Assuming standard usage:

                const result = await client.chat({
                    provider: config.provider,
                    model: config.model,
                    messages: [
                        { role: "system", content: "You are a helpful support agent. Draft a professional response to the following customer ticket." },
                        { role: "user", content: `Customer: ${ticket.customer}\nSubject: ${ticket.subject}\nQuery: ${ticket.query}` }
                    ]
                });

                // Check content type (string or object)
                const content = result.choices[0]?.message?.content;
                if (typeof content === 'string') {
                    responseContent = content;
                } else if (Array.isArray(content)) {
                    responseContent = content.map((c: any) => c.text || '').join('');
                } else {
                    responseContent = JSON.stringify(result);
                }

            } else {
                // Mock Fallback
                await new Promise(resolve => setTimeout(resolve, 2000));
                responseContent = "Hello " + ticket.customer + ",\n\nThank you for reaching out. Based on your usage patterns, it looks like you updated to the Enterprise tier but the cache hasn't invalidated yet.\n\nI have manually triggered a sync for your account. Please retry the API call in 5 minutes and let me know if you still see the 429 errors.\n\nBest regards,\nSutraworks Support AI (Mock Mode)";
            }

            setTickets(prev => prev.map(t => {
                if (t.id === ticketId) {
                    return { ...t, aiDraftResponse: responseContent };
                }
                return t;
            }));

        } catch (error) {
            console.error("AI Generation failed:", error);
            alert("Failed to generate response. Check your settings or console for errors.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <Header />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                config={config}
                onSave={handleSaveConfig}
            />

            <main className="pt-24 min-h-screen flex flex-col bg-[#0a0a0f]">
                {/* Title Section */}
                <section className="px-6 mb-6">
                    <div className="max-w-[1400px] mx-auto flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold mb-4">
                                Smart Support <span className="gradient-text">Dashboard</span>
                            </h1>
                            <p className="text-gray-400 max-w-2xl">
                                Experience an AI-powered support workflow. This dashboard prioritizes tickets,
                                detects sentiment, and drafts responses — all running directly in your browser.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="text-sm text-gray-500 hover:text-white flex items-center gap-2 mb-2 transition-colors"
                            title="Configure API Key"
                        >
                            <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {isConfigured ? 'AI Configured' : 'Configure AI'}
                        </button>
                    </div>
                </section>

                {/* Dashboard Grid */}
                <section className="px-6 flex-grow mb-12">
                    <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[750px] min-h-[600px]">

                        {/* Left Column: Ticket List */}
                        <div className="lg:col-span-4 glass-card p-4 flex flex-col h-full overflow-hidden">
                            <TicketList
                                tickets={tickets}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                            />
                        </div>

                        {/* Middle Column: Active Ticket & Response */}
                        <div className="lg:col-span-8 glass-card p-6 flex flex-col h-full overflow-hidden">
                            <TicketDetail
                                ticket={selectedTicket}
                                onGenerateResponse={handleGenerateResponse}
                                isGenerating={isGenerating}
                            />
                        </div>

                    </div>
                </section>

                <ChatWidget config={config} isConfigured={isConfigured} onOpenSettings={() => setIsSettingsOpen(true)} />
            </main>

            <Footer />
        </>
    );
}
