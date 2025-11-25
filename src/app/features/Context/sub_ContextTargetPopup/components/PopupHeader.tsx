/**
 * Popup Header Component
 *
 * Displays the context name and provides AI generation and close actions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Target, X, Sparkles } from 'lucide-react';

interface PopupHeaderProps {
  contextName: string;
  isGenerating: boolean;
  onGenerateClick: () => void;
  onClose: () => void;
}

export default function PopupHeader({
  contextName,
  isGenerating,
  onGenerateClick,
  onClose,
}: PopupHeaderProps) {
  return (
    <div className="relative p-5 border-b border-white/5 flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30 shadow-inner shadow-cyan-500/10">
          <Target className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Define Context Goal</h3>
          <p className="text-xs text-cyan-400/70 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {contextName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGenerateClick}
          disabled={isGenerating}
          className={`p-2 rounded-lg transition-all ${
            isGenerating
              ? 'bg-purple-500/20 text-purple-400 cursor-wait'
              : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30'
          }`}
          title="Generate with AI"
          data-testid="context-llm-generate-btn"
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </motion.button>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
