import { useState, useEffect } from "react";

export type ProviderType = 'openai' | 'ollama';

export interface DemoConfig {
    provider: ProviderType;
    apiKey: string;
    model: string;
    baseUrl?: string;
}

interface SettingsModalProps {
    config: DemoConfig;
    onSave: (config: DemoConfig) => void;
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ config, onSave, isOpen, onClose }: SettingsModalProps) {
    const [localConfig, setLocalConfig] = useState<DemoConfig>(config);

    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    const handleChange = (field: keyof DemoConfig, value: string) => {
        setLocalConfig(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="glass-card p-8 w-full max-w-md border-cyan-500/20">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Demo Settings
                </h2>

                <p className="text-gray-400 mb-6 text-sm">
                    Configure your AI provider. Credentials stay in your browser.
                </p>

                {/* Provider Select */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
                    <select
                        value={localConfig.provider}
                        onChange={(e) => {
                            const newProvider = e.target.value as ProviderType;
                            setLocalConfig(prev => ({
                                ...prev,
                                provider: newProvider,
                                // Set default models when switching
                                model: newProvider === 'openai' ? 'gpt-4o' : 'llama3'
                            }));
                        }}
                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500/50"
                    >
                        <option value="openai">OpenAI</option>
                        <option value="ollama">Ollama (Local)</option>
                    </select>
                </div>

                {/* OpenAI Specifics */}
                {localConfig.provider === 'openai' && (
                    <div className="mb-6 animate-fade-in">
                        <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                        <input
                            type="password"
                            value={localConfig.apiKey}
                            onChange={(e) => handleChange('apiKey', e.target.value)}
                            placeholder="sk-..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white mb-4 focus:outline-none focus:border-cyan-500/50"
                        />
                        <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                        <input
                            type="text"
                            value={localConfig.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>
                )}

                {/* Ollama Specifics */}
                {localConfig.provider === 'ollama' && (
                    <div className="mb-6 animate-fade-in">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Base URL</label>
                        <input
                            type="text"
                            value={localConfig.baseUrl || 'http://localhost:11434'}
                            onChange={(e) => handleChange('baseUrl', e.target.value)}
                            placeholder="http://localhost:11434"
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white mb-4 focus:outline-none focus:border-cyan-500/50"
                        />
                        <div className="text-xs text-gray-500 mb-4">
                            Ensure Ollama is running (`ollama serve`). You may need to configure CORS if running on a different port.
                        </div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                        <input
                            type="text"
                            value={localConfig.model}
                            onChange={(e) => handleChange('model', e.target.value)}
                            placeholder="llama3"
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                    >
                        Use Mock Mode
                    </button>
                    <button
                        onClick={() => onSave(localConfig)}
                        className="btn-primary"
                        disabled={localConfig.provider === 'openai' && !localConfig.apiKey}
                    >
                        Save & Connect
                    </button>
                </div>
            </div>
        </div>
    );
}
