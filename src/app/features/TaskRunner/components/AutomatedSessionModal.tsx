'use client';

import React from 'react';
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Loader2,
  Cpu,
  FolderOpen,
  Minimize2,
} from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import { useCLISessionStore } from '@/components/cli/store/cliSessionStore';
import type { CLISessionId } from '@/components/cli/store/cliSessionStore';

// ============================================================================
// Task status display
// ============================================================================

function TaskStatusBadge({ type }: { type: string }) {
  switch (type) {
    case 'completed':
      return <CheckCircle2 className="w-3 h-3 text-green-400" />;
    case 'failed':
      return <XCircle className="w-3 h-3 text-red-400" />;
    case 'running':
      return <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />;
    case 'queued':
      return <Clock className="w-3 h-3 text-blue-400" />;
    default:
      return <Clock className="w-3 h-3 text-gray-500" />;
  }
}

// ============================================================================
// Main modal
// ============================================================================

interface AutomatedSessionModalProps {
  sessionId: CLISessionId | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AutomatedSessionModal({ sessionId, isOpen, onClose }: AutomatedSessionModalProps) {
  const sessions = useCLISessionStore((s) => s.sessions);
  const session = sessionId ? sessions[sessionId] : null;

  if (!session) return null;

  const projectName = session.projectPath?.split(/[\\/]/).pop() || 'Unknown';
  const stats = {
    pending: session.queue.filter((t) => t.status.type === 'queued' || t.status.type === 'idle').length,
    running: session.queue.filter((t) => t.status.type === 'running').length,
    completed: session.completedCount,
    failed: session.queue.filter((t) => t.status.type === 'failed').length,
    total: session.queue.length,
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      maxHeight="max-h-[70vh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <Bot className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-gray-200 truncate">
              Auto {sessionId?.replace('cliSession', '#')}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-2xs font-medium ${session.isRunning ? 'text-green-400' : 'text-gray-500'}`}>
                {session.isRunning ? 'Running' : stats.total > 0 ? 'Idle' : 'Empty'}
              </span>
              <span className="text-2xs text-gray-600">·</span>
              <span className="text-2xs text-gray-500">{projectName}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-gray-700 transition-colors"
        >
          <Minimize2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Session info */}
      <div className="px-4 py-3 border-b border-gray-700/30 space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-2xs text-gray-400 truncate" title={session.projectPath || ''}>
              {session.projectPath || 'No project'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-2xs text-gray-400">
              {session.provider}{session.model ? ` · ${session.model}` : ''}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 pt-1">
          {stats.completed > 0 && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="text-2xs text-green-400">{stats.completed} done</span>
            </div>
          )}
          {stats.running > 0 && (
            <div className="flex items-center gap-1">
              <Play className="w-3 h-3 text-purple-400" />
              <span className="text-2xs text-purple-400">{stats.running} running</span>
            </div>
          )}
          {stats.pending > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              <span className="text-2xs text-blue-400">{stats.pending} pending</span>
            </div>
          )}
          {stats.failed > 0 && (
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-2xs text-red-400">{stats.failed} failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Task queue */}
      <div className="flex-1 overflow-y-auto">
        {session.queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bot className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-xs text-gray-500">No tasks in queue</p>
            <p className="text-2xs text-gray-600 mt-1">
              Assign requirements from the TaskRunner grid
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/30">
            {session.queue.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/20">
                <TaskStatusBadge type={task.status.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{task.requirementName}</p>
                  <p className="text-2xs text-gray-600 truncate">{task.projectName}</p>
                </div>
                <span className="text-2xs text-gray-600 shrink-0">
                  {task.status.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
