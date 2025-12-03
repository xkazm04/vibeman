'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles } from 'lucide-react';
import { useDeveloperMindMeldStore } from '@/stores/developerMindMeldStore';

interface MindMeldToggleProps {
  projectId: string;
  compact?: boolean;
}

export default function MindMeldToggle({ projectId, compact = false }: MindMeldToggleProps) {
  const { isEnabled, updateProfile, progress, isLoading } = useDeveloperMindMeldStore();

  const handleToggle = async () => {
    await updateProfile(projectId, { enabled: !isEnabled });
  };

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200
          ${isEnabled
            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30'
            : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-700/70'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        data-testid="mind-meld-toggle-compact-btn"
        title={isEnabled ? 'AI Learning Active' : 'AI Learning Disabled'}
      >
        <Brain className={`w-3 h-3 ${isEnabled ? 'text-purple-400' : 'text-gray-500'}`} />
        {isEnabled && progress && progress.overallConfidence > 0 && (
          <span className="text-[10px] font-mono">{progress.overallConfidence}%</span>
        )}
      </button>
    );
  }

  return (
    <motion.div
      className={`
        flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200
        ${isEnabled
          ? 'bg-purple-500/10 border border-purple-500/20'
          : 'bg-gray-800/50 border border-gray-700/30'
        }
      `}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2">
        <div className={`
          p-1.5 rounded-md
          ${isEnabled ? 'bg-purple-500/20' : 'bg-gray-700/50'}
        `}>
          <Brain className={`w-4 h-4 ${isEnabled ? 'text-purple-400' : 'text-gray-500'}`} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-200">Mind-Meld</span>
          <span className="text-[10px] text-gray-500">
            {isEnabled ? 'Learning your preferences' : 'Disabled'}
          </span>
        </div>
      </div>

      {isEnabled && progress && (
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs text-purple-400 font-mono">{progress.overallConfidence}%</span>
            <span className="text-[9px] text-gray-500">confidence</span>
          </div>
          {progress.overallConfidence >= 50 && (
            <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
          )}
        </div>
      )}

      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          relative w-10 h-5 rounded-full transition-colors duration-200
          ${isEnabled ? 'bg-purple-500' : 'bg-gray-600'}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        data-testid="mind-meld-toggle-btn"
      >
        <motion.div
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
          animate={{ left: isEnabled ? '22px' : '2px' }}
          transition={{ duration: 0.2 }}
        />
      </button>
    </motion.div>
  );
}
