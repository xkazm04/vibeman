/**
 * PipelineControls — Toolbar with left-aligned actions, center triage prompt, right-aligned info
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Square, RotateCcw, Trash2, Activity,
  Settings2, TerminalSquare, AlertTriangle, CheckCircle,
  XCircle, ShieldAlert, X, FileText, MessageSquare,
} from 'lucide-react';
import { useConductorStore } from '../lib/conductorStore';
import type { PipelineStatus, TriageCheckpointData } from '../lib/types';
import IntentRefinementModal from './IntentRefinementModal';
import { UniversalModal } from '@/components/UniversalModal';

const TERMINAL_STATUSES: PipelineStatus[] = ['completed', 'failed', 'interrupted'];

interface PipelineControlsProps {
  projectId: string | null;
  onStart: () => void;
  onOpenSettings?: () => void;
  onViewReport?: () => void;
}

const STATUS_BADGES: Record<PipelineStatus, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'bg-gray-700 text-gray-300' },
  running: { label: 'Running', className: 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40' },
  paused: { label: 'Paused', className: 'bg-amber-600/20 text-amber-400 border border-amber-600/40' },
  stopping: { label: 'Stopping...', className: 'bg-red-600/20 text-red-400 border border-red-600/40' },
  completed: { label: 'Completed', className: 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/40' },
  failed: { label: 'Failed', className: 'bg-red-600/20 text-red-400 border border-red-600/40' },
  interrupted: { label: 'Interrupted', className: 'bg-amber-600/20 text-amber-400 border border-amber-600/40' },
  queued: { label: 'Queued', className: 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/40' },
};

// ============================================================================
// Triage Modal
// ============================================================================

interface TriageModalProps {
  isOpen: boolean;
  triageData?: TriageCheckpointData;
  runId: string;
  onClose: () => void;
}

function TriageModal({ isOpen, triageData, runId, onClose }: TriageModalProps) {
  const items = triageData?.items ?? [];
  const [decisions, setDecisions] = useState<Record<string, 'approve' | 'reject'>>({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize decisions when modal opens or triage data changes
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const init: Record<string, 'approve' | 'reject'> = {};
    for (const item of items) {
      init[item.id] = 'approve';
    }
    setDecisions(init);
    setSubmitting(false);
  }, [isOpen, triageData]);

  const toggleDecision = (id: string) => {
    setDecisions((prev) => ({
      ...prev,
      [id]: prev[id] === 'approve' ? 'reject' : 'approve',
    }));
  };

  const approveAll = () => {
    const all: Record<string, 'approve' | 'reject'> = {};
    for (const item of items) all[item.id] = 'approve';
    setDecisions(all);
  };

  const rejectAll = () => {
    const all: Record<string, 'approve' | 'reject'> = {};
    for (const item of items) all[item.id] = 'reject';
    setDecisions(all);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = Object.entries(decisions).map(([itemId, action]) => ({ itemId, action }));
      const res = await fetch('/api/conductor/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, decisions: payload }),
      });
      if (res.ok) {
        useConductorStore.getState().resumeRun();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const approvedCount = Object.values(decisions).filter((d) => d === 'approve').length;

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Triage Review"
      subtitle={`${items.length} items awaiting your decision`}
      icon={ShieldAlert}
      iconBgColor="from-amber-600/20 to-amber-700/20"
      iconColor="text-amber-400"
      maxWidth="max-w-2xl"
      maxHeight="max-h-[80vh]"
      footerActions={[
        { icon: X, label: 'Cancel', onClick: onClose, variant: 'secondary' },
        {
          icon: CheckCircle,
          label: submitting ? 'Submitting...' : `Submit (${approvedCount} approved)`,
          onClick: handleSubmit,
          variant: 'success',
          disabled: submitting,
          loading: submitting,
        },
      ]}
    >
      {/* Bulk actions */}
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-gray-800/50">
        <button onClick={approveAll} className="text-caption px-2.5 py-1 rounded-md bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-600/30 transition-colors">
          Approve All
        </button>
        <button onClick={rejectAll} className="text-caption px-2.5 py-1 rounded-md bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-600/30 transition-colors">
          Reject All
        </button>
        <span className="ml-auto text-caption text-gray-500 font-mono">
          {approvedCount}/{items.length} approved
        </span>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {items.map((item) => {
          const isApproved = decisions[item.id] === 'approve';
          return (
            <button
              key={item.id}
              onClick={() => toggleDecision(item.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isApproved
                  ? 'border-emerald-600/40 bg-emerald-600/5 hover:bg-emerald-600/10'
                  : 'border-red-600/30 bg-red-600/5 hover:bg-red-600/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1 rounded-md ${isApproved ? 'bg-emerald-600/20' : 'bg-red-600/20'}`}>
                  {isApproved
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    : <XCircle className="w-3.5 h-3.5 text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-200 truncate">{item.title}</span>
                    <span className="text-micro px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 uppercase shrink-0">
                      {item.category}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-caption text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {item.effort != null && (
                      <span className="inline-flex items-center gap-1" title={`Effort: ${item.effort}/10`}>
                        <span className="text-2xs text-amber-400/60 w-3 text-right font-mono">{item.effort}</span>
                        <span className="inline-block w-20 h-2 rounded bg-gray-700/40 overflow-hidden">
                          <span className="block h-full rounded bg-amber-400/80" style={{ width: `${Math.min(item.effort * 10, 100)}%` }} />
                        </span>
                      </span>
                    )}
                    {item.impact != null && (
                      <span className="inline-flex items-center gap-1" title={`Impact: ${item.impact}/10`}>
                        <span className="text-2xs text-emerald-400/60 w-3 text-right font-mono">{item.impact}</span>
                        <span className="inline-block w-20 h-2 rounded bg-gray-700/40 overflow-hidden">
                          <span className="block h-full rounded bg-emerald-400/80" style={{ width: `${Math.min(item.impact * 10, 100)}%` }} />
                        </span>
                      </span>
                    )}
                    {item.risk != null && (
                      <span className="inline-flex items-center gap-1" title={`Risk: ${item.risk}/10`}>
                        <span className="text-2xs text-red-400/60 w-3 text-right font-mono">{item.risk}</span>
                        <span className="inline-block w-20 h-2 rounded bg-gray-700/40 overflow-hidden">
                          <span className="block h-full rounded bg-red-400/80" style={{ width: `${Math.min(item.risk * 10, 100)}%` }} />
                        </span>
                      </span>
                    )}
                    {item.brainConflict?.hasConflict && (
                      <span className="text-2xs text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {item.brainConflict.patternTitle || 'Conflict'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </UniversalModal>
  );
}

// ============================================================================
// Toolbar Button
// ============================================================================

function ToolbarBtn({
  onClick, disabled, title, active, variant, testId, children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  title: string;
  active?: boolean;
  variant?: 'play' | 'stop' | 'default';
  testId?: string;
  children: React.ReactNode;
}) {
  const base = 'p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed border';
  const variants = {
    play: 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border-emerald-600/40',
    stop: 'bg-red-600/10 text-red-400 hover:bg-red-600/20 border-red-600/30',
    default: active
      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300 border-gray-700/60',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant || 'default']}`}
      whileHover={disabled ? undefined : { scale: 1.05 }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      title={title}
      data-testid={testId}
    >
      {children}
    </motion.button>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/** Rollback a run's status and recompute derived fields. */
function rollbackRunStatus(runId: string, status: PipelineStatus) {
  const state = useConductorStore.getState();
  const run = state.runs[runId];
  if (!run) return;
  const updatedRun = { ...run, status };
  const updatedRuns = { ...state.runs, [runId]: updatedRun };
  const selectedRun = state.selectedRunId === runId ? updatedRun : (state.selectedRunId ? updatedRuns[state.selectedRunId] ?? null : null);
  useConductorStore.setState({
    runs: updatedRuns,
    currentRun: selectedRun,
    isRunning: selectedRun?.status === 'running',
    isPaused: selectedRun?.status === 'paused',
  });
}

// ============================================================================
// Main Component
// ============================================================================

export default function PipelineControls({ projectId, onStart, onOpenSettings, onViewReport }: PipelineControlsProps) {
  const { currentRun, isRunning, isPaused, nerdMode, toggleNerdMode, resetRun } = useConductorStore();
  const [triageOpen, setTriageOpen] = useState(false);
  const [intentOpen, setIntentOpen] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);

  const status: PipelineStatus = currentRun?.status ?? 'idle';
  const isTerminal = TERMINAL_STATUSES.includes(status);
  const cycle = currentRun?.cycle ?? 0;
  const maxCycles = currentRun?.config.maxCyclesPerRun ?? 0;
  const badge = STATUS_BADGES[status];

  // Detect triage checkpoint
  const triageData = currentRun?.triage_data;
  const isAtTriage = isPaused && triageData && triageData.items?.length > 0;

  // Detect intent questions checkpoint
  const intentData = currentRun?.intent_questions;
  const isAtIntent = isPaused && intentData && intentData.length > 0 && !isAtTriage;

  const handlePause = async () => {
    if (!currentRun) return;
    setControlError(null);
    const store = useConductorStore.getState();
    store.pauseRun();
    try {
      const res = await fetch('/api/conductor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause', runId: currentRun.id, projectId }),
      });
      if (!res.ok) {
        store.resumeRun(); // rollback optimistic pause
        setControlError(`Failed to pause pipeline (${res.status})`);
      }
    } catch {
      useConductorStore.getState().resumeRun(); // rollback
      setControlError('Network error — could not pause pipeline');
    }
  };

  const handleResume = async () => {
    if (!currentRun) return;
    setControlError(null);
    const store = useConductorStore.getState();
    store.resumeRun();
    try {
      const res = await fetch('/api/conductor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume', runId: currentRun.id, projectId }),
      });
      if (!res.ok) {
        store.pauseRun(); // rollback optimistic resume
        setControlError(`Failed to resume pipeline (${res.status})`);
      }
    } catch {
      useConductorStore.getState().pauseRun(); // rollback
      setControlError('Network error — could not resume pipeline');
    }
  };

  const handleStop = async () => {
    if (!currentRun) return;
    setControlError(null);
    const previousStatus = currentRun.status;
    const runId = currentRun.id;
    useConductorStore.getState().stopRun();
    try {
      const res = await fetch('/api/conductor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', runId, projectId }),
      });
      if (!res.ok) {
        rollbackRunStatus(runId, previousStatus);
        setControlError(`Failed to stop pipeline (${res.status})`);
      }
    } catch {
      rollbackRunStatus(runId, previousStatus);
      setControlError('Network error — could not stop pipeline');
    }
  };

  const handlePlayPause = () => {
    if (isTerminal) {
      resetRun();
      onStart();
    } else if (!isRunning && !isPaused) {
      onStart();
    } else if (isPaused) {
      handleResume();
    } else {
      handlePause();
    }
  };

  return (
    <>
      <motion.div
        className="flex items-center px-3 py-2.5 rounded-xl border border-gray-800 bg-gray-900/50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        data-testid="pipeline-controls"
      >
        {/* ---- LEFT: Action buttons ---- */}
        <div className="flex items-center gap-1.5">
          {/* Status Badge */}
          <div className={`px-2.5 py-1 rounded-full text-caption font-medium mr-1 ${badge.className}`}>
            {isRunning && (
              <motion.span
                className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            {badge.label}
          </div>

          {/* Play/Pause */}
          <ToolbarBtn
            onClick={handlePlayPause}
            disabled={!projectId || status === 'stopping'}
            title={isRunning ? 'Pause Pipeline' : isPaused ? 'Resume Pipeline' : isTerminal ? 'Start New Run' : 'Start Pipeline'}
            variant={isRunning ? 'default' : 'play'}
            active={isRunning}
            testId="pipeline-play-btn"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </ToolbarBtn>

          {/* Stop */}
          <ToolbarBtn
            onClick={handleStop}
            disabled={!isRunning && !isPaused}
            title="Stop Pipeline"
            variant="stop"
            testId="pipeline-stop-btn"
          >
            <Square className="w-3.5 h-3.5" />
          </ToolbarBtn>

          {/* Reset */}
          <ToolbarBtn
            onClick={() => resetRun()}
            disabled={!currentRun || isRunning}
            title="Reset — clear run and start fresh"
            testId="pipeline-reset-btn"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </ToolbarBtn>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-700/50 mx-1" />

          {/* Settings */}
          <ToolbarBtn
            onClick={onOpenSettings}
            disabled={isRunning || isPaused}
            title="Pipeline Settings"
            testId="pipeline-settings-btn"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </ToolbarBtn>

          {/* View Report */}
          <ToolbarBtn
            onClick={onViewReport}
            disabled={!currentRun || !isTerminal}
            title="View Run Report"
            testId="pipeline-report-btn"
          >
            <FileText className="w-3.5 h-3.5" />
          </ToolbarBtn>

          {/* Nerd Mode */}
          <ToolbarBtn
            onClick={toggleNerdMode}
            active={nerdMode}
            title={nerdMode ? 'Switch to rich UI' : 'Nerd mode (minimal UI)'}
            testId="pipeline-nerd-mode-btn"
          >
            <TerminalSquare className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>

        {/* ---- CENTER: Triage / Intent action (when applicable) ---- */}
        <div className="flex-1 flex justify-center">
          <AnimatePresence>
            {isAtTriage && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setTriageOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg
                  bg-amber-600/15 border border-amber-500/40 text-amber-400
                  hover:bg-amber-600/25 transition-all"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ShieldAlert className="w-4 h-4" />
                </motion.div>
                <span className="text-xs font-medium">
                  Review {triageData!.items.length} triage items
                </span>
              </motion.button>
            )}
            {isAtIntent && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setIntentOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg
                  bg-purple-600/15 border border-purple-500/40 text-purple-400
                  hover:bg-purple-600/25 transition-all"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MessageSquare className="w-4 h-4" />
                </motion.div>
                <span className="text-xs font-medium">
                  Answer {intentData!.length} clarifying questions
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ---- RIGHT: Run info ---- */}
        <div className="flex items-center gap-3">
          {/* Cycle Counter */}
          {currentRun && (
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-3 h-3 text-gray-600" />
              <span className="text-xs font-mono">
                <span className="text-gray-400">Cycle </span>
                <span className="text-cyan-400 font-bold">{cycle}</span>
                {maxCycles > 0 && <span className="text-gray-600">/{maxCycles}</span>}
              </span>
            </div>
          )}

          {/* Current Stage */}
          {currentRun && (
            <>
              <div className="w-px h-4 bg-gray-700/50" />
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-gray-600" />
                <span className="text-xs text-gray-400 capitalize">
                  {currentRun.currentStage}
                </span>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Error Toast */}
      <AnimatePresence>
        {controlError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg border border-red-600/40 bg-red-600/10 text-red-400 text-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">{controlError}</span>
            <button
              onClick={() => setControlError(null)}
              className="p-0.5 rounded hover:bg-red-600/20 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Triage Modal */}
      <TriageModal
        isOpen={triageOpen && !!isAtTriage}
        triageData={triageData}
        runId={currentRun?.id ?? ''}
        onClose={() => setTriageOpen(false)}
      />

      {/* Intent Refinement Modal */}
      {intentOpen && isAtIntent && (
        <IntentRefinementModal
          isOpen={intentOpen}
          onClose={() => setIntentOpen(false)}
          questions={intentData!}
          runId={currentRun!.id}
        />
      )}
    </>
  );
}
