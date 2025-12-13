'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Package, Loader2, Check } from 'lucide-react';

interface ConvertToPackageButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isProcessing: boolean;
  acceptedIdeasCount: number;
  isComplete?: boolean;
}

export default function ConvertToPackageButton({
  onClick,
  disabled = false,
  isProcessing,
  acceptedIdeasCount,
  isComplete = false,
}: ConvertToPackageButtonProps) {
  const canConvert = acceptedIdeasCount >= 3;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || !canConvert}
      data-testid="convert-to-package-btn"
      className={`flex items-center space-x-2 px-5 py-2 rounded-lg border transition-all duration-300 font-semibold text-sm ${
        isComplete
          ? 'bg-green-500/30 border-green-500/50'
          : isProcessing
          ? 'bg-cyan-500/30 border-cyan-500/50'
          : canConvert
          ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 hover:border-cyan-500/60'
          : 'bg-gray-600/20 border-gray-600/40'
      } ${disabled || !canConvert ? 'opacity-50 cursor-not-allowed' : ''}`}
      whileHover={!disabled && !isProcessing && canConvert ? { scale: 1.05 } : {}}
      whileTap={!disabled && !isProcessing && canConvert ? { scale: 0.95 } : {}}
      title={
        canConvert
          ? `Convert ${acceptedIdeasCount} accepted ideas to RefactorWizard packages using AI`
          : `Need at least 3 accepted ideas to create packages (currently ${acceptedIdeasCount})`
      }
    >
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isComplete ? (
        <Check className="w-4 h-4" />
      ) : (
        <Package className="w-4 h-4" />
      )}
      <span className="text-white">
        {isProcessing
          ? 'Creating Packages...'
          : isComplete
          ? 'Packages Created!'
          : `To Packages (${acceptedIdeasCount})`}
      </span>
    </motion.button>
  );
}
