import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, FileCode, Layers, BrainCircuit, ChevronDown } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useAnnetteActionsStore } from '@/stores/annetteActionsStore';
import { SupportedProvider } from '@/lib/llm/types';

interface ContextHUDProps {
    activeProjectName: string | null;
    contextCount: number;
    memoryCount: number;
    isListening: boolean;
}

// Provider configurations
const PROVIDERS: Array<{ value: SupportedProvider; label: string; color: string }> = [
    { value: 'gemini', label: 'Gemini', color: 'text-blue-400' },
    { value: 'ollama', label: 'Ollama', color: 'text-purple-400' },
    { value: 'openai', label: 'OpenAI', color: 'text-emerald-400' },
    { value: 'anthropic', label: 'Claude', color: 'text-amber-400' },
];

export default function ContextHUD({ activeProjectName, contextCount, memoryCount, isListening }: ContextHUDProps) {
    const { getThemeConfig } = useThemeStore();
    const themeConfig = getThemeConfig();
    const selectedProvider = useAnnetteActionsStore((state) => state.selectedProvider);
    const setSelectedProvider = useAnnetteActionsStore((state) => state.setSelectedProvider);
    const [showProviderMenu, setShowProviderMenu] = useState(false);

    const currentProvider = PROVIDERS.find(p => p.value === selectedProvider) || PROVIDERS[0];

    return (
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Layers className="w-3 h-3" />
                    <span className="font-medium text-gray-300">{activeProjectName || 'No Project'}</span>
                </div>

                <div className="h-3 w-px bg-white/10" />

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500" title="Loaded Contexts">
                        <FileCode className="w-3 h-3" />
                        <span>{contextCount} ctx</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500" title="Memory Items">
                        <Database className="w-3 h-3" />
                        <span>{memoryCount} mem</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* LLM Provider Selector */}
                <div className="relative">
                    <motion.button
                        onClick={() => setShowProviderMenu(!showProviderMenu)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/40 hover:bg-black/60 border border-white/10 transition-all"
                        title="Select LLM Provider"
                    >
                        <span className={`text-[10px] font-mono uppercase ${currentProvider.color}`}>
                            {currentProvider.label}
                        </span>
                        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showProviderMenu ? 'rotate-180' : ''}`} />
                    </motion.button>

                    {/* Provider Dropdown */}
                    <AnimatePresence>
                        {showProviderMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full right-0 mt-1 w-32 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl overflow-hidden z-50"
                            >
                                {PROVIDERS.map((provider) => (
                                    <motion.button
                                        key={provider.value}
                                        onClick={() => {
                                            setSelectedProvider(provider.value);
                                            setShowProviderMenu(false);
                                        }}
                                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                                        className={`w-full px-3 py-2 text-left text-xs font-mono uppercase transition-colors ${
                                            provider.value === selectedProvider
                                                ? `${provider.color} bg-white/5`
                                                : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {provider.label}
                                        {provider.value === selectedProvider && (
                                            <span className="ml-2 text-[8px]">✓</span>
                                        )}
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="h-3 w-px bg-white/10" />

                <motion.div
                    animate={{ opacity: isListening ? [0.5, 1, 0.5] : 0.5 }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center gap-1.5"
                >
                    <BrainCircuit className={`w-3 h-3 ${isListening ? 'text-cyan-400' : 'text-gray-600'}`} />
                    <span className={`text-[10px] font-mono uppercase ${isListening ? 'text-cyan-400' : 'text-gray-600'}`}>
                        {isListening ? 'Active' : 'Standby'}
                    </span>
                </motion.div>
            </div>
        </div>
    );
}
