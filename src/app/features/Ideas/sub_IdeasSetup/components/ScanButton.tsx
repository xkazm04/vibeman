'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scan, Loader2, CheckCircle, XCircle, Settings } from 'lucide-react';

interface ScanButtonProps {
  onClick: () => void;
  onProviderClick?: () => void;
  disabled?: boolean;
  scanState: 'idle' | 'scanning' | 'success' | 'error';
  buttonColor: string;
  buttonText: string;
}

export default function ScanButton({
  onClick,
  onProviderClick,
  disabled = false,
  scanState,
  buttonColor,
  buttonText
}: ScanButtonProps) {
  const getIcon = () => {
    switch (scanState) {
      case 'scanning':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Scan className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center gap-1">
      {onProviderClick && (
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onProviderClick();
          }}
          disabled={disabled}
          className={`p-2 rounded-lg border transition-all duration-300 ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-gray-800/40 border-gray-700/40'
              : 'bg-gray-800/60 border-gray-700/40 hover:bg-gray-700/60 hover:border-gray-600'
          }`}
          whileHover={!disabled ? { scale: 1.05 } : {}}
          whileTap={!disabled ? { scale: 0.95 } : {}}
          title="Select LLM Provider"
        >
          <Settings className="w-4 h-4 text-gray-400" />
        </motion.button>
      )}
      <motion.button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center space-x-2 px-6 py-2 rounded-lg border transition-all duration-300 font-semibold text-sm ${buttonColor} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        whileHover={!disabled && scanState === 'idle' ? { scale: 1.05 } : {}}
        whileTap={!disabled && scanState === 'idle' ? { scale: 0.95 } : {}}
      >
        {getIcon()}
        <span className="text-white">{buttonText}</span>
      </motion.button>
    </div>
  );
}
