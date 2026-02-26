/**
 * Autonomous Agent Panel
 * Displays agent mode status with goal progress, step timeline, and controls.
 * Shown as a tab in the Commander layout.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  Zap,
  ChevronDown,
  ChevronUp,
  Send,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface AgentStep {
  id: string;
  orderIndex: number;
  title: string;
  description: string;
  toolName: string | null;
  status: string;
  result: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface AgentGoal {
  id: string;
  objective: string;
  status: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  resultSummary: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface AgentHistory {
  id: string;
  objective: string;
  status: string;
  completedSteps: number;
  totalSteps: number;
  resultSummary: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface AgentData {
  active: boolean;
  goal: AgentGoal | null;
  steps: AgentStep[];
  history: AgentHistory[];
}

export default function AutonomousAgentPanel() {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const [data, setData] = useState<AgentData | null>(null);
  const [objective, setObjective] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!activeProject?.id) return;
    try {
      const res = await fetch(`/api/annette/autonomous?projectId=${activeProject.id}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch { /* ignore */ }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleAction = useCallback(async (action: 'start' | 'pause' | 'resume' | 'cancel') => {
    if (!activeProject?.id) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const body: Record<string, string | undefined> = {
        projectId: activeProject.id,
        projectPath: activeProject.path,
        action,
      };
      if (action === 'start') body.objective = objective;

      const res = await fetch('/api/annette/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Action failed');
      } else {
        if (action === 'start') setObjective('');
        await fetchStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [activeProject, objective, fetchStatus]);

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <p className="text-sm">Select a project first.</p>
      </div>
    );
  }

  const goal = data?.goal;
  const steps = data?.steps || [];
  const isRunning = data?.active || false;
  const isPaused = goal?.status === 'paused';
  const isIdle = !goal || ['completed', 'failed', 'cancelled'].includes(goal.status);
  const progress = goal && goal.totalSteps > 0
    ? Math.round((goal.completedSteps / goal.totalSteps) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Goal Input (when idle) */}
      {isIdle && (
        <div className="p-4 border-b border-slate-800/50">
          <label className="text-xs font-medium text-slate-400 mb-2 block">New Autonomous Goal</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && objective.trim()) handleAction('start');
              }}
              placeholder="e.g. Improve test coverage for the Auth module"
              className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
            <button
              onClick={() => handleAction('start')}
              disabled={!objective.trim() || isSubmitting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Start
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {error}
            </p>
          )}
        </div>
      )}

      {/* Active Goal Status */}
      {goal && !isIdle && (
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={goal.status} />
                <span className="text-xs text-slate-500">
                  {goal.completedSteps}/{goal.totalSteps} steps
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-snug">{goal.objective}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
              {isRunning && (
                <button
                  onClick={() => handleAction('pause')}
                  className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                  title="Pause"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
              {isPaused && (
                <button
                  onClick={() => handleAction('resume')}
                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  title="Resume"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleAction('cancel')}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                title="Cancel"
              >
                <Square className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {goal.failedSteps > 0 && (
            <p className="text-xs text-red-400/70 mt-1">{goal.failedSteps} step(s) failed</p>
          )}
        </div>
      )}

      {/* Completed Goal Summary */}
      {goal && isIdle && goal.status !== 'pending' && (
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={goal.status} />
            <span className="text-xs text-slate-500">{goal.objective.substring(0, 60)}</span>
          </div>
          {goal.resultSummary && (
            <p className="text-xs text-slate-300 leading-relaxed">{goal.resultSummary}</p>
          )}
          {goal.errorMessage && (
            <p className="text-xs text-red-400 mt-1">{goal.errorMessage}</p>
          )}
        </div>
      )}

      {/* Steps Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {steps.length > 0 && (
          <h4 className="text-xs font-medium text-slate-400 mb-2">Execution Steps</h4>
        )}

        <AnimatePresence initial={false}>
          {steps.map((step) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <button
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                className="w-full flex items-start gap-2.5 py-1.5 text-left"
              >
                <StepIcon status={step.status} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${
                    step.status === 'completed' ? 'text-slate-400' :
                    step.status === 'running' ? 'text-cyan-300' :
                    step.status === 'failed' ? 'text-red-400' :
                    'text-slate-500'
                  }`}>
                    {step.title}
                  </p>
                  {step.toolName && (
                    <span className="text-[10px] text-slate-600">{step.toolName}</span>
                  )}
                </div>
                {(step.result || step.errorMessage) && (
                  expandedStep === step.id
                    ? <ChevronUp className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
                    : <ChevronDown className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
                )}
              </button>

              <AnimatePresence>
                {expandedStep === step.id && (step.result || step.errorMessage) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden ml-6"
                  >
                    <pre className="text-[10px] text-slate-500 bg-slate-800/30 rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                      {step.errorMessage || step.result}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {steps.length === 0 && isIdle && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Zap className="w-8 h-8 text-slate-700 mb-3" />
            <p className="text-xs text-slate-500">Autonomous Agent Mode</p>
            <p className="text-xs text-slate-600 mt-1 max-w-[200px]">
              Set a high-level objective and let Annette work autonomously to achieve it.
            </p>
          </div>
        )}
      </div>

      {/* History toggle */}
      {data?.history && data.history.length > 1 && (
        <div className="border-t border-slate-800/50">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            <span>History ({data.history.length})</span>
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-2 max-h-40 overflow-y-auto">
                  {data.history.slice(1).map((h) => (
                    <div key={h.id} className="flex items-start gap-2 py-1">
                      <StatusBadge status={h.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 truncate">{h.objective}</p>
                        <p className="text-[10px] text-slate-600">
                          {h.completedSteps}/{h.totalSteps} steps
                          {h.completedAt ? ` · ${new Date(h.completedAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: 'text-slate-500 bg-slate-500/10', label: 'Pending' },
    decomposing: { color: 'text-purple-400 bg-purple-500/10', label: 'Planning' },
    running: { color: 'text-cyan-400 bg-cyan-500/10', label: 'Running' },
    paused: { color: 'text-amber-400 bg-amber-500/10', label: 'Paused' },
    completed: { color: 'text-emerald-400 bg-emerald-500/10', label: 'Done' },
    failed: { color: 'text-red-400 bg-red-500/10', label: 'Failed' },
    cancelled: { color: 'text-slate-400 bg-slate-500/10', label: 'Cancelled' },
  };
  const c = config[status] || config.pending;

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}

function StepIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />;
    case 'running':
      return <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin flex-shrink-0 mt-0.5" />;
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />;
    case 'skipped':
      return <RotateCcw className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />;
    default:
      return <Circle className="w-3.5 h-3.5 text-slate-700 flex-shrink-0 mt-0.5" />;
  }
}
