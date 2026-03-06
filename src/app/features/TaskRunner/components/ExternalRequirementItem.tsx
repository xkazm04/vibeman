'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  X,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { ExternalRequirement, ExternalProcessingState } from '@/lib/supabase/external-types';

interface ExternalRequirementItemProps {
  requirement: ExternalRequirement;
  processingState?: ExternalProcessingState;
  onExecute: (id: string) => void;
  onDiscard: (id: string) => void;
  onRetry: (id: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-300 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  open: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: ExternalLink },
  claimed: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Loader2 },
  in_progress: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Loader2 },
  implemented: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle2 },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertTriangle },
  discarded: { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: X },
};

function getPriorityLevel(priority: number): string {
  if (priority >= 8) return 'high';
  if (priority >= 5) return 'medium';
  return 'low';
}

const ExternalRequirementItem = React.memo(function ExternalRequirementItem({
  requirement,
  processingState,
  onExecute,
  onDiscard,
  onRetry,
}: ExternalRequirementItemProps) {
  const priorityLevel = getPriorityLevel(requirement.priority);
  const priorityColor = PRIORITY_COLORS[priorityLevel];
  const statusStyle = STATUS_STYLES[requirement.status] || STATUS_STYLES.open;
  const StatusIcon = statusStyle.icon;

  const isProcessing =
    processingState?.status === 'analyzing' ||
    processingState?.status === 'executing' ||
    processingState?.status === 'cleanup';
  const isBusy = isProcessing || requirement.status === 'in_progress' || requirement.status === 'claimed';
  const isFailed = requirement.status === 'failed' || processingState?.status === 'failed';

  return (
    <motion.div
      className={`group relative p-2.5 rounded-lg border transition-all duration-200 ${
        isBusy
          ? 'border-teal-500/30 bg-teal-500/5'
          : isFailed
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-gray-700/40 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.2 }}
      data-testid={`ext-req-item-${requirement.id}`}
    >
      {/* Top row: priority + title */}
      <div className="flex items-start gap-2 mb-1.5">
        <span
          className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${priorityColor}`}
          title={`Priority: ${requirement.priority}/10`}
        >
          P{requirement.priority}
        </span>
        <span
          className="text-xs text-gray-200 font-medium leading-tight line-clamp-2"
          title={requirement.title}
        >
          {requirement.title}
        </span>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1.5">
        <span className="truncate max-w-[80px]" title={requirement.source_app}>
          {requirement.source_app}
        </span>
        <span className="text-gray-700">|</span>
        <span>{requirement.category}</span>
        {requirement.impact != null && (
          <>
            <span className="text-gray-700">|</span>
            <span title="Impact">I:{requirement.impact}</span>
          </>
        )}
      </div>

      {/* Status badge + processing state */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] ${statusStyle.bg} ${statusStyle.text}`}>
            <StatusIcon className={`w-2.5 h-2.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>
              {isProcessing ? processingState?.status : requirement.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isFailed && (
            <button
              onClick={() => onRetry(requirement.id)}
              className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition-colors"
              title="Retry"
              data-testid={`ext-req-retry-${requirement.id}`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          {!isBusy && requirement.status === 'open' && (
            <button
              onClick={() => onExecute(requirement.id)}
              className="p-1 rounded hover:bg-teal-500/20 text-teal-400 transition-colors"
              title="Execute"
              data-testid={`ext-req-execute-${requirement.id}`}
            >
              <Play className="w-3 h-3" />
            </button>
          )}
          {!isBusy && (
            <button
              onClick={() => onDiscard(requirement.id)}
              className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
              title="Discard"
              data-testid={`ext-req-discard-${requirement.id}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {isFailed && (requirement.error_message || processingState?.error) && (
        <div className="mt-1.5 text-[10px] text-red-400/80 leading-tight line-clamp-2">
          {processingState?.error || requirement.error_message}
        </div>
      )}

      {/* Processing shimmer */}
      {isBusy && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-teal-400/50 to-transparent animate-[shimmer-slide_1.5s_ease-in-out_infinite]" />
        </div>
      )}
    </motion.div>
  );
});

export default ExternalRequirementItem;
