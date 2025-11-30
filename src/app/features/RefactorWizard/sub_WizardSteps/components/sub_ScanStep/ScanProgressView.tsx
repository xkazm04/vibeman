'use client';

import React from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { Scan, Shield, Code2, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { CyberCard, ProgressBar } from '@/components/ui/wizard';
import { motion } from 'framer-motion';
import { ScanVisualization } from './ScanVisualization';

/**
 * ScanProgressView - In-progress scan UI component.
 *
 * Displays the scan visualization, progress bar, and phase indicators
 * while the analysis is running.
 *
 * @component
 *
 * @example
 * <ScanProgressView
 *   progress={45}
 *   progressMessage="Analyzing patterns..."
 * />
 */
export interface ScanProgressViewProps {
  progress: number;
  progressMessage: string | null;
}

export function ScanProgressView({ progress, progressMessage }: ScanProgressViewProps) {
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  return (
    <motion.div
      key="scanning"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Visual scan animation */}
      <CyberCard variant="glow">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Scan className={`w-5 h-5 ${colors.textDark}`} />
              </motion.div>
              <h3 className="text-lg font-medium text-white">Analyzing Codebase</h3>
            </div>
            <span className={`px-3 py-1 ${colors.bg} border ${colors.borderLight} rounded-full text-xs ${colors.textDark} font-mono`}>
              SCANNING
            </span>
          </div>

          <ScanVisualization progress={progress} />

          <div className="space-y-3">
            <ProgressBar
              progress={progress}
              label=""
              variant="cyan"
              height="lg"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {progressMessage || 'Initializing scan...'}
              </span>
              <span className={`${colors.textDark} opacity-60 font-mono text-xs flex items-center gap-1`}>
                <Clock className="w-3 h-3" />
                Estimated: ~2 min
              </span>
            </div>
          </div>

          {/* What's happening - Phase indicators */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <motion.div
                animate={{ opacity: progress < 30 ? [0.5, 1, 0.5] : 1 }}
                transition={{ duration: 1, repeat: progress < 30 ? Infinity : 0 }}
              >
                {progress >= 30 ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                ) : (
                  <Scan className={`w-3 h-3 ${colors.textDark}`} />
                )}
              </motion.div>
              <span>File scanning</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <motion.div
                animate={{ opacity: progress >= 30 && progress < 80 ? [0.5, 1, 0.5] : progress >= 80 ? 1 : 0.3 }}
                transition={{ duration: 1, repeat: progress >= 30 && progress < 80 ? Infinity : 0 }}
              >
                {progress >= 80 ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                ) : (
                  <Code2 className="w-3 h-3 text-blue-400" />
                )}
              </motion.div>
              <span>Pattern detection</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <motion.div
                animate={{ opacity: progress >= 80 && progress < 95 ? [0.5, 1, 0.5] : progress >= 95 ? 1 : 0.3 }}
                transition={{ duration: 1, repeat: progress >= 80 && progress < 95 ? Infinity : 0 }}
              >
                {progress >= 95 ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                ) : (
                  <Shield className="w-3 h-3 text-purple-400" />
                )}
              </motion.div>
              <span>Security analysis</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <motion.div
                animate={{ opacity: progress >= 95 ? [0.5, 1, 0.5] : 0.3 }}
                transition={{ duration: 1, repeat: progress >= 95 && progress < 100 ? Infinity : 0 }}
              >
                {progress >= 100 ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                ) : (
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                )}
              </motion.div>
              <span>Generating report</span>
            </div>
          </div>
        </div>
      </CyberCard>
    </motion.div>
  );
}

export default ScanProgressView;
