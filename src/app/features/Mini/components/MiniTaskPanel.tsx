'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCLISessionStore, type CLISessionId } from '@/components/cli/store/cliSessionStore';
import { executeNextTask } from '@/components/cli/store/cliExecutionManager';
import { SESSION_IDS } from '@/app/features/TaskRunner/lib/taskRunnerConfig';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store/taskRunnerStore';
import { getTheme } from '@/components/ui/taskStatusUtils';
import {
  createQueuedStatus,
  createIdleStatus,
  isTaskRunning,
  isTaskQueued,
} from '@/app/features/TaskRunner/lib/types';
import type { QueuedTask } from '@/components/cli/types';
import type { TaskStatusUnion } from '@/app/features/TaskRunner/lib/types';
import { CheckCircle2, Clock, Loader2, XCircle, Play, Square, RotateCcw } from 'lucide-react';

interface RequirementFile {
  projectId: string;
  projectName: string;
  projectPath: string;
  name: string;
}

export default function MiniTaskPanel() {
  const { activeProject } = useClientProjectStore();
  const { projects } = useServerProjectStore();
  const queryClient = useQueryClient();
  const [selectedReqs, setSelectedReqs] = useState<Set<string>>(new Set());
  const [activeSessionId, setActiveSessionId] = useState<CLISessionId>('cliSession1');

  const projectId = activeProject?.id;

  // CLI session store
  const sessions = useCLISessionStore(s => s.sessions);
  const addTasksToSession = useCLISessionStore(s => s.addTasksToSession);
  const setAutoStart = useCLISessionStore(s => s.setAutoStart);
  const setRunning = useCLISessionStore(s => s.setRunning);
  const initSession = useCLISessionStore(s => s.initSession);
  const clearSession = useCLISessionStore(s => s.clearSession);

  // Task runner store — for live status of requirements
  const taskStates = useTaskRunnerStore(s => s.tasks);
  const updateTaskStatus = useTaskRunnerStore(s => s.updateTaskStatus);

  // Requirements via batch API
  const { data: reqsData, isLoading: reqsLoading } = useQuery<{ requirements: RequirementFile[] }>({
    queryKey: ['mini-requirements', projectId],
    queryFn: async () => {
      if (!projects || projects.length === 0) return { requirements: [] };
      const projectInputs = (projectId
        ? projects.filter(p => p.id === projectId)
        : projects.slice(0, 5)
      ).map(p => ({ id: p.id, path: p.path }));
      if (projectInputs.length === 0) return { requirements: [] };
      try {
        const res = await fetch('/api/claude-code/batch-requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPaths: projectInputs }),
        });
        if (!res.ok) return { requirements: [] };
        const data = await res.json();
        const requirementsMap: Record<string, string[]> = data.requirements || {};
        const allReqs: RequirementFile[] = [];
        for (const [projId, names] of Object.entries(requirementsMap)) {
          const project = projects.find(p => p.id === projId);
          if (!project) continue;
          for (const name of names as string[]) {
            allReqs.push({ projectId: projId, projectName: project.name, projectPath: project.path, name });
          }
        }
        return { requirements: allReqs };
      } catch { return { requirements: [] }; }
    },
    enabled: projects.length > 0,
    refetchInterval: 15000,
  });
  const requirements = reqsData?.requirements || [];

  // Merge requirements with live task status
  const requirementsWithStatus = useMemo(() => {
    return requirements.map(req => {
      const reqId = `${req.projectId}:${req.name}`;
      const taskState = taskStates[reqId];
      const status: TaskStatusUnion = taskState?.status || createIdleStatus();
      return { ...req, status, reqId };
    });
  }, [requirements, taskStates]);

  const toggleReq = useCallback((key: string) => {
    setSelectedReqs(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }, []);

  // Assign to the selected session
  const assignSelected = useCallback(() => {
    if (selectedReqs.size === 0) return;
    const session = sessions[activeSessionId];

    for (const key of selectedReqs) {
      const req = requirements.find(r => `${r.projectId}:${r.name}` === key);
      if (!req) continue;

      if (!session.projectPath) {
        initSession(activeSessionId, req.projectPath);
      }

      const task: QueuedTask = {
        id: `${req.projectId}:${req.name}`,
        projectId: req.projectId,
        projectPath: req.projectPath,
        projectName: req.projectName,
        requirementName: req.name,
        status: createQueuedStatus(),
        addedAt: Date.now(),
      };

      addTasksToSession(activeSessionId, [task]);
      updateTaskStatus(`${req.projectId}:${req.name}`, createQueuedStatus());
    }

    setSelectedReqs(new Set());
  }, [selectedReqs, requirements, sessions, activeSessionId, initSession, addTasksToSession, updateTaskStatus]);

  // Session controls
  const handleStartSession = useCallback((id: CLISessionId) => {
    setAutoStart(id, true);
    setRunning(id, true);
    executeNextTask(id);
  }, [setAutoStart, setRunning]);

  const handleStopSession = useCallback((id: CLISessionId) => {
    setAutoStart(id, false);
    setRunning(id, false);
  }, [setAutoStart, setRunning]);

  const handleResetSession = useCallback((id: CLISessionId) => {
    const session = sessions[id];
    // Reset task statuses back to idle for any queued tasks
    for (const task of session.queue) {
      updateTaskStatus(task.id, createIdleStatus());
    }
    clearSession(id);
  }, [sessions, clearSession, updateTaskStatus]);

  // Session stats helper
  const getStats = (id: CLISessionId) => {
    const s = sessions[id];
    const queued = s.queue.filter(t => t.status.type === 'queued').length;
    const running = s.queue.filter(t => t.status.type === 'running').length;
    const completed = s.completedCount;
    const failed = s.queue.filter(t => t.status.type === 'failed').length;
    return { queued, running, completed, failed };
  };

  // Panel-level status dot
  const anyRunning = SESSION_IDS.some(id => sessions[id].isRunning);
  const statusDot = (
    <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
      anyRunning ? 'bg-cyan-400 shadow-[0_0_8px_3px_rgba(34,211,238,0.6)]' : 'bg-white/20'
    }`} />
  );

  return (
    <div className="flex flex-col justify-between h-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-4 overflow-hidden">

      {/* ═══ A) Sessions — top ═══ */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            {statusDot}
            <h3 className="text-base font-semibold text-white">Tasks</h3>
          </div>
        </div>

        {/* 4 Session Cards — 2x2 grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {SESSION_IDS.map(id => {
            const s = sessions[id];
            const stats = getStats(id);
            const slotNum = id.replace('cliSession', '');

            return (
              <div key={id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${
                s.isRunning ? 'bg-blue-500/5 border-blue-500/30' : 'bg-white/[0.02] border-white/8'
              }`}>
                {/* Status dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  s.isRunning ? 'bg-cyan-400 shadow-[0_0_6px_2px_rgba(34,211,238,0.5)]'
                    : stats.queued > 0 ? 'bg-amber-400'
                    : stats.completed > 0 ? 'bg-emerald-400'
                    : 'bg-white/20'
                }`} />

                {/* Slot label */}
                <span className="text-sm text-white font-medium">S{slotNum}</span>

                {/* Stat icons */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {stats.running > 0 && (
                    <span className="flex items-center gap-0.5 text-blue-400">
                      <Loader2 className="w-3 h-3 animate-spin" /><span className="text-sm">{stats.running}</span>
                    </span>
                  )}
                  {stats.queued > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-400">
                      <Clock className="w-3 h-3" /><span className="text-sm">{stats.queued}</span>
                    </span>
                  )}
                  {stats.completed > 0 && (
                    <span className="flex items-center gap-0.5 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /><span className="text-sm">{stats.completed}</span>
                    </span>
                  )}
                  {stats.failed > 0 && (
                    <span className="flex items-center gap-0.5 text-red-400">
                      <XCircle className="w-3 h-3" /><span className="text-sm">{stats.failed}</span>
                    </span>
                  )}
                </div>

                {/* Session action */}
                {s.isRunning ? (
                  <button onClick={() => handleStopSession(id)} className="text-red-400 hover:text-red-300 transition-colors" title="Stop">
                    <Square className="w-3.5 h-3.5" />
                  </button>
                ) : stats.queued > 0 ? (
                  <button onClick={() => handleStartSession(id)} className="text-emerald-400 hover:text-emerald-300 transition-colors" title="Start">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                ) : (stats.completed > 0 || stats.failed > 0) ? (
                  <button onClick={() => handleResetSession(id)} className="text-white hover:text-cyan-300 transition-colors" title="Reset">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ B) Session selector + Assign — middle ═══ */}
      <div className="shrink-0 py-2">
        {/* Session selector tabs */}
        <div className="flex gap-1 mb-2">
          {SESSION_IDS.map(id => {
            const slotNum = id.replace('cliSession', '');
            const isActive = activeSessionId === id;
            const s = sessions[id];
            return (
              <button
                key={id}
                onClick={() => setActiveSessionId(id)}
                className={`flex-1 py-1 rounded text-sm font-medium transition-colors border ${
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                    : s.isRunning
                      ? 'bg-blue-500/5 border-white/8 text-blue-300'
                      : 'bg-white/[0.02] border-white/8 text-white hover:bg-white/5'
                }`}
              >
                S{slotNum}
              </button>
            );
          })}
        </div>

        {/* Assign button */}
        <button
          onClick={assignSelected}
          disabled={selectedReqs.size === 0}
          className="w-full py-2 rounded text-sm font-semibold bg-cyan-600/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-600/30 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          Assign to S{activeSessionId.replace('cliSession', '')}{selectedReqs.size > 0 ? ` (${selectedReqs.size})` : ''}
        </button>
      </div>

      {/* ═══ C) Buffer column — bottom ═══ */}
      <div className="overflow-y-auto" style={{ minHeight: '200px', maxHeight: '320px' }}>
        {reqsLoading ? (
          <div className="flex items-center justify-center py-4 text-white text-sm">Loading...</div>
        ) : requirementsWithStatus.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-white text-sm">
            {projectId ? 'No requirement files' : 'Select project'}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {requirementsWithStatus.map(req => {
              const isSelected = selectedReqs.has(req.reqId);
              const theme = getTheme(req.status.type);
              const StatusIcon = theme.Icon;
              const inProgress = isTaskRunning(req.status) || isTaskQueued(req.status);

              return (
                <button
                  key={req.reqId}
                  onClick={() => !inProgress && toggleReq(req.reqId)}
                  disabled={inProgress}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors shrink-0 border ${
                    inProgress
                      ? `${theme.bg} ${theme.border} cursor-not-allowed`
                      : isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/30'
                        : 'bg-white/[0.02] border-transparent hover:border-white/10 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Status icon or selection checkbox */}
                  {inProgress || req.status.type === 'completed' || req.status.type === 'failed' ? (
                    <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${theme.text} ${
                      req.status.type === 'running' ? 'animate-spin' : ''
                    }`} />
                  ) : (
                    <span className={`w-3 h-3 rounded-sm border shrink-0 transition-colors ${
                      isSelected ? 'bg-cyan-500 border-cyan-400' : 'border-white/25'
                    }`} />
                  )}

                  {/* Name */}
                  <span className={`text-sm truncate flex-1 ${
                    inProgress ? theme.text : 'text-white'
                  }`}>
                    {req.name.replace(/\.md$/, '')}
                  </span>

                  {/* Progress bar for running tasks */}
                  {req.status.type === 'running' && (
                    <div className="w-12 h-1 bg-blue-500/20 rounded-full overflow-hidden shrink-0">
                      <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
