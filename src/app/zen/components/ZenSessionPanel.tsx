'use client';

import { useMemo, useCallback } from 'react';
import { Square, Loader2, Clock, CheckCircle, XCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CLISessionState, type CLISessionId, abortSessionExecution } from '@/components/cli/store';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import { zen, zenSpacing } from '../lib/zenTheme';

interface ZenSessionPanelProps {
  sessionId: CLISessionId;
  session: CLISessionState;
  index: number;
}

/**
 * Zen Session Panel
 *
 * Simplified monitoring view for a CLI session.
 * Shows session status, current task, queue counts, and mini terminal.
 */
export function ZenSessionPanel({ sessionId, session, index }: ZenSessionPanelProps) {
  const stats = useMemo(() => {
    const pending = session.queue.filter(t => t.status.type === 'queued').length;
    const running = session.queue.filter(t => t.status.type === 'running').length;
    const completed = session.queue.filter(t => t.status.type === 'completed').length;
    const failed = session.queue.filter(t => t.status.type === 'failed').length;
    return { pending, running, completed, failed };
  }, [session.queue]);

  const runningTask = useMemo(() =>
    session.queue.find(t => t.status.type === 'running'),
    [session.queue]
  );

  const handleStop = useCallback(async () => {
    await abortSessionExecution(sessionId);
  }, [sessionId]);

  const hasActivity = session.isRunning || stats.pending > 0 || session.completedCount > 0;

  return (
    <div className={cn(
      "flex flex-col h-full rounded-lg border bg-gray-900/50 overflow-hidden",
      session.isRunning ? "border-green-500/30" : zen.surfaceBorder
    )}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${zen.surfaceDivider} shrink-0`}>
        <div className={`flex items-center ${zenSpacing.gapInline}`}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            session.isRunning ? "bg-green-500 animate-pulse" : "bg-gray-600"
          )} />
          <span className="text-sm font-medium text-gray-300">Session {index + 1}</span>
          {/* Claude session ID */}
          {session.claudeSessionId && (
            <span className="text-xs text-purple-400/70 font-mono">
              {session.claudeSessionId.slice(0, 6)}
            </span>
          )}
        </div>
        {session.isRunning && (
          <button
            onClick={handleStop}
            className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
            title="Stop session"
          >
            <Square className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Status */}
      <div className={`px-3 py-2 border-b ${zen.surfaceDividerSubtle} shrink-0`}>
        {runningTask ? (
          <div className="flex items-center gap-2 text-xs">
            <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
            <span className="text-gray-300 truncate">{runningTask.requirementName}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">Idle</span>
        )}

        {/* Queue stats */}
        <div className={`flex items-center ${zenSpacing.gapInline} text-xs text-gray-400 mt-1`}>
          {stats.pending > 0 && (
            <span className="flex items-center gap-0.5 text-amber-400">
              <Clock className="w-2.5 h-2.5" />
              {stats.pending}
            </span>
          )}
          {stats.running > 0 && (
            <span className="flex items-center gap-0.5 text-blue-400">
              <Play className="w-2.5 h-2.5" />
              {stats.running}
            </span>
          )}
          {(stats.completed > 0 || session.completedCount > 0) && (
            <span className="flex items-center gap-0.5 text-green-400">
              <CheckCircle className="w-2.5 h-2.5" />
              {stats.completed + session.completedCount}
            </span>
          )}
          {stats.failed > 0 && (
            <span className="flex items-center gap-0.5 text-red-400">
              <XCircle className="w-2.5 h-2.5" />
              {stats.failed}
            </span>
          )}
          {!hasActivity && (
            <span className="text-gray-400">No activity</span>
          )}
        </div>
      </div>

      {/* Terminal - simplified view */}
      <div className="flex-1 min-h-0">
        {session.projectPath ? (
          <CompactTerminal
            instanceId={sessionId}
            projectPath={session.projectPath}
            title=""
            className="h-full border-0 rounded-none text-[10px]"
            taskQueue={session.queue}
            autoStart={session.autoStart}
            enabledSkills={session.enabledSkills}
            currentExecutionId={session.currentExecutionId}
            currentStoredTaskId={session.currentTaskId}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
            No project
          </div>
        )}
      </div>
    </div>
  );
}
