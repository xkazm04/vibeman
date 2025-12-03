/**
 * SimulationModeToggle Component
 * Toggle button to enable/disable simulation mode in the Architecture Explorer
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Zap } from 'lucide-react';

interface SimulationModeToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  isAnalyzing?: boolean;
}

export default function SimulationModeToggle({
  isEnabled,
  onToggle,
  isAnalyzing = false,
}: SimulationModeToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
        isEnabled
          ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
          : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-gray-300 hover:border-gray-600/50'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid="simulation-mode-toggle"
    >
      {/* Glow effect when enabled */}
      {isEnabled && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-violet-500/10"
          animate={{
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      <div className="relative flex items-center gap-2">
        <FlaskConical className={`w-4 h-4 ${isEnabled ? 'text-violet-400' : ''}`} />
        <span className="text-xs font-medium">
          {isEnabled ? 'Simulation Mode' : 'Simulate'}
        </span>

        {/* Analyzing indicator */}
        {isAnalyzing && (
          <motion.div
            className="flex items-center gap-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-amber-400">Analyzing...</span>
          </motion.div>
        )}

        {/* Toggle indicator */}
        <div
          className={`relative w-8 h-4 rounded-full transition-colors ${
            isEnabled ? 'bg-violet-500/40' : 'bg-gray-700/60'
          }`}
        >
          <motion.div
            className={`absolute top-0.5 w-3 h-3 rounded-full ${
              isEnabled ? 'bg-violet-400' : 'bg-gray-500'
            }`}
            animate={{
              left: isEnabled ? '16px' : '2px',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      </div>
    </motion.button>
  );
}
