'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
import { ScanResult } from '../../lib/types';

interface ScanResultBannerProps {
  result: ScanResult;
  onDismiss: () => void;
}

export default function ScanResultBanner({
  result,
  onDismiss,
}: ScanResultBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-2 py-1.5 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400 font-mono"
    >
      <CheckCircle className="w-3 h-3 flex-shrink-0" />
      <span className="flex-1">
        Found {result.totalFound} testid{result.totalFound !== 1 ? 's' : ''}.
        {result.newSelectors > 0 && (
          <> Added {result.newSelectors} new.</>
        )}
        {result.newSelectors === 0 && result.totalFound > 0 && (
          <> All already in database.</>
        )}
      </span>
      <button
        onClick={onDismiss}
        className="p-0.5 hover:bg-green-500/20 rounded"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
