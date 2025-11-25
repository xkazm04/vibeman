'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Camera, TestTube, Layers, FileCheck, FileEdit } from 'lucide-react';
import IlluminatedButton from '@/app/features/Onboarding/sub_Blueprint/components/IlluminatedButton';

export interface ContextDependentScansProps {
  selectedContextId: string | null;
  selectedScanId: string | null;
  onScanSelect: (groupId: string, scanId: string) => void;
  getDaysAgo?: (techniqueId: string) => number | null;
  getScanStatus?: (techniqueId: string) => {
    isRunning: boolean;
    progress: number;
    hasError: boolean;
  };
  isRecommended?: (techniqueId: string) => boolean;
  className?: string;
}

/**
 * Right sidebar panel for context-dependent scans
 * Shows scans that require a context to be selected (Selectors, Photo, Test)
 */
export default function ContextDependentScans({
  selectedContextId,
  selectedScanId,
  onScanSelect,
  getDaysAgo,
  getScanStatus,
  isRecommended,
  className = '',
}: ContextDependentScansProps) {
  // Context-dependent scans configuration
  const contextScans = [
    {
      id: 'selectors',
      groupId: 'nextjs-ui',
      label: 'Selectors',
      icon: Target,
      color: 'indigo' as const,
    },
    {
      id: 'photo',
      groupId: 'nextjs-ui',
      label: 'Photo',
      icon: Camera,
      color: 'pink' as const,
    },
    {
      id: 'test',
      groupId: 'quality',
      label: 'Test',
      icon: TestTube,
      color: 'amber' as const,
    },
    {
      id: 'testDesign',
      groupId: 'quality',
      label: 'Test Design',
      icon: FileEdit,
      color: 'amber' as const,
    },
    {
      id: 'contextreview',
      groupId: 'quality',
      label: 'Context Review',
      icon: FileCheck,
      color: 'purple' as const,
    },
  ];

  if (!selectedContextId) {
    return (
      <div
        className={`h-full flex flex-col items-center justify-center ${className}`}
        data-testid="context-scans-empty"
      >
        <Layers className="w-8 h-8 text-gray-600 mb-2" />
        <p className="text-xs text-gray-500 font-mono text-center px-4">
          Select a context to enable scans
        </p>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col ${className}`}
      data-testid="context-dependent-scans"
    >
      {/* Header */}
      <div className="px-3 pt-3 mb-3">
        <h3 className="text-xs font-mono text-cyan-300 uppercase tracking-wider">
          Context Scans
        </h3>
        <p className="text-[10px] text-gray-500 font-mono mt-1">
          Scans for selected context
        </p>
      </div>

      {/* Scan rows - thin text rows with icon buttons */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col">
          <AnimatePresence mode="popLayout">
            {contextScans.map((scan, index) => {
              const status = getScanStatus?.(scan.id);
              const daysAgo = getDaysAgo?.(scan.id);
              const recommended = isRecommended?.(scan.id) ?? false;
              const isSelected = scan.id === selectedScanId;
              const isRunning = status?.isRunning ?? false;
              const hasError = status?.hasError ?? false;

              const Icon = scan.icon;

              return (
                <motion.button
                  key={scan.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onScanSelect(scan.groupId, scan.id)}
                  className={`
                    relative flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/50
                    transition-all duration-200 hover:bg-gray-800/30
                    ${isSelected ? 'bg-cyan-500/10 border-l-2 border-l-cyan-400' : ''}
                    ${hasError ? 'bg-red-500/5' : ''}
                    ${isRunning ? 'bg-green-500/5' : ''}
                  `}
                  data-testid={`context-scan-${scan.id}`}
                >
                  {/* Icon button on left */}
                  <div
                    className={`
                      flex items-center justify-center w-7 h-7 rounded-md border
                      transition-all duration-200
                      ${isSelected
                        ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-400'
                        : hasError
                          ? 'border-red-400/60 bg-red-500/20 text-red-400'
                          : isRunning
                            ? 'border-green-400/60 bg-green-500/20 text-green-400'
                            : 'border-gray-600/30 bg-gray-800/20 text-gray-400'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Text label */}
                  <div className="flex-1 flex items-center justify-between">
                    <span
                      className={`
                        text-sm font-mono transition-colors
                        ${isSelected
                          ? 'text-cyan-300 font-semibold'
                          : hasError
                            ? 'text-red-400'
                            : isRunning
                              ? 'text-green-400'
                              : 'text-gray-400'
                        }
                      `}
                    >
                      {scan.label}
                    </span>

                    {/* Days ago badge */}
                    {typeof daysAgo === 'number' && (
                      <span
                        className={`
                          text-xs font-mono px-1.5 py-0.5 rounded
                          ${daysAgo > 7
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-green-500/20 text-green-400'
                          }
                        `}
                      >
                        {daysAgo}d
                      </span>
                    )}
                  </div>

                  {/* Recommended indicator - Static version (removed pulse) */}
                  {recommended && !isSelected && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                  )}

                  {/* Running indicator - Static version (removed pulse) */}
                  {isRunning && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-400 shadow-lg shadow-green-400/50" />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
