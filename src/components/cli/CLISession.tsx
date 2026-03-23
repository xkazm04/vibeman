'use client';

import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { transition } from '@/lib/motion';
import { Plus, Play, CheckCircle, XCircle, Clock, Copy, Check, Github, Settings, X, AlertTriangle, RotateCcw } from 'lucide-react';
import { CompactTerminal } from './CompactTerminal';
import { CLIGitConfigPanel } from './CLIGitConfigPanel';
import type { QueuedTask } from './types';
import type { CLISessionId, CLISessionState, CLIGitConfig } from './store';
import { getAllSkills, type SkillId } from './skills';
import { PROVIDER_MODELS, type CLIProvider, type CLIModel } from '@/lib/claude-terminal/types';
import { UniversalSelect, type SelectOption } from '@/components/ui/UniversalSelect';

interface CLISessionProps {
  sessionId: CLISessionId;
  session: CLISessionState;
  index: number;
  selectedCount: number;
  onAddTasks: (sessionId: CLISessionId) => void;
  onDeleteSession: (sessionId: CLISessionId) => void;
  onStartSession: (sessionId: CLISessionId) => void;
  onToggleSkill: (sessionId: CLISessionId, skillId: SkillId) => void;
  onToggleGit: (sessionId: CLISessionId) => void;
  onGitConfigChange: (sessionId: CLISessionId, config: CLIGitConfig) => void;
  onTaskStart: (sessionId: CLISessionId, taskId: string) => void;
  onTaskComplete: (sessionId: CLISessionId, taskId: string, success: boolean) => void;
  onQueueEmpty: (sessionId: CLISessionId) => void;
  onExecutionChange: (sessionId: CLISessionId, executionId: string | null, taskId: string | null) => void;
  onProviderChange: (sessionId: CLISessionId, provider: CLIProvider) => void;
  onModelChange: (sessionId: CLISessionId, model: CLIModel | null) => void;
  nerdMode?: boolean;
}

/**
 * Get session statistics from queue
 */
