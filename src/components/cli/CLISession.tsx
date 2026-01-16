'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Play, CheckCircle, XCircle, Clock, Copy, Check } from 'lucide-react';
import { CompactTerminal } from './CompactTerminal';
import type { QueuedTask } from './types';
import type { CLISessionId, CLISessionState } from './store';
import { getAllSkills, type SkillId } from './skills';

interface CLISessionProps {
  sessionId: CLISessionId;
  session: CLISessionState;
  index: number;
  selectedCount: number;
  onAddTasks: (sessionId: CLISessionId) => void;
  onClearSession: (sessionId: CLISessionId) => void;
  onStartSession: (sessionId: CLISessionId) => void;
  onToggleSkill: (sessionId: CLISessionId, skillId: SkillId) => void;
  onTaskStart: (sessionId: CLISessionId, taskId: string) => void;
  onTaskComplete: (sessionId: CLISessionId, taskId: string, success: boolean) => void;
  onQueueEmpty: (sessionId: CLISessionId) => void;
  onExecutionChange: (sessionId: CLISessionId, executionId: string | null, taskId: string | null) => void;
}

/**
 * Get session statistics from queue
 */
function getSessionStats(queue: QueuedTask[]) {
  const pending = queue.filter(t => t.status === 'pending').length;
  const running = queue.filter(t => t.status === 'running').length;
  const completed = queue.filter(t => t.status === 'completed').length;
  const failed = queue.filter(t => t.status === 'failed').length;
  return { pending, running, completed, failed, total: queue.length };
}

/**
 * CLI Session Component
 *
 * Renders a single CLI session with its queue, controls, and terminal.
 * Extracted from CLIBatchPanel for cleaner code organization.
 */
