'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { DbPersonaExecution } from '@/app/features/Personas/lib/types';
import { ChevronDown, ChevronRight, Workflow } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExecutionDetail } from './ExecutionDetail';
import ActivityDiagramModal from './ActivityDiagramModal';
import type { UseCaseFlow } from '@/lib/personas/testing/flowTypes';

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-secondary/60 text-muted-foreground/60 border border-primary/15',
  running: 'bg-primary/15 text-primary border border-primary/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  failed: 'bg-red-500/15 text-red-400 border border-red-500/20',
  cancelled: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

export function ExecutionList() {
  const selectedPersona = usePersonaStore((state) => state.selectedPersona);
  const isExecuting = usePersonaStore((state) => state.isExecuting);
  const [executions, setExecutions] = useState<DbPersonaExecution[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagramExecution, setDiagramExecution] = useState<DbPersonaExecution | null>(null);
  const prevIsExecutingRef = useRef(isExecuting);

  const diagramFlows: UseCaseFlow[] = useMemo(() => {
    if (!diagramExecution?.execution_flows) return [];
    try { return JSON.parse(diagramExecution.execution_flows); } catch { return []; }
  }, [diagramExecution]);

  const personaId = selectedPersona?.id || '';

  useEffect(() => {
    if (personaId) {
      fetchExecutions();
    }
  }, [personaId]);

  // Re-fetch when execution finishes (isExecuting transitions true → false)
  useEffect(() => {
    if (prevIsExecutingRef.current && !isExecuting && personaId) {
      fetchExecutions();
    }
    prevIsExecutingRef.current = isExecuting;
  }, [isExecuting, personaId]);

  if (!selectedPersona) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground/40">
        No persona selected
      </div>
    );
  }

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/personas/${personaId}/executions`);
      if (response.ok) {
        const data = await response.json();
        setExecutions(data.executions || []);
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleRowClick = (executionId: string) => {
    setExpandedId(expandedId === executionId ? null : executionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-mono text-muted-foreground/50 uppercase tracking-wider">History</h3>

      {executions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground/40 text-sm">
          No execution history yet
        </div>
      ) : (
        <div className="overflow-hidden border border-primary/15 rounded-2xl backdrop-blur-sm">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-primary/5 border-b border-primary/10 text-[11px] font-mono text-muted-foreground/40 uppercase tracking-wider">
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-3">Started</div>
            <div className="col-span-5">Error</div>
          </div>

          {/* Rows */}
          {executions.map((execution) => (
            <div key={execution.id}>
              <motion.div
                onClick={() => handleRowClick(execution.id)}
                className="grid grid-cols-12 gap-4 px-4 py-3 bg-background/30 border-b border-primary/10 cursor-pointer hover:bg-secondary/20 transition-colors"
              >
                <div className="col-span-2 flex items-center gap-2">
                  {expandedId === execution.id ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  )}
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_COLORS[execution.status]}`}>
                    {execution.status}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-foreground/70 font-mono">
                  {formatDuration(execution.duration_ms)}
                </div>
                <div className="col-span-3 text-sm text-foreground/70">
                  {formatTimestamp(execution.started_at)}
                </div>
                <div className="col-span-5 flex items-center gap-2">
                  {execution.execution_flows && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDiagramExecution(execution); }}
                      className="p-1.5 rounded-lg text-violet-400/60 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                      title="View execution flow"
                    >
                      <Workflow className="w-4 h-4" />
                    </button>
                  )}
                  <span className="text-sm text-muted-foreground/40 truncate">
                    {execution.error_message || '-'}
                  </span>
                </div>
              </motion.div>

              {/* Expanded Detail */}
              <AnimatePresence>
                {expandedId === execution.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-primary/10 bg-secondary/20"
                  >
                    <div className="p-4">
                      <ExecutionDetail execution={execution} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      <ActivityDiagramModal
        isOpen={!!diagramExecution}
        onClose={() => setDiagramExecution(null)}
        templateName="Execution Flow"
        titleOverride="Execution Flow"
        subtitleOverride={diagramExecution?.started_at ? new Date(diagramExecution.started_at).toLocaleString() : undefined}
        flows={diagramFlows}
      />
    </div>
  );
}
