'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Terminal,
  X,
  ChevronRight,
  MessageCircle,
  Bot,
  StopCircle,
} from 'lucide-react';
import { useManualSessionStore } from '../store/manualSessionStore';
import { useCLISessionStore } from '@/components/cli/store/cliSessionStore';
import type { CLISessionId } from '@/components/cli/store/cliSessionStore';
import { clearSessionStrategy } from '@/components/cli/store/cliExecutionManager';
import { clearSessionTasks } from '@/components/cli/taskRegistry';
import { useActiveProjectStore } from '@/stores/clientProjectStore';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import type { ManualSessionStatus } from '../lib/manualSession.types';
import { formatCost } from './CLISessionModal';

// ============================================================================
// Status badge config
// ============================================================================

const STATUS_CONFIG: Record<ManualSessionStatus, {
  label: string;
  dotClass: string;
  textClass: string;
}> = {
  idle: { label: 'Idle', dotClass: 'bg-gray-500', textClass: 'text-gray-400' },
  starting: { label: 'Starting', dotClass: 'bg-blue-400 animate-pulse', textClass: 'text-blue-400' },
  running: { label: 'Running', dotClass: 'bg-green-400 animate-pulse', textClass: 'text-green-400' },
  waiting_input: { label: 'Needs input', dotClass: 'bg-amber-400 animate-pulse', textClass: 'text-amber-400' },
  waiting_approval: { label: 'Approval needed', dotClass: 'bg-orange-400 animate-pulse', textClass: 'text-orange-400' },
  completed: { label: 'Done', dotClass: 'bg-gray-500', textClass: 'text-gray-500' },
  failed: { label: 'Failed', dotClass: 'bg-red-400', textClass: 'text-red-400' },
};

// ============================================================================
// Session card
// ============================================================================

