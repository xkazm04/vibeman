/**
 * Mini Terminal Card
 * Miniaturized live terminal preview for a CLI session with
 * AI-generated summary overlay showing current activity status.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Loader2, CheckCircle, XCircle, Pause, Zap } from 'lucide-react';
import type { CLISessionState, CLISessionId } from '@/components/cli/store';

interface MiniTerminalCardProps {
  sessionId: CLISessionId;
  session: CLISessionState;
  index: number;
  isCompact?: boolean;
}

const STATUS_CONFIGS = {
  running: { color: 'green', icon: Loader2, label: 'Executing', animate: true },
  idle: { color: 'gray', icon: Pause, label: 'Idle', animate: false },
  completed: { color: 'emerald', icon: CheckCircle, label: 'Done', animate: false },
  failed: { color: 'red', icon: XCircle, label: 'Failed', animate: false },
} as const;

function getSessionStatus(session: CLISessionState) {
  if (session.isRunning) return 'running';
  const hasCompleted = session.queue.some(t => t.status === 'completed');
  const hasFailed = session.queue.some(t => t.status === 'failed');
  if (hasFailed) return 'failed';
  if (hasCompleted) return 'completed';
  return 'idle';
}

export default function MiniTerminalCard({ sessionId, session, index, isCompact }: MiniTerminalCardProps) {
  const status = getSessionStatus(session);
  const config = STATUS_CONFIGS[status];
  const StatusIcon = config.icon;

  const stats = useMemo(() => {
    const pending = session.queue.filter(t => t.status === 'pending').length;
    const completed = session.queue.filter(t => t.status === 'completed').length + session.completedCount;
    const failed = session.queue.filter(t => t.status === 'failed').length;
    const running = session.queue.find(t => t.status === 'running');
    const total = session.queue.length;
    return { pending, completed, failed, running, total };
  }, [session.queue, session.completedCount]);

  const progressPercent = stats.total > 0
    ? Math.round(((stats.completed + stats.failed) / stats.total) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className={`relative overflow-hidden rounded-lg border bg-gray-900/60 backdrop-blur-sm ${
        status === 'running'
          ? 'border-green-500/30 shadow-lg shadow-green-500/5'
          : status === 'failed'
          ? 'border-red-500/30'
          : 'border-gray-700/40'
      }`}
    >
      {/* Scanline effect for running sessions */}
      {status === 'running' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent"
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            status === 'running' ? 'bg-green-500 animate-pulse' :
            status === 'failed' ? 'bg-red-500' :
            status === 'completed' ? 'bg-emerald-500' : 'bg-gray-600'
          }`} />
          <span className="text-xs font-mono text-gray-300">S{index + 1}</span>
          {session.claudeSessionId && (
            <span className="text-[8px] text-purple-400/60 font-mono">
              {session.claudeSessionId.slice(0, 6)}
            </span>
          )}
        </div>
        <StatusIcon className={`w-3 h-3 ${
          status === 'running' ? 'text-green-400 animate-spin' :
          status === 'failed' ? 'text-red-400' :
          status === 'completed' ? 'text-emerald-400' : 'text-gray-600'
        }`} />
      </div>

      {/* Terminal preview area */}
      <div className={`px-3 ${isCompact ? 'py-2' : 'py-3'}`}>
        {stats.running ? (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Executing</p>
            <p className="text-xs text-gray-200 truncate font-mono">
              {stats.running.requirementName}
            </p>
          </div>
        ) : session.projectPath ? (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Project</p>
            <p className="text-xs text-gray-400 truncate font-mono">
              {session.projectPath.split(/[/\\]/).pop()}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <Monitor className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-xs text-gray-600">No project</span>
          </div>
        )}

        {/* Progress bar */}
        {stats.total > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[9px] text-gray-500 mb-0.5">
              <span>{stats.completed + stats.failed}/{stats.total}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  stats.failed > 0 ? 'bg-gradient-to-r from-green-500 to-red-500' : 'bg-gradient-to-r from-cyan-500 to-green-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Queue stats footer */}
      {!isCompact && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-gray-800/30 text-[9px]">
          {stats.pending > 0 && (
            <span className="flex items-center gap-0.5 text-amber-400">
              <Zap className="w-2.5 h-2.5" />{stats.pending} queued
            </span>
          )}
          {stats.completed > 0 && (
            <span className="text-green-400">{stats.completed} done</span>
          )}
          {stats.failed > 0 && (
            <span className="text-red-400">{stats.failed} failed</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
