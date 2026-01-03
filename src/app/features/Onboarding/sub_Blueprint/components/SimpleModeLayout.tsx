'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Eye,
  FolderTree,
  Wrench,
  Camera,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { StepperConfig } from '../lib/stepperConfig';

interface SimpleModeLayoutProps {
  config: StepperConfig | null;
  selectedScanId: string | null;
  onScanSelect: (groupId: string, techniqueId: string) => void;
  onSwitchToAdvanced: () => void;
  getDaysAgo?: (techniqueId: string) => number | null;
  getScanStatus?: (techniqueId: string) => {
    isRunning: boolean;
    progress: number;
    hasError: boolean;
  };
  isRecommended?: (techniqueId: string) => boolean;
  className?: string;
}

// Scan type info for the simple mode cards
const SCAN_INFO: Record<string, {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  vision: {
    icon: Eye,
    title: 'Vision Scan',
    description: 'Analyze project architecture and patterns',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  contexts: {
    icon: Layers,
    title: 'Context Scan',
    description: 'Generate code contexts for AI understanding',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  structure: {
    icon: FolderTree,
    title: 'Structure Scan',
    description: 'Map file dependencies and imports',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  build: {
    icon: Wrench,
    title: 'Build Scan',
    description: 'Check build health and lint issues',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  photo: {
    icon: Camera,
    title: 'Photo Scan',
    description: 'Capture UI screenshots for context',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
};

/**
 * SimpleModeLayout - A simplified Blueprint view for beginners
 *
 * Shows just the essential scans with clear descriptions and status.
 * Users can switch to Advanced mode for full control.
 */
export default function SimpleModeLayout({
  config,
  selectedScanId,
  onScanSelect,
  onSwitchToAdvanced,
  getDaysAgo,
  getScanStatus,
  isRecommended,
  className = '',
}: SimpleModeLayoutProps) {
  // Get available scans
  const availableScans = useMemo(() => {
    if (!config) return [];
    return config.groups
      .filter(group => group.enabled)
      .flatMap(group =>
        group.techniques
          .filter(technique => !technique.contextNeeded)
          .map(technique => ({
            ...technique,
            groupId: group.id,
            info: SCAN_INFO[technique.id] || {
              icon: Scan,
              title: technique.label,
              description: 'Run this scan',
              color: 'text-gray-400',
              bgColor: 'bg-gray-500/10',
              borderColor: 'border-gray-500/30',
            },
          }))
      );
  }, [config]);

  // Calculate overall status
  const overallStatus = useMemo(() => {
    let completed = 0;
    let running = 0;
    let hasErrors = false;

    availableScans.forEach(scan => {
      const status = getScanStatus?.(scan.id);
      const daysAgo = getDaysAgo?.(scan.id);
      if (status?.isRunning) running++;
      else if (status?.hasError) hasErrors = true;
      else if (daysAgo !== null && daysAgo !== undefined && daysAgo < 7) completed++;
    });

    return { completed, running, hasErrors, total: availableScans.length };
  }, [availableScans, getScanStatus, getDaysAgo]);

  if (!config) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen bg-gray-950 ${className}`}
    >
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
                <Scan className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Blueprint Scanner</h1>
                <p className="text-sm text-gray-400">
                  Analyze your project structure
                </p>
              </div>
            </div>

            <button
              onClick={onSwitchToAdvanced}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700
                         text-gray-300 rounded-lg transition-colors text-sm"
            >
              Advanced Mode
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Summary */}
          <div className="mt-6 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-gray-400">
                {overallStatus.completed}/{overallStatus.total} complete
              </span>
            </div>
            {overallStatus.running > 0 && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                <span className="text-sm text-cyan-400">
                  {overallStatus.running} running
                </span>
              </div>
            )}
            {overallStatus.hasErrors && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-sm text-red-400">Has errors</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Recommended Flow */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-medium text-gray-300">Recommended Flow</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded">1. Vision</span>
            <ArrowRight className="w-3 h-3" />
            <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded">2. Structure</span>
            <ArrowRight className="w-3 h-3" />
            <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded">3. Contexts</span>
            <ArrowRight className="w-3 h-3" />
            <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded">4. Build</span>
          </div>
        </div>

        {/* Scan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableScans.map((scan, index) => {
            const status = getScanStatus?.(scan.id);
            const daysAgo = getDaysAgo?.(scan.id);
            const recommended = isRecommended?.(scan.id) ?? false;
            const Info = scan.info;
            const Icon = Info.icon;

            const isComplete = daysAgo !== null && daysAgo !== undefined && daysAgo < 7;
            const isRunning = status?.isRunning ?? false;
            const hasError = status?.hasError ?? false;

            return (
              <motion.button
                key={scan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onScanSelect(scan.groupId, scan.id)}
                disabled={isRunning}
                className={`
                  relative p-5 rounded-xl border text-left transition-all
                  ${selectedScanId === scan.id
                    ? `${Info.bgColor} ${Info.borderColor} ring-2 ring-offset-2 ring-offset-gray-950 ${Info.borderColor.replace('border-', 'ring-')}`
                    : `bg-gray-900/50 border-gray-800 hover:bg-gray-800/50 hover:border-gray-700`
                  }
                  ${isRunning ? 'cursor-wait' : ''}
                  disabled:opacity-70
                `}
              >
                {/* Recommended Badge */}
                {recommended && !isComplete && (
                  <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-amber-950 text-[10px] font-bold rounded-full">
                    NEXT
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-lg ${Info.bgColor}`}>
                    <Icon className={`w-5 h-5 ${Info.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{Info.title}</h3>
                      {/* Status Badge */}
                      {isRunning ? (
                        <span className="flex items-center gap-1 text-xs text-cyan-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {status?.progress ? `${Math.round(status.progress * 100)}%` : 'Running'}
                        </span>
                      ) : hasError ? (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          Error
                        </span>
                      ) : isComplete ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          Not run
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{Info.description}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {isRunning && status?.progress !== undefined && (
                  <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${Info.bgColor.replace('/10', '/50')}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${status.progress * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Empty State */}
        {availableScans.length === 0 && (
          <div className="text-center py-12">
            <Scan className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Scans Available</h3>
            <p className="text-sm text-gray-500">
              Select a project to see available scans
            </p>
          </div>
        )}

        {/* Hint */}
        <div className="mt-8 p-4 bg-gray-900/30 border border-gray-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-300">
                <span className="font-medium">Tip:</span> Run scans in order for best results.
                Vision scan identifies architecture, then Structure maps dependencies,
                and Contexts creates AI-readable summaries.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Compact scan status for use in headers or sidebars
 */
export function ScanStatusCompact({
  scanId,
  getScanStatus,
  getDaysAgo,
  className = '',
}: {
  scanId: string;
  getScanStatus?: (id: string) => { isRunning: boolean; progress: number; hasError: boolean };
  getDaysAgo?: (id: string) => number | null;
  className?: string;
}) {
  const status = getScanStatus?.(scanId);
  const daysAgo = getDaysAgo?.(scanId);
  const isComplete = daysAgo !== null && daysAgo !== undefined && daysAgo < 7;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {status?.isRunning ? (
        <>
          <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
          <span className="text-xs text-cyan-400">
            {status.progress ? `${Math.round(status.progress * 100)}%` : '...'}
          </span>
        </>
      ) : status?.hasError ? (
        <>
          <AlertCircle className="w-3 h-3 text-red-400" />
          <span className="text-xs text-red-400">Error</span>
        </>
      ) : isComplete ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span className="text-xs text-emerald-400">Done</span>
        </>
      ) : (
        <>
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">Pending</span>
        </>
      )}
    </div>
  );
}