function SessionCard({
  label,
  status,
  projectName,
  isActive,
  isManual,
  eventCount,
  costUsd,
  onSelect,
  onClose,
  onStop,
}: {
  label: string;
  status: ManualSessionStatus;
  projectName: string;
  isActive: boolean;
  isManual: boolean;
  eventCount: number;
  costUsd?: number;
  onSelect: () => void;
  onClose?: () => void;
  onStop?: () => void;
}) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={`
        w-full text-left px-3 py-2.5 rounded-lg transition-colors group relative cursor-pointer
        ${isActive
          ? 'bg-purple-500/15 border border-purple-500/30'
          : 'bg-gray-800/50 border border-gray-700/30 hover:bg-gray-800 hover:border-gray-600/50'
        }
      `}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotClass}`} />

        {/* Icon */}
        {isManual ? (
          <Terminal className="w-3.5 h-3.5 shrink-0 text-purple-400" />
        ) : (
          <Bot className="w-3.5 h-3.5 shrink-0 text-blue-400" />
        )}

        {/* Label + info */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-200 truncate">{label}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-2xs ${cfg.textClass}`}>{cfg.label}</span>
            <span className="text-2xs text-gray-600">·</span>
            <span className="text-2xs text-gray-500 truncate">{projectName}</span>
            {eventCount > 0 && (
              <>
                <span className="text-2xs text-gray-600">·</span>
                <span className="text-2xs text-gray-500">{eventCount} msgs</span>
              </>
            )}
            {costUsd !== undefined && costUsd > 0 && (
              <>
                <span className="text-2xs text-gray-600">·</span>
                <span className="text-2xs text-emerald-400 tabular-nums" title="Total session cost">
                  {formatCost(costUsd)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {status === 'waiting_input' && (
            <MessageCircle className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
          )}
          {/* Stop / kill button for running sessions (finding #5) */}
          {status === 'running' && onStop && (
            <button
              onClick={(e) => { e.stopPropagation(); onStop(); }}
              className="p-0.5 rounded hover:bg-red-500/20 transition-colors"
              title="Stop session"
              aria-label="Stop session"
              data-testid="session-stop-btn"
            >
              <StopCircle className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
            </button>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-colors" />
        </div>
      </div>

      {/* Close button for manual sessions */}
      {isManual && onClose && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-700 transition-opacity"
          title="Close session"
        >
          <X className="w-3 h-3 text-gray-500 hover:text-gray-300" />
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main sidebar
// ============================================================================

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string, isManual: boolean) => void;
}

export function SessionSidebar({ isOpen, onClose, onSelectSession }: SessionSidebarProps) {
  const sessions = useManualSessionStore((s) => s.sessions);
  const manualSessions = useMemo(
    () => Object.values(sessions).sort((a, b) => b.createdAt - a.createdAt),
    [sessions],
  );
  const activeSessionId = useManualSessionStore((s) => s.activeSessionId);
  const createSession = useManualSessionStore((s) => s.createSession);
  const closeSession = useManualSessionStore((s) => s.closeSession);
  const selectSession = useManualSessionStore((s) => s.selectSession);
  const abortSession = useManualSessionStore((s) => s.abortSession);

  const cliSessions = useCLISessionStore((s) => s.sessions);
  const clearSession = useCLISessionStore((s) => s.clearSession);
  const setRunning = useCLISessionStore((s) => s.setRunning);
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const { confirm } = useGlobalModal();

  // Map automated sessions to display format
  const automatedEntries = Object.values(cliSessions)
    .filter((s) => s.projectPath)
    .map((s) => ({
      id: s.id,
      label: `Auto ${s.id.replace('cliSession', '#')}`,
      status: (s.isRunning ? 'running' : s.completedCount > 0 ? 'completed' : 'idle') as ManualSessionStatus,
      projectName: s.projectPath?.split(/[\\/]/).pop() || 'Unknown',
      eventCount: s.queue.length,
      isManual: false,
    }));

  const handleNewSession = async () => {
    if (!activeProject) return;
    await createSession({
      projectId: activeProject.id,
      projectPath: activeProject.path,
      projectName: activeProject.name,
    });
  };

  const handleSelectManual = (sessionId: string) => {
    selectSession(sessionId);
    onSelectSession(sessionId, true);
  };

  const handleSelectAutomated = (sessionId: string) => {
    onSelectSession(sessionId, false);
  };

  // Stop a running manual session — confirm since work is mid-flight (finding #5)
  const handleStopManual = async (sessionId: string) => {
    if (!(await confirm('Stop session', 'The running Claude process will be aborted.'))) return;
    void abortSession(sessionId);
  };

  // Stop a running automated session: abort the queue + clear server registry.
  const handleStopAutomated = async (sessionId: CLISessionId) => {
    const session = cliSessions[sessionId];
    const hasRunningTask = session?.queue.some((t) => t.status.type === 'running') ?? false;
    if (
      hasRunningTask &&
      !(await confirm('Stop automated session', 'In-flight tasks will be cancelled.'))
    ) {
      return;
    }
    setRunning(sessionId, false);
    clearSessionStrategy(sessionId);
    clearSession(sessionId);
    void clearSessionTasks(sessionId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="shrink-0 overflow-hidden border-r border-gray-800/50"
        >
          <div className="w-[280px] h-full flex flex-col bg-gray-950/50 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-gray-200">Sessions</span>
                <span className="text-2xs px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {manualSessions.length + automatedEntries.filter(e => e.status === 'running').length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* New session button */}
            <div className="px-3 py-2">
              <button
                onClick={handleNewSession}
                disabled={!activeProject}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                  bg-purple-500/10 border border-purple-500/20 text-purple-300
                  hover:bg-purple-500/20 hover:border-purple-500/30
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                New Manual Session
              </button>
              {!activeProject && (
                <p className="text-2xs text-gray-500 mt-1 text-center">
                  Select a project first
                </p>
              )}
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
              {/* Manual sessions */}
              {manualSessions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-2xs text-gray-500 uppercase tracking-wider px-1 pt-2 pb-1">
                    Manual
                  </p>
                  <AnimatePresence>
                    {manualSessions.map((s) => (
                      <SessionCard
                        key={s.id}
                        label={s.label}
                        status={s.status}
                        projectName={s.projectName}
                        isActive={s.id === activeSessionId}
                        isManual
                        eventCount={s.events.filter(e => e.type === 'assistant' || e.type === 'user').length}
                        costUsd={s.totalCostUsd}
                        onSelect={() => handleSelectManual(s.id)}
                        onClose={() => closeSession(s.id)}
                        onStop={() => handleStopManual(s.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Automated sessions */}
              {automatedEntries.length > 0 && (
                <div className="space-y-1">
                  <p className="text-2xs text-gray-500 uppercase tracking-wider px-1 pt-2 pb-1">
                    Automated
                  </p>
                  {automatedEntries.map((entry) => (
                    <SessionCard
                      key={entry.id}
                      label={entry.label}
                      status={entry.status}
                      projectName={entry.projectName}
                      isActive={false}
                      isManual={false}
                      eventCount={entry.eventCount}
                      onSelect={() => handleSelectAutomated(entry.id)}
                      onStop={() => handleStopAutomated(entry.id)}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {manualSessions.length === 0 && automatedEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Terminal className="w-8 h-8 text-gray-700 mb-2" />
                  <p className="text-xs text-gray-500">No active sessions</p>
                  <p className="text-2xs text-gray-600 mt-1">
                    Start a manual session to chat with Claude
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
