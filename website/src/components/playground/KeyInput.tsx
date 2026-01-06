"use client";

import { useState, useEffect } from "react";
import { SutraAI } from "@sutraworks/client-ai-sdk";

interface KeyInputProps {
    provider: string;
    onKeySet: (key: string) => void;
    label?: string;
}

export default function KeyInput({ provider, onKeySet, label }: KeyInputProps) {
    const [key, setKey] = useState("");
    const [isSet, setIsSet] = useState(false);

    // Check if key exists in storage on mount
    useEffect(() => {
        const savedKey = localStorage.getItem(`sutra_key_${provider}`);
        if (savedKey) {
            setKey(savedKey); // In real app, we wouldn't expose this back to UI, just confirm it exists
            setIsSet(true);
            onKeySet(savedKey);
        }
    }, [provider, onKeySet]);

    const handleSave = () => {
        if (!key.trim()) return;
        // In a real implementation with the SDK, we'd use SDK's storage.
        // For this simple demo, we'll just save to localStorage for persistence
        localStorage.setItem(`sutra_key_${provider}`, key);
        onKeySet(key);
        setIsSet(true);
    };

    const handleClear = () => {
        localStorage.removeItem(`sutra_key_${provider}`);
        setKey("");
        setIsSet(false);
        onKeySet("");
    };

    return (
        <div className="glass-card p-4 mb-6 border-white/10">
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">
                    {label || `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`}
                </label>
                {isSet && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Key Set
                    </span>
                )}
            </div>

            <div className="flex gap-2">
                <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={`sk-...`}
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                    disabled={isSet}
                />
                {isSet ? (
                    <button
                        onClick={handleClear}
                        className="px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        Clear
                    </button>
                ) : (
                    <button
                        onClick={handleSave}
                        disabled={!key}
                        className="px-4 py-2 bg-cyan-500/20 text-cyan-400 text-sm font-medium rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save
                    </button>
                )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
                Stored in your browser&apos;s localStorage. We never see your keys.
            </p>
        </div>
    );
}