function getSessionStats(queue: QueuedTask[]) {
  const pending = queue.filter(t => t.status.type === 'queued').length;
  const running = queue.filter(t => t.status.type === 'running').length;
  const completed = queue.filter(t => t.status.type === 'completed').length;
  const failed = queue.filter(t => t.status.type === 'failed').length;
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
  onDeleteSession,
  onStartSession,
  onToggleSkill,
  onToggleGit,
  onGitConfigChange,
  onTaskStart,
  onTaskComplete,
  onQueueEmpty,
  onExecutionChange,
  onProviderChange,
  onModelChange,
  nerdMode = false,
}: CLISessionProps) {
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [showGitConfig, setShowGitConfig] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const gitConfigRef = useRef<HTMLDivElement>(null);
  const deleteConfirmRef = useRef<HTMLDivElement>(null);
  const allSkills = getAllSkills();

  const providerOptions: SelectOption[] = useMemo(() => [
    { value: 'claude', label: 'Claude' },
    { value: 'ollama', label: 'Ollama' },
  ], []);

  const modelOptions: SelectOption[] = useMemo(() => [
    { value: '', label: 'Default' },
    ...(PROVIDER_MODELS[session.provider || 'claude'] || PROVIDER_MODELS.claude).map(m => ({
      value: m.id,
      label: m.label,
    })),
  ], [session.provider]);

  // Close git config panel on outside click
  useEffect(() => {
    if (!showGitConfig) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (gitConfigRef.current && !gitConfigRef.current.contains(e.target as Node)) {
        setShowGitConfig(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGitConfig]);

  // Close delete confirm on outside click
  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (deleteConfirmRef.current && !deleteConfirmRef.current.contains(e.target as Node)) {
        setShowDeleteConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeleteConfirm]);

  const stats = getSessionStats(session.queue);
  const isRunning = session.isRunning;
  const hasQueue = stats.total > 0;
  const canStart = stats.pending > 0 && !isRunning;

  // Session has state that can be cleared (resolved tasks, queue, running, or claude session)
  const hasSessionState = session.completedCount > 0 || hasQueue || isRunning || session.claudeSessionId;

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
  const handleDelete = useCallback(() => {
    onDeleteSession(sessionId);
    setShowDeleteConfirm(false);
  }, [sessionId, onDeleteSession]);
  const handleStart = useCallback(() => onStartSession(sessionId), [sessionId, onStartSession]);
  const handleToggleSkill = useCallback((skillId: SkillId) => onToggleSkill(sessionId, skillId), [sessionId, onToggleSkill]);
  const handleToggleGit = useCallback(() => onToggleGit(sessionId), [sessionId, onToggleGit]);
  const handleGitConfigChange = useCallback((config: CLIGitConfig) => {
    onGitConfigChange(sessionId, config);
    setShowGitConfig(false);
  }, [sessionId, onGitConfigChange]);
  const handleTaskStart = useCallback((taskId: string) => onTaskStart(sessionId, taskId), [sessionId, onTaskStart]);
  const handleTaskComplete = useCallback((taskId: string, success: boolean) => onTaskComplete(sessionId, taskId, success), [sessionId, onTaskComplete]);
  const handleQueueEmpty = useCallback(() => onQueueEmpty(sessionId), [sessionId, onQueueEmpty]);
  const handleExecutionChange = useCallback((executionId: string | null, taskId: string | null) => onExecutionChange(sessionId, executionId, taskId), [sessionId, onExecutionChange]);

  // ---- Nerd Mode: stripped-down, animation-free, monospace ----
  if (nerdMode) {
    const statusText = session.isRecovering ? 'RCV' : isRunning ? 'RUN' : hasQueue ? 'IDLE' : '---';
    const statusClass = session.isRecovering ? 'text-amber-400' : isRunning ? 'text-cyan-400' : hasQueue ? 'text-gray-300' : 'text-gray-600';

    return (
      <div className="flex flex-col font-mono border border-gray-800 bg-gray-950 overflow-hidden">
        {/* Nerd Header */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-800 text-caption">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">S{index + 1}</span>
            <span className={statusClass}>[{statusText}]</span>
            <span className="text-gray-500">{session.provider || 'claude'}/{session.model || 'default'}</span>
            {session.claudeSessionId && (
              <span className="text-gray-600">{session.claudeSessionId.slice(0, 6)}</span>
            )}
            {session.completedCount > 0 && (
              <span className="text-emerald-400">{session.completedCount}ok</span>
            )}
            {hasQueue && (
              <span className="text-gray-500">
                q={stats.pending}
                {stats.running > 0 && <span className="text-cyan-400"> run={stats.running}</span>}
                {stats.completed > 0 && <span className="text-emerald-400"> done={stats.completed}</span>}
                {stats.failed > 0 && <span className="text-red-400"> fail={stats.failed}</span>}
              </span>
            )}
            {session.gitEnabled && <span className="text-yellow-400/60">git</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddTasks}
              disabled={selectedCount === 0}
              className="px-1.5 py-0.5 text-2xs text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
              title={`Add ${selectedCount} selected tasks`}
            >
              +{selectedCount}
            </button>
            {canStart && (
              <button
                onClick={handleStart}
                className="px-1.5 py-0.5 text-2xs text-emerald-400 hover:bg-emerald-500/10"
                title="Start queue"
              >
                [START]
              </button>
            )}
            {hasSessionState && (
              <button
                onClick={() => {
                  if (isRunning) {
                    setShowDeleteConfirm(true);
                  } else {
                    handleDelete();
                  }
                }}
                className="px-1 py-0.5 text-2xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                title={isRunning ? 'Stop & reset' : 'Reset'}
              >
                [X]
              </button>
            )}
          </div>
        </div>

        {/* Nerd Delete Confirm */}
        {showDeleteConfirm && (
          <div ref={deleteConfirmRef} className="px-2 py-1.5 border-b border-red-800/50 bg-red-950/20 text-2xs flex items-center justify-between">
            <span className="text-red-400">Abort running task and reset?</span>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="text-gray-500 hover:text-gray-300">[cancel]</button>
              <button onClick={handleDelete} className="text-red-400 hover:text-red-300">[confirm]</button>
            </div>
          </div>
        )}

        {/* Nerd Queue */}
        {hasQueue && (
          <div className="px-2 py-1 border-b border-gray-800 text-2xs text-gray-500 max-h-[40px] overflow-y-auto">
            {session.queue.slice(0, 8).map(task => (
              <span
                key={task.id}
                className={`mr-2 cursor-pointer hover:text-gray-300 ${
                  task.status.type === 'running' ? 'text-cyan-400' :
                  task.status.type === 'completed' ? 'text-emerald-400' :
                  task.status.type === 'failed' ? 'text-red-400' :
                  'text-gray-500'
                }`}
                onClick={() => handleCopyFilename(task.id, task.requirementName)}
                title={task.requirementName}
              >
                {task.requirementName.slice(0, 15)}
                {copiedTaskId === task.id && <span className="text-emerald-400 ml-0.5">&check;</span>}
              </span>
            ))}
            {session.queue.length > 8 && <span className="text-gray-600">+{session.queue.length - 8}</span>}
          </div>
        )}

        {/* Terminal (same in both modes) */}
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
              provider={session.provider}
              model={session.model}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-2xs font-mono">
              awaiting tasks...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Rich Mode (default) ----
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col bg-gradient-to-br from-gray-800/30 to-gray-900/20 border border-gray-700/50 rounded-lg overflow-hidden backdrop-blur-sm shadow-sm hover:shadow-md hover:border-gray-600/50 transition-all duration-300"
    >
      {/* Session Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700/40">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-300">
              Session {index + 1}
            </span>
            {/* Reset/Delete session button - shows when session has any state */}
            {hasSessionState && (
              <div className="relative" ref={deleteConfirmRef}>
                <button
                  onClick={() => {
                    if (isRunning) {
                      setShowDeleteConfirm(true);
                    } else {
                      handleDelete();
                    }
                  }}
                  className={`p-0.5 rounded transition-all duration-200 ${
                    isRunning
                      ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/20 hover:scale-110'
                      : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10 hover:scale-110'
                  } active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30`}
                  title={isRunning ? 'Stop & reset session' : 'Reset session'}
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Delete Confirmation Popover */}
                <AnimatePresence>
                  {showDeleteConfirm && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={transition.snappy}
                      className="absolute left-0 top-full mt-1 z-50 bg-gray-900/95 backdrop-blur-md border border-red-500/30 rounded-lg shadow-2xl shadow-red-500/10 p-3 min-w-[200px]"
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-200 font-medium">Stop execution?</p>
                          <p className="text-2xs text-gray-400 mt-0.5">
                            This will abort the running task and reset the session.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-2 py-1 text-2xs text-gray-400 hover:text-gray-300 transition-all duration-200 hover:bg-gray-800/50 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          className="px-2 py-1 text-2xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-all duration-200 font-medium hover:shadow-sm hover:shadow-red-500/20 active:scale-95"
                        >
                          Stop & Reset
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          {/* Per-session recovery indicator */}
          {session.isRecovering && (
            <span className="flex items-center gap-1 text-micro px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded font-medium border border-amber-500/20 animate-pulse">
              <RotateCcw className="w-2.5 h-2.5 animate-spin" />
              Recovering...
            </span>
          )}
          {/* Session resolved count */}
          {session.completedCount > 0 && (
            <span className="text-micro px-1.5 py-0.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-400 rounded font-medium border border-green-500/20">
              {session.completedCount} resolved
            </span>
          )}
          {/* Claude session indicator */}
          {session.claudeSessionId && (
            <span className="text-micro text-purple-400/70 font-mono">
              {session.claudeSessionId.slice(0, 6)}
            </span>
          )}
          {/* Stats */}
          {hasQueue && (
            <div className="flex items-center gap-1.5 text-2xs">
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
            className="flex items-center gap-1 px-2 py-1 text-2xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-sm hover:shadow-cyan-500/20 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30"
            title={`Add ${selectedCount} selected tasks`}
          >
            <Plus className="w-3 h-3" />
            <span>{selectedCount}</span>
          </button>

          {/* Git toggle with config - show when session has tasks and not running */}
          {hasQueue && !session.isRunning && (
            <div className="relative" ref={gitConfigRef}>
              <div className="flex items-center">
                {/* Toggle button */}
                <button
                  onClick={handleToggleGit}
                  className={`p-1 rounded-l transition-all duration-200 border-r border-gray-700/30 ${
                    session.gitEnabled
                      ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 hover:scale-105'
                      : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 hover:scale-105'
                  } active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/30`}
                  title={session.gitEnabled ? 'Git auto-commit enabled (click to disable)' : 'Git auto-commit disabled (click to enable)'}
                >
                  <Github className="w-3 h-3" />
                </button>
                {/* Config button */}
                <button
                  onClick={() => setShowGitConfig(!showGitConfig)}
                  className={`p-1 rounded-r transition-all duration-200 ${
                    showGitConfig
                      ? 'bg-purple-500/20 text-purple-400'
                      : session.gitEnabled
                        ? 'bg-yellow-500/10 text-yellow-400/60 hover:text-yellow-400 hover:scale-105'
                        : 'text-gray-600 hover:text-gray-400 hover:bg-gray-700/30 hover:scale-105'
                  } active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30`}
                  title="Configure git settings"
                >
                  <Settings className="w-2.5 h-2.5" />
                </button>
              </div>

              {/* Git Config Popover */}
              <AnimatePresence>
                {showGitConfig && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={transition.snappy}
                    className="absolute right-0 top-full mt-1 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl shadow-purple-500/10 p-3 min-w-[320px]"
                  >
                    <CLIGitConfigPanel
                      config={session.gitConfig}
                      projectName={session.queue[0]?.projectName}
                      onChange={handleGitConfigChange}
                      onClose={() => setShowGitConfig(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Provider & Model selectors - only when not running */}
          {!session.isRunning && (
            <div className="flex items-center gap-1 px-1 border-l border-gray-700/50 ml-1">
              <UniversalSelect
                value={session.provider || 'claude'}
                onChange={(v) => onProviderChange(sessionId, v as CLIProvider)}
                options={providerOptions}
                variant="compact"
                size="sm"
                searchable={false}
                required
                className="w-[90px]"
              />
              <UniversalSelect
                value={session.model || ''}
                onChange={(v) => onModelChange(sessionId, (v || null) as CLIModel | null)}
                options={modelOptions}
                variant="compact"
                size="sm"
                searchable={false}
                placeholder="Default"
                className="w-[110px]"
              />
            </div>
          )}

          {/* Skill toggles - only show when session has tasks and not running */}
          {hasQueue && !session.isRunning && (
            <div className="flex items-center gap-0.5 px-1 border-l border-gray-700/50 ml-1">
              {allSkills.map((skill) => {
                const Icon = skill.icon;
                const isActive = session.enabledSkills.includes(skill.id);
                const colorClasses = {
                  violet: isActive ? 'bg-violet-500/20 text-violet-400 border-violet-500/50' : 'text-gray-500 hover:text-violet-400 hover:bg-violet-500/10',
                  pink: isActive ? 'bg-pink-500/20 text-pink-400 border-pink-500/50' : 'text-gray-500 hover:text-pink-400 hover:bg-pink-500/10',
                  emerald: isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10',
                };
                return (
                  <button
                    key={skill.id}
                    onClick={() => handleToggleSkill(skill.id)}
                    className={`p-1 rounded border transition-all duration-200 hover:scale-110 active:scale-95 ${isActive ? 'border shadow-sm' : 'border-transparent'} ${colorClasses[skill.color as keyof typeof colorClasses]} focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30`}
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
              className="flex items-center gap-1 px-2 py-1 text-2xs bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-md transition-all duration-200 hover:shadow-sm hover:shadow-green-500/20 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/30"
              title="Start queue"
            >
              <Play className="w-3 h-3" />
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
                className={`text-micro px-1.5 py-0.5 rounded-md truncate max-w-[100px] flex items-center gap-1 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${
                  task.status.type === 'running' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10' :
                  task.status.type === 'completed' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' :
                  task.status.type === 'failed' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' :
                  'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
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
              <span className="text-micro text-gray-500">
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
            provider={session.provider}
            model={session.model}
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
