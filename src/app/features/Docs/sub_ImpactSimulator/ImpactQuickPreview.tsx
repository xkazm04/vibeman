/**
 * ImpactQuickPreview Component
 * Shows a quick impact preview during drag-and-drop in simulation mode
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileCode, AlertTriangle, ArrowRight, Layers } from 'lucide-react';
import type { ImpactSeverity } from '../sub_DocsAnalysis/lib/impactSimulator/types';

interface ImpactQuickPreviewProps {
  contextName: string;
  sourceGroupName: string;
  targetGroupName: string;
  severity: ImpactSeverity;
  fileCount: number;
  hasLayerChange: boolean;
  position?: { x: number; y: number };
}

const severityConfig: Record<
  ImpactSeverity,
  { bg: string; border: string; text: string; label: string }
> = {
  low: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    label: 'Low Impact',
  },
  medium: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    label: 'Medium Impact',
  },
  high: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    label: 'High Impact',
  },
  critical: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
    text: 'text-red-400',
    label: 'Critical Impact',
  },
};

export default function ImpactQuickPreview({
  contextName,
  sourceGroupName,
  targetGroupName,
  severity,
  fileCount,
  hasLayerChange,
  position,
}: ImpactQuickPreviewProps) {
  const config = severityConfig[severity];

  const style = position
    ? {
        position: 'fixed' as const,
        left: position.x + 20,
        top: position.y + 20,
        zIndex: 100,
      }
    : {};

  return (
    <motion.div
      className={`w-64 p-3 rounded-xl ${config.bg} border ${config.border} backdrop-blur-md shadow-xl`}
      style={style}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.15 }}
      data-testid="impact-quick-preview"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
        {hasLayerChange && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Layer Change
          </span>
        )}
      </div>

      {/* Context Name */}
      <div className="text-sm font-medium text-white truncate mb-2">{contextName}</div>

      {/* Move Direction */}
      <div className="flex items-center gap-2 text-xs mb-3">
        <span className="px-2 py-0.5 rounded bg-gray-800/60 text-gray-400 truncate max-w-[80px]">
          {sourceGroupName}
        </span>
        <ArrowRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
        <span
          className={`px-2 py-0.5 rounded ${config.bg} ${config.text} truncate max-w-[80px] border ${config.border}`}
        >
          {targetGroupName}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-700/30">
        <div className="flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs text-gray-400">{fileCount} files</span>
        </div>
        {hasLayerChange && (
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-amber-400">Architecture shift</span>
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="mt-2 text-[10px] text-gray-500 text-center">
        Drop to see full analysis
      </div>
    </motion.div>
  );
}
