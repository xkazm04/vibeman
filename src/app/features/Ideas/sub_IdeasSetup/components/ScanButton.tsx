'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scan, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ScanButtonProps {
  onClick: () => void;
  disabled?: boolean;
  scanState: 'idle' | 'scanning' | 'success' | 'error';
  buttonColor: string;
  buttonText: string;
}

export default function ScanButton({
  onClick,
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
  );
}
