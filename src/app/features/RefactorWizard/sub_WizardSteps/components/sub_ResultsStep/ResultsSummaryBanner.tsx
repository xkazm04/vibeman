'use client';

import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ResultsSummaryBannerProps {
  packageCount: number;
  isDirectMode: boolean;
}

/**
 * ResultsSummaryBanner - Displays the success banner with checkmark and summary text.
 * 
 * Shows a celebratory banner indicating that strategic requirements have been generated,
 * with information about the number of packages created.
 */
export function ResultsSummaryBanner({ packageCount, isDirectMode }: ResultsSummaryBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-6"
      data-testid="results-success-banner"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
            <CheckCircle className="w-7 h-7 text-green-400" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-medium text-green-300 mb-2">
            Strategic Requirements Generated!
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Your refactoring has been organized into <strong className="text-white">{packageCount} strategic package{packageCount !== 1 ? 's' : ''}</strong> in <code className="px-1.5 py-0.5 bg-black/30 rounded text-xs font-mono">.claude/commands/</code>
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Each package includes full project context from CLAUDE.md and dependency information for safe, systematic execution.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
