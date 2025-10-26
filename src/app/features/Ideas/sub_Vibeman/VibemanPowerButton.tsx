'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Power, Loader2 } from 'lucide-react';

interface VibemanPowerButtonProps {
  isRunning: boolean;
  isProcessing: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function VibemanPowerButton({
  isRunning,
  isProcessing,
  onClick,
  disabled = false,
}: VibemanPowerButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.1 }}
      whileTap={{ scale: disabled ? 1 : 0.9 }}
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`relative p-2.5 rounded-lg transition-all ${
        disabled || isProcessing
          ? 'bg-gray-700/40 text-gray-500 cursor-not-allowed'
          : isRunning
          ? 'bg-red-900/60 hover:bg-red-900/80 text-red-400 border border-red-700/40'
          : 'bg-red-900/40 hover:bg-red-900/60 text-red-500 border border-red-800/40'
      }`}
      title={isRunning ? 'Stop automated implementation' : 'Start automated implementation'}
    >
      {/* Pulsing effect when running */}
      {isRunning && !isProcessing && (
        <motion.div
          className="absolute inset-0 bg-red-500 rounded-lg"
          animate={{
            opacity: [0, 0.3, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Icon */}
      <div className="relative z-10">
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Power className="w-5 h-5" />
        )}
      </div>
    </motion.button>
  );
}