export function CLISession({
  sessionId,
  session,
  index,
  selectedCount,
  onAddTasks,
  onClearSession,
  onStartSession,
  onToggleSkill,
  onTaskStart,
  onTaskComplete,
  onQueueEmpty,
  onExecutionChange,
}: CLISessionProps) {
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const allSkills = getAllSkills();

  const stats = getSessionStats(session.queue);
  const isRunning = session.isRunning;
  const hasQueue = stats.total > 0;
  const canStart = stats.pending > 0 && !isRunning;

  // Copy requirement name to clipboard
  const handleCopyFilename = useCallback(async (taskId: string, requirementName: string) => {
    try {
      await navigator.clipboard.writeText(requirementName);
      setCopiedTaskId(taskId);
      setTimeout(() => setCopiedTaskId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  // Handlers that pass sessionId to parent
  const handleAddTasks = useCallback(() => onAddTasks(sessionId), [sessionId, onAddTasks]);
  const handleClear = useCallback(() => onClearSession(sessionId), [sessionId, onClearSession]);
  const handleStart = useCallback(() => onStartSession(sessionId), [sessionId, onStartSession]);
  const handleToggleSkill = useCallback((skillId: SkillId) => onToggleSkill(sessionId, skillId), [sessionId, onToggleSkill]);
  const handleTaskStart = useCallback((taskId: string) => onTaskStart(sessionId, taskId), [sessionId, onTaskStart]);
  const handleTaskComplete = useCallback((taskId: string, success: boolean) => onTaskComplete(sessionId, taskId, success), [sessionId, onTaskComplete]);
  const handleQueueEmpty = useCallback(() => onQueueEmpty(sessionId), [sessionId, onQueueEmpty]);
  const handleExecutionChange = useCallback((executionId: string | null, taskId: string | null) => onExecutionChange(sessionId, executionId, taskId), [sessionId, onExecutionChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden"
    >
      {/* Session Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-300">
            Session {index + 1}
          </span>
          {/* Session resolved count */}
          {session.completedCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded font-medium">
              {session.completedCount} resolved
            </span>
          )}
          {/* Claude session indicator */}
          {session.claudeSessionId && (
            <span className="text-[9px] text-purple-400/70 font-mono">
              {session.claudeSessionId.slice(0, 6)}
            </span>
          )}
          {/* Stats */}
          {hasQueue && (
            <div className="flex items-center gap-1.5 text-[10px]">
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
              {stats.completed > 0 && (
                <span className="flex items-center gap-0.5 text-green-400">
                  <CheckCircle className="w-2.5 h-2.5" />
                  {stats.completed}
                </span>
              )}
              {stats.failed > 0 && (
                <span className="flex items-center gap-0.5 text-red-400">
                  <XCircle className="w-2.5 h-2.5" />
                  {stats.failed}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Add selected */}
          <button
            onClick={handleAddTasks}
            disabled={selectedCount === 0}
            className="flex items-center gap-1 px-2 py-1 text-[10px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={`Add ${selectedCount} selected tasks`}
          >
            <Plus className="w-3 h-3" />
            <span>{selectedCount}</span>
          </button>

          {/* Skill toggles - only show when session has tasks and not running */}
          {hasQueue && !session.isRunning && (
            <div className="flex items-center gap-0.5 px-1 border-l border-gray-700/50 ml-1">
              {allSkills.map((skill) => {
                const Icon = skill.icon;
                const isActive = session.enabledSkills.includes(skill.id);
                const colorClasses = {
                  violet: isActive ? 'bg-violet-500/20 text-violet-400 border-violet-500/50' : 'text-gray-500 hover:text-violet-400 hover:bg-violet-500/10',
                  pink: isActive ? 'bg-pink-500/20 text-pink-400 border-pink-500/50' : 'text-gray-500 hover:text-pink-400 hover:bg-pink-500/10',
                };
                return (
                  <button
                    key={skill.id}
                    onClick={() => handleToggleSkill(skill.id)}
                    className={`p-1 rounded border transition-colors ${isActive ? 'border' : 'border-transparent'} ${colorClasses[skill.color as keyof typeof colorClasses]}`}
                    title={`${skill.name}: ${skill.description}${isActive ? ' (active)' : ''}`}
                  >
                    <Icon className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Start */}
          {canStart && (
            <button
              onClick={handleStart}
              className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded transition-colors"
              title="Start queue"
            >
              <Play className="w-3 h-3" />
            </button>
          )}

          {/* Clear */}
          {hasQueue && (
            <button
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Clear session"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Task Queue Preview */}
      {hasQueue && (
        <div className="px-3 py-1.5 border-b border-gray-700/30 max-h-[60px] overflow-y-auto">
          <div className="flex flex-wrap gap-1">
            {session.queue.slice(0, 6).map(task => (
              <button
                key={task.id}
                onClick={() => handleCopyFilename(task.id, task.requirementName)}
                className={`text-[9px] px-1.5 py-0.5 rounded truncate max-w-[100px] flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${
                  task.status === 'running' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  task.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                  task.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                  'bg-gray-700/50 text-gray-400'
                }`}
                title={`${task.requirementName} (click to copy)`}
              >
                <span className="truncate">{task.requirementName.slice(0, 12)}</span>
                {copiedTaskId === task.id ? (
                  <Check className="w-2.5 h-2.5 text-green-400 flex-shrink-0" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-50 flex-shrink-0" />
                )}
              </button>
            ))}
            {session.queue.length > 6 && (
              <span className="text-[9px] text-gray-500">
                +{session.queue.length - 6}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="flex-1 min-h-[200px]">
        {session.projectPath ? (
          <CompactTerminal
            instanceId={sessionId}
            projectPath={session.projectPath}
            title=""
            className="h-full border-0 rounded-none"
            taskQueue={session.queue}
            autoStart={session.autoStart}
            enabledSkills={session.enabledSkills}
            currentExecutionId={session.currentExecutionId}
            currentStoredTaskId={session.currentTaskId}
            onTaskStart={handleTaskStart}
            onTaskComplete={handleTaskComplete}
            onQueueEmpty={handleQueueEmpty}
            onExecutionChange={handleExecutionChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            Add tasks to start
          </div>
        )}
      </div>
    </motion.div>
  );
}
