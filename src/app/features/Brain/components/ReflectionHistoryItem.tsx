'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Lightbulb,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { LearningInsight } from '@/app/db/models/brain.types';

export interface ReflectionHistoryEntry {
  id: string;
  status: string;
  triggerType: string;
  directionsAnalyzed: number;
  outcomesAnalyzed: number;
  signalsAnalyzed: number;
  insightCount: number;
  insights: LearningInsight[];
  sectionsUpdated: string[];
  durationMs: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface Props {
  entry: ReflectionHistoryEntry;
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = Date.now();
  const diffDays = Math.floor((now - date.getTime()) / 86400000);
  if (diffDays === 0) return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-400" />;
  if (status === 'running') return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
  return <Clock className="w-3.5 h-3.5 text-zinc-500" />;
}

export default function ReflectionHistoryItem({ entry }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-zinc-800/50 rounded-lg overflow-hidden">
      {/* Header row - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} reflection details`}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/30 transition-colors text-left focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        )}

        <StatusIcon status={entry.status} />

        <span className="text-sm text-zinc-300 flex-1 truncate">
          {formatDate(entry.completedAt || entry.startedAt || entry.createdAt)}
        </span>

        {/* Compact stats */}
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1" title="Directions analyzed">
            <FileText className="w-3 h-3" />
            {entry.directionsAnalyzed}
          </span>
          <span className="flex items-center gap-1" title="Insights generated">
            <Lightbulb className="w-3 h-3" />
            {entry.insightCount}
          </span>
          <span className="flex items-center gap-1" title="Duration">
            <Clock className="w-3 h-3" />
            {formatDuration(entry.durationMs)}
          </span>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
        <div className="px-3 pb-3 pt-1 border-t border-zinc-800/30 space-y-3">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-zinc-800/30 rounded px-2 py-1.5">
              <div className="text-zinc-500">Directions</div>
              <div className="text-zinc-200 font-medium">{entry.directionsAnalyzed}</div>
            </div>
            <div className="bg-zinc-800/30 rounded px-2 py-1.5">
              <div className="text-zinc-500">Outcomes</div>
              <div className="text-zinc-200 font-medium">{entry.outcomesAnalyzed}</div>
            </div>
            <div className="bg-zinc-800/30 rounded px-2 py-1.5">
              <div className="text-zinc-500">Signals</div>
              <div className="text-zinc-200 font-medium">{entry.signalsAnalyzed}</div>
            </div>
          </div>

          {/* Trigger type */}
          <div className="text-xs text-zinc-500">
            Trigger: <span className="text-zinc-400">{entry.triggerType}</span>
          </div>

          {/* Sections updated */}
          {entry.sectionsUpdated.length > 0 && (
            <div className="text-xs">
              <div className="text-zinc-500 mb-1">Sections updated:</div>
              <div className="flex flex-wrap gap-1">
                {entry.sectionsUpdated.map((section) => (
                  <span key={section} className="px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded text-xs">
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Insights list */}
          {entry.insights.length > 0 && (
            <div className="text-xs">
              <div className="text-zinc-500 mb-1">Insights generated:</div>
              <div className="space-y-1.5">
                {entry.insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 pl-1">
                    <Lightbulb className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-zinc-300">{insight.title}</div>
                      <div className="text-zinc-500 mt-0.5">{insight.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {entry.errorMessage && (
            <div className="text-xs text-red-400 bg-red-500/5 rounded px-2 py-1.5">
              {entry.errorMessage}
            </div>
          )}
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
