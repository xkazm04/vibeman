/**
 * Annette Dropdown Panel
 * Floating 320x400 panel with compact chat view and input
 */

'use client';

import { motion } from 'framer-motion';
import { Bot, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAnnetteStore } from '@/stores/annetteStore';
import MiniChatPanel from './MiniChatPanel';
import MiniChatInput from './MiniChatInput';

export default function AnnetteDropdownPanel({ onClose }: { onClose: () => void }) {
  const setActiveModule = useOnboardingStore((s) => s.setActiveModule);
  const audioEnabled = useAnnetteStore((s) => s.audioEnabled);
  const toggleAudio = useAnnetteStore((s) => s.toggleAudio);

  const handleExpand = () => {
    setActiveModule('commander');
    onClose();
    useAnnetteStore.getState().markAllRead();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute top-full right-0 mt-2 z-50 w-80 h-[400px] flex flex-col rounded-xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-xs font-medium text-slate-200">Annette</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleAudio}
            className={`p-1.5 rounded-md transition-colors ${
              audioEnabled
                ? 'text-cyan-400 bg-cyan-500/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
            title={audioEnabled ? 'Disable audio' : 'Enable audio'}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleExpand}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
            title="Open full view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chat body */}
      <MiniChatPanel />

      {/* Input */}
      <MiniChatInput />
    </motion.div>
  );
}
