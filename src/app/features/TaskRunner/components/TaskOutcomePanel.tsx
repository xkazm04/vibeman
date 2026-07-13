'use client';

import { useState, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { retryTask } from '../lib/retryTask';

/**
 * Persisted per-task outcome (migration 237). Mirrors the shape the tasks API
 * attaches as `task.outcome` — files touched, final status, duration, summary.
 */
export interface TaskOutcomeData {
  taskId: string;
  status: string;
  durationMs: number | null;
  changedFiles: string[];
  summary: string | null;
  provider: string | null;
  model: string | null;
  updatedAt: string;
}

interface TaskOutcomePanelProps {
  outcome: TaskOutcomeData;
  /** Identity for the in-place retry (reuses the existing retryTask path). */
  projectPath: string;
  requirementName: string;
  projectId?: string;
  /** Composite task key used by the TaskRunner store for the optimistic update. */
  reqId: string;
}

function formatMs(ms: number | null): string {
  if (ms == null || ms < 0) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

const STATUS_STYLES: Record<string, { Icon: typeof CheckCircle2; text: string; bg: string; border: string; label: string }> = {
  completed: { Icon: CheckCircle2, text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Completed' },
  failed: { Icon: XCircle, text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Failed' },
  'session-limit': { Icon: AlertTriangle, text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Session limit' },
};

/**
 * Post-completion outcome panel for a finished task: what it changed (files),
 * its final status + duration, a persisted summary, and an in-place retry.
 * Rendered inside a completed/failed task's expanded row.
 */
export function TaskOutcomePanel({
  outcome,
  projectPath,
  requirementName,
  projectId,
  reqId,
}: TaskOutcomePanelProps) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retried, setRetried] = useState(false);

  const style = STATUS_STYLES[outcome.status] ?? STATUS_STYLES.failed;
  const StatusIcon = style.Icon;
  const files = outcome.changedFiles ?? [];

  const handleRetry = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (retrying) return;
    setRetrying(true);
    setRetryError(null);
    const result = await retryTask({ projectPath, requirementName, projectId: projectId ?? '' }, reqId);
    setRetrying(false);
    if (result.ok) {
      setRetried(true);
    } else {
      setRetryError(result.error || 'Retry failed');
    }
  }, [retrying, projectPath, requirementName, projectId, reqId]);

  return (
    <div className="mb-2 p-2 rounded border border-gray-700/50 bg-gray-900/40 space-y-2">
      {/* Status + duration + retry */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-micro font-medium ${style.bg} ${style.text} border ${style.border}`}>
            <StatusIcon className="w-3 h-3" />
            {style.label}
          </span>
          <span className="inline-flex items-center gap-1 text-2xs text-gray-500 tabular-nums">
            <Clock className="w-3 h-3" />
            {formatMs(outcome.durationMs)}
          </span>
          {(outcome.provider || outcome.model) && (
            <span className="text-2xs text-gray-600 truncate">
              {[outcome.provider, outcome.model].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
        <button
          onClick={handleRetry}
          disabled={retrying || retried}
          title={retried ? 'Re-queued' : 'Run this requirement again'}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-2xs font-medium rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {retrying ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RotateCw className="w-3 h-3" />
          )}
          {retried ? 'Re-queued' : retrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>

      {retryError && (
        <div className="text-2xs text-red-400">{retryError}</div>
      )}

      {/* Changed files */}
      <div>
        <div className="flex items-center gap-1 text-2xs text-gray-400 font-medium mb-1">
          <FileText className="w-3 h-3" />
          <span>{files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''} changed` : 'Files changed'}</span>
        </div>
        {files.length > 0 ? (
          <div className="max-h-28 overflow-y-auto space-y-0.5">
            {files.map((f) => (
              <div key={f} className="text-micro font-mono text-gray-400 truncate" title={f}>
                {f}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-micro text-gray-600 italic">
            No file changes recorded (git disabled or no commit).
          </div>
        )}
      </div>

      {/* Outcome summary */}
      {outcome.summary && (
        <div>
          <div className="text-2xs text-gray-400 font-medium mb-1">Summary</div>
          <div className="text-micro text-gray-400 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
            {outcome.summary}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskOutcomePanel;
