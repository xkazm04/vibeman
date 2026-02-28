'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X, CheckCircle } from 'lucide-react';
import { useCLISessionStore, type CLISessionId } from './store';
import { useCLIRecoveryStatus } from './store/useCLIRecovery';

const SESSION_IDS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];
const SESSION_LABELS: Record<CLISessionId, string> = {
  cliSession1: 'Session 1',
  cliSession2: 'Session 2',
  cliSession3: 'Session 3',
  cliSession4: 'Session 4',
};

type SessionRecoveryInfo = {
  id: CLISessionId;
  label: string;
  strategy: 'reconnect' | 'restart';
  taskCount: number;
  runningTask: string | null;
};

/**
 * RecoveryBanner - Shows detailed recovery progress for CLI sessions.
 * Displays which sessions are recovering, their strategy, and allows dismissal.
 */
export function RecoveryBanner() {
  const sessions = useCLISessionStore((state) => state.sessions);
  const { isRecovering, sessionsToRecover } = useCLIRecoveryStatus();
  const [dismissed, setDismissed] = useState(false);

  const recoveringSessions = useMemo<SessionRecoveryInfo[]>(() => {
    const result: SessionRecoveryInfo[] = [];
    for (const id of SESSION_IDS) {
      const s = sessions[id];
      const runningTask = s.queue.find((t) => t.status.type === 'running');
      const hasPendingTasks = s.queue.some((t) => t.status.type === 'queued');

      if (runningTask || (hasPendingTasks && s.autoStart)) {
        result.push({
          id,
          label: SESSION_LABELS[id],
          strategy: runningTask ? 'restart' : 'reconnect',
          taskCount: s.queue.filter((t) => t.status.type === 'queued' || t.status.type === 'running').length,
          runningTask: runningTask?.requirementName ?? null,
        });
      }
    }
    return result;
  }, [sessions]);

  // Show nothing if not recovering, no sessions need recovery, or user dismissed
  if ((!isRecovering && sessionsToRecover === 0) || dismissed) return null;

  const isDone = !isRecovering && sessionsToRecover === 0;

  return (
    <AnimatePresence>
      <motion.div
        role="status"
        aria-live="polite"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="overflow-hidden"
      >
        <div className="rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 px-4 py-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isRecovering ? (
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              )}
              <span className="text-xs font-medium text-amber-300">
                {isRecovering
                  ? `Recovering ${sessionsToRecover} session${sessionsToRecover !== 1 ? 's' : ''}...`
                  : 'Recovery complete'}
              </span>
            </div>
            {!isRecovering && (
              <button
                onClick={() => setDismissed(true)}
                className="p-0.5 rounded hover:bg-gray-700/50 text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Dismiss recovery banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Per-session detail */}
          {isRecovering && recoveringSessions.length > 0 && (
            <div className="space-y-1.5">
              {recoveringSessions.map((info) => (
                <div key={info.id} className="flex items-center gap-2">
                  {/* Session label */}
                  <span className="text-[10px] font-mono text-gray-400 w-16 shrink-0">
                    {info.label}
                  </span>

                  {/* Progress bar */}
                  <div className="flex-1 h-1 rounded-full bg-amber-500/10 overflow-hidden">
                    <div
                      className="h-full w-2/5 rounded-full animate-[shimmer-slide_1.5s_ease-in-out_infinite]"
                      style={{
                        background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
                      }}
                    />
                  </div>

                  {/* Strategy badge */}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                    info.strategy === 'reconnect'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-orange-500/10 text-orange-400'
                  }`}>
                    {info.strategy}
                  </span>

                  {/* Task count */}
                  <span className="text-[10px] text-gray-500 tabular-nums shrink-0">
                    {info.taskCount} task{info.taskCount !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
