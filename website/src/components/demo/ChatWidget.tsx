import { useState, useRef, useEffect } from "react";
import { SutraAI } from "@sutraworks/client-ai-sdk";
import { DemoConfig } from "./SettingsModal";

interface ChatWidgetProps {
    config: DemoConfig;
    isConfigured: boolean;
    onOpenSettings: () => void;
}

export default function ChatWidget({ config, isConfigured, onOpenSettings }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: 'Hi there! How can I help you today?' }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false); // Typing indicator state
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, isTyping]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            let aiContent = "";

            if (isConfigured) {
                const client = new SutraAI();
                if (config.provider === 'openai') {
                    await client.setKey("openai", config.apiKey);
                }

                const result = await client.chat({
                    provider: config.provider,
                    model: config.model,
                    messages: [
                        { role: "system", content: "You are a friendly and helpful customer support agent for Sutraworks." },
                        ...messages.map(m => ({ role: m.role, content: m.content })),
                        { role: "user", content: userMsg }
                    ]
                });

                const content = result.choices[0]?.message?.content;
                if (typeof content === 'string') {
                    aiContent = content;
                } else if (Array.isArray(content)) {
                    aiContent = content.map((c: any) => c.text || '').join('');
                } else {
                    aiContent = JSON.stringify(result);
                }
            } else {
                // Prompt to configure
                await new Promise(resolve => setTimeout(resolve, 500));
                // We don't generate text here anymore, we sort of 'break' flow to show UI hint?
                // Actually, returning a message from the bot telling them to configure is good practice.
                aiContent = "To chat with me, please [Configure AI Settings] first! I support OpenAI and local Ollama models.";
            }

            setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please check your connection or API key." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Bot Icon Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg hover:shadow-cyan-500/25 transition-all hover:scale-110 flex items-center justify-center animate-bounce-subtle"
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-[350px] h-[500px] glass-card flex flex-col shadow-2xl animate-fade-in border-cyan-500/20 bg-[#0a0a0f]/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">Support Bot</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    <span className="text-xs text-green-400">Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-cyan-600 text-white rounded-br-none'
                                    : 'bg-white/10 text-gray-200 rounded-bl-none'
                                    }`}>
                                    {msg.content.includes("[Configure AI Settings]") ? (
                                        <span>
                                            To chat with me, please{" "}
                                            <button onClick={onOpenSettings} className="text-cyan-400 hover:underline font-bold">
                                                configure AI settings
                                            </button>
                                            {" "}first! I support OpenAI and local Ollama models.
                                        </span>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white/10 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1.5 items-center">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-white/5 rounded-b-2xl">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isConfigured ? "Type a message..." : "Configure AI to chat..."}
                                className="w-full bg-black/20 border border-white/10 rounded-full py-2 px-4 pr-10 focus:outline-none focus:border-cyan-500/50 text-sm text-white placeholder-gray-500 focus:bg-black/40 transition-colors"
                                disabled={!isConfigured && false} // Let them try so they see the mock msg
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
