'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Loader2,
  Circle,
  AlertCircle,
  FileSearch,
  Code,
  Database,
  Layers,
  Eye,
} from 'lucide-react';

export type ScanPhase =
  | 'file-discovery'
  | 'structure-analysis'
  | 'dependency-scan'
  | 'context-generation'
  | 'visual-scan'
  | 'complete';

type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

interface ScanProgressBreakdownProps {
  currentPhase: ScanPhase;
  phases?: Record<ScanPhase, PhaseStatus>;
  scanType?: 'build' | 'structure' | 'context' | 'vision' | 'full';
  filesProcessed?: number;
  totalFiles?: number;
  className?: string;
}

const phaseConfig: Record<ScanPhase, { icon: React.ElementType; label: string; description: string }> = {
  'file-discovery': {
    icon: FileSearch,
    label: 'File Discovery',
    description: 'Scanning project structure',
  },
  'structure-analysis': {
    icon: Layers,
    label: 'Structure Analysis',
    description: 'Analyzing file relationships',
  },
  'dependency-scan': {
    icon: Database,
    label: 'Dependency Scan',
    description: 'Mapping dependencies',
  },
  'context-generation': {
    icon: Code,
    label: 'Context Generation',
    description: 'Generating code contexts',
  },
  'visual-scan': {
    icon: Eye,
    label: 'Visual Scan',
    description: 'Capturing screenshots',
  },
  'complete': {
    icon: CheckCircle,
    label: 'Complete',
    description: 'Scan finished',
  },
};

const getPhaseOrder = (scanType: string): ScanPhase[] => {
  switch (scanType) {
    case 'build':
      return ['file-discovery', 'structure-analysis', 'complete'];
    case 'structure':
      return ['file-discovery', 'structure-analysis', 'dependency-scan', 'complete'];
    case 'context':
      return ['file-discovery', 'context-generation', 'complete'];
    case 'vision':
      return ['file-discovery', 'visual-scan', 'complete'];
    case 'full':
    default:
      return ['file-discovery', 'structure-analysis', 'dependency-scan', 'context-generation', 'complete'];
  }
};

function getStatusIcon(status: PhaseStatus, Icon: React.ElementType) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:
      return <Circle className="w-4 h-4 text-gray-600" />;
  }
}

export function ScanProgressBreakdown({
  currentPhase,
  phases,
  scanType = 'full',
  filesProcessed,
  totalFiles,
  className = '',
}: ScanProgressBreakdownProps) {
  const orderedPhases = getPhaseOrder(scanType);
  const currentIndex = orderedPhases.indexOf(currentPhase);

  // Generate phase statuses if not provided
  const phaseStatuses = phases || orderedPhases.reduce((acc, phase, index) => {
    if (index < currentIndex) {
      acc[phase] = 'completed';
    } else if (index === currentIndex) {
      acc[phase] = currentPhase === 'complete' ? 'completed' : 'running';
    } else {
      acc[phase] = 'pending';
    }
    return acc;
  }, {} as Record<ScanPhase, PhaseStatus>);

  const progressPercent = ((currentIndex + 1) / orderedPhases.length) * 100;

  return (
    <div className={`bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-200">Scan Progress</h3>
        <span className="text-xs text-gray-400">
          {Math.round(progressPercent)}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Phase list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {orderedPhases.map((phase, index) => {
            const config = phaseConfig[phase];
            const status = phaseStatuses[phase];
            const isActive = status === 'running';

            return (
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : status === 'completed'
                      ? 'bg-green-500/5'
                      : 'bg-gray-800/30'
                }`}
              >
                {getStatusIcon(status, config.icon)}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-blue-300' : status === 'completed' ? 'text-green-300' : 'text-gray-400'
                  }`}>
                    {config.label}
                  </span>
                  {isActive && (
                    <p className="text-xs text-gray-500 truncate">{config.description}</p>
                  )}
                </div>
                {isActive && filesProcessed !== undefined && totalFiles !== undefined && (
                  <span className="text-xs text-blue-400">
                    {filesProcessed}/{totalFiles}
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Compact inline progress indicator
 */
export function ScanProgressInline({
  currentPhase,
  scanType = 'full',
}: {
  currentPhase: ScanPhase;
  scanType?: string;
}) {
  const orderedPhases = getPhaseOrder(scanType);
  const currentIndex = orderedPhases.indexOf(currentPhase);
  const progressPercent = ((currentIndex + 1) / orderedPhases.length) * 100;
  const config = phaseConfig[currentPhase];

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {config.label}
      </span>
    </div>
  );
}

export default ScanProgressBreakdown;
