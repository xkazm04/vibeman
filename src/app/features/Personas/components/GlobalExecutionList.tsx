'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Workflow } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import type { GlobalExecution, PersonaExecutionStatus } from '@/app/features/Personas/lib/types';
import ActivityDiagramModal from './ActivityDiagramModal';
import type { UseCaseFlow } from '@/lib/personas/testing/flowTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);
  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const statusConfig: Record<PersonaExecutionStatus, { label: string; color: string; bgColor: string; borderColor: string; pulse?: boolean }> = {
  queued: { label: 'Queued', color: 'text-muted-foreground', bgColor: 'bg-muted/30', borderColor: 'border-muted-foreground/20' },
  running: { label: 'Running', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', pulse: true },
  completed: { label: 'Completed', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  failed: { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  cancelled: { label: 'Cancelled', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
};

type FilterStatus = 'all' | 'running' | 'completed' | 'failed';

const filterOptions: Array<{ id: FilterStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GlobalExecutionList() {
  const globalExecutions = usePersonaStore((s) => s.globalExecutions);
  const globalExecutionsTotal = usePersonaStore((s) => s.globalExecutionsTotal);
  const globalExecutionsOffset = usePersonaStore((s) => s.globalExecutionsOffset);
  const fetchGlobalExecutions = usePersonaStore((s) => s.fetchGlobalExecutions);

  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diagramExecution, setDiagramExecution] = useState<GlobalExecution | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const diagramFlows: UseCaseFlow[] = useMemo(() => {
    if (!diagramExecution?.execution_flows) return [];
    try { return JSON.parse(diagramExecution.execution_flows); } catch { return []; }
  }, [diagramExecution]);

  // Initial fetch and filter changes
  useEffect(() => {
    const statusParam = filter === 'all' ? undefined : filter;
    fetchGlobalExecutions(true, statusParam);
  }, [filter, fetchGlobalExecutions]);

  // Poll for running executions every 5s
  const pollRunning = useCallback(() => {
    const hasRunning = globalExecutions.some((e) => e.status === 'running' || e.status === 'queued');
    if (hasRunning) {
      const statusParam = filter === 'all' ? undefined : filter;
      fetchGlobalExecutions(true, statusParam);
    }
  }, [globalExecutions, filter, fetchGlobalExecutions]);

  useEffect(() => {
    pollRef.current = setInterval(pollRunning, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollRunning]);

  const handleLoadMore = () => {
    const statusParam = filter === 'all' ? undefined : filter;
    fetchGlobalExecutions(false, statusParam);
  };

  const hasMore = globalExecutionsOffset < globalExecutionsTotal;

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 pt-4">
      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              filter === opt.id
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-secondary/30 text-muted-foreground/60 border-border/30 hover:text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => {
            const statusParam = filter === 'all' ? undefined : filter;
            fetchGlobalExecutions(true, statusParam);
          }}
          className="ml-auto p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Execution list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {globalExecutions.length === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary/40 border border-border/30 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground/50">No executions found</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {globalExecutions.map((exec) => (
            <ExecutionRow
              key={exec.id}
              execution={exec}
              isExpanded={expandedId === exec.id}
              onToggle={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
              onShowDiagram={() => setDiagramExecution(exec)}
            />
          ))}
        </AnimatePresence>

        {/* Load more */}
        {hasMore && (
          <div className="pt-3 pb-2 text-center">
            <button
              onClick={handleLoadMore}
              className="px-4 py-2 text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground bg-secondary/30 hover:bg-secondary/50 rounded-lg border border-border/30 transition-all"
            >
              Load More ({globalExecutionsTotal - globalExecutionsOffset} remaining)
            </button>
          </div>
        )}
      </div>

      <ActivityDiagramModal
        isOpen={!!diagramExecution}
        onClose={() => setDiagramExecution(null)}
        templateName={diagramExecution?.persona_name || 'Execution'}
        titleOverride={diagramExecution ? `${diagramExecution.persona_name || 'Persona'} Execution` : undefined}
        subtitleOverride={diagramExecution?.started_at ? new Date(diagramExecution.started_at).toLocaleString() : undefined}
        flows={diagramFlows}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Execution Row
// ---------------------------------------------------------------------------

function ExecutionRow({
  execution,
  isExpanded,
  onToggle,
  onShowDiagram,
}: {
  execution: GlobalExecution;
  isExpanded: boolean;
  onToggle: () => void;
  onShowDiagram: () => void;
}) {
  const status = statusConfig[execution.status] || statusConfig.queued;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="rounded-xl border border-border/40 bg-secondary/20 hover:bg-secondary/30 transition-colors overflow-hidden"
    >
      {/* Main row */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
      >
        {/* Expand icon */}
        <div className="text-muted-foreground/40">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>

        {/* Persona icon + name */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm border border-border/30"
            style={{ backgroundColor: (execution.persona_color || '#6366f1') + '15' }}
          >
            {execution.persona_icon || '🤖'}
          </div>
          <span className="text-sm font-medium text-foreground/80 truncate max-w-[100px]">
            {execution.persona_name || 'Unknown'}
          </span>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${status.bgColor} ${status.color} ${status.borderColor}`}>
          {status.pulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
          {status.label}
        </div>

        {/* Duration */}
        <span className="text-xs text-muted-foreground/50 min-w-[60px] text-right font-mono">
          {formatDuration(execution.duration_ms)}
        </span>

        {/* Started */}
        <span className="text-xs text-muted-foreground/40 min-w-[70px] text-right">
          {formatRelativeTime(execution.started_at || execution.created_at)}
        </span>

        {/* Execution flow diagram */}
        {execution.execution_flows && (
          <button
            onClick={(e) => { e.stopPropagation(); onShowDiagram(); }}
            className="p-1.5 rounded-lg text-violet-400/60 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
            title="View execution flow"
          >
            <Workflow className="w-4 h-4" />
          </button>
        )}

        {/* Error (truncated) */}
        {execution.error_message && (
          <span className="flex-1 text-xs text-red-400/70 truncate ml-2">
            {execution.error_message}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/20 space-y-3">
              {/* Output */}
              {execution.output_data && (
                <div>
                  <div className="text-[11px] font-mono text-muted-foreground/50 uppercase mb-1.5">Output</div>
                  <pre className="text-xs text-foreground/70 bg-background/50 border border-border/20 rounded-lg p-3 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono">
                    {typeof execution.output_data === 'string'
                      ? execution.output_data
                      : JSON.stringify(JSON.parse(execution.output_data as string), null, 2)}
                  </pre>
                </div>
              )}

              {/* Error */}
              {execution.error_message && (
                <div>
                  <div className="text-[11px] font-mono text-red-400/50 uppercase mb-1.5">Error</div>
                  <pre className="text-xs text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-lg p-3 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono">
                    {execution.error_message}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground/40">
                <span>ID: <span className="font-mono">{execution.id}</span></span>
                {execution.claude_session_id && (
                  <span>Session: <span className="font-mono">{execution.claude_session_id}</span></span>
                )}
                {execution.started_at && (
                  <span>Started: {new Date(execution.started_at).toLocaleString()}</span>
                )}
                {execution.completed_at && (
                  <span>Completed: {new Date(execution.completed_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
