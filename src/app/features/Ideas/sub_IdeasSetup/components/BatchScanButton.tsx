'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Loader2 } from 'lucide-react';

interface BatchScanButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isScanning: boolean;
  contextsCount: number;
}

export default function BatchScanButton({
  onClick,
  disabled = false,
  isScanning,
  contextsCount
}: BatchScanButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 px-5 py-2 rounded-lg border transition-all duration-300 font-semibold text-sm ${
        isScanning
          ? 'bg-purple-500/30 border-purple-500/50'
          : 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 hover:border-purple-500/60'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      whileHover={!disabled && !isScanning ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isScanning ? { scale: 0.95 } : {}}
      title="Generate ideas for all contexts in this project"
    >
      {isScanning ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Layers className="w-4 h-4" />
      )}
      <span className="text-white">
        {isScanning
          ? 'Batch Scanning...'
          : `Batch Ideas (${contextsCount})`}
      </span>
    </motion.button>
  );
}
