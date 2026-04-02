'use client';

import React, { useState, useCallback } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCLISessionStore, type CLISessionId } from '@/components/cli/store/cliSessionStore';
import { executeNextTask } from '@/components/cli/store/cliExecutionManager';
import { SESSION_IDS } from '@/app/features/TaskRunner/lib/taskRunnerConfig';
import { createQueuedStatus } from '@/app/features/TaskRunner/lib/types';
import type { QueuedTask } from '@/components/cli/types';

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

  const projectId = activeProject?.id;

  // Real CLI session store — same 4 sessions as TaskRunner
  const sessions = useCLISessionStore(s => s.sessions);
  const addTasksToSession = useCLISessionStore(s => s.addTasksToSession);
  const setAutoStart = useCLISessionStore(s => s.setAutoStart);
  const setRunning = useCLISessionStore(s => s.setRunning);
  const initSession = useCLISessionStore(s => s.initSession);
  const clearSession = useCLISessionStore(s => s.clearSession);

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
      } catch {
        return { requirements: [] };
      }
    },
    enabled: projects.length > 0,
    refetchInterval: 15000,
  });
  const requirements = reqsData?.requirements || [];

  const toggleReq = useCallback((key: string) => {
    setSelectedReqs(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }, []);

  // Assign selected requirements to free CLI sessions — real TaskRunner pattern
  const assignSelected = useCallback(() => {
    if (selectedReqs.size === 0) return;

    const reqs = Array.from(selectedReqs)
      .map(key => requirements.find(r => `${r.projectId}:${r.name}` === key))
      .filter(Boolean) as RequirementFile[];

    // Find free sessions
    const freeSessions = SESSION_IDS.filter(id => {
      const s = sessions[id];
      return !s.isRunning && s.queue.length === 0;
    });

    // Distribute requirements across free sessions (round-robin)
    let sessionIdx = 0;
    for (const req of reqs) {
      const targetSessionId = freeSessions[sessionIdx % Math.max(freeSessions.length, 1)] || SESSION_IDS[0];

      // Init session with project path if not already set
      if (!sessions[targetSessionId].projectPath) {
        initSession(targetSessionId, req.projectPath);
      }

      const task: QueuedTask = {
        id: `${req.projectId}:${req.name}:${Date.now()}`,
        projectId: req.projectId,
        projectPath: req.projectPath,
        projectName: req.projectName,
        requirementName: req.name,
        status: createQueuedStatus(),
        addedAt: Date.now(),
      };

      addTasksToSession(targetSessionId, [task]);
      setAutoStart(targetSessionId, true);
      setRunning(targetSessionId, true);
      executeNextTask(targetSessionId);

      sessionIdx++;
    }

    setSelectedReqs(new Set());
    queryClient.invalidateQueries({ queryKey: ['mini-requirements', projectId] });
  }, [selectedReqs, requirements, sessions, initSession, addTasksToSession, setAutoStart, setRunning, projectId, queryClient]);

  // Derive session stats
  const sessionList = SESSION_IDS.map(id => sessions[id]);
  const runningSessions = sessionList.filter(s => s.isRunning);
  const busySessions = sessionList.filter(s => s.queue.length > 0 || s.isRunning);
  const freeSessions = sessionList.filter(s => !s.isRunning && s.queue.length === 0);

  const panelStatus = runningSessions.length > 0 ? 'active'
    : busySessions.length > 0 ? 'active'
    : 'idle';

  const statusDot = (
    <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
      panelStatus === 'idle' ? 'bg-white/20'
        : 'bg-cyan-400 shadow-[0_0_8px_3px_rgba(34,211,238,0.6)]'
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
          <div className="flex gap-2 text-sm">
            <span className="text-white">{freeSessions.length} free</span>
            {runningSessions.length > 0 && <span className="text-cyan-300">{runningSessions.length} running</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
        {SESSION_IDS.map(id => {
          const s = sessions[id];
          const currentTask = s.queue.find(t => t.status.type === 'running');
          const queuedCount = s.queue.filter(t => t.status.type === 'queued').length;
          const completedCount = s.completedCount;
          const slotNum = id.replace('cliSession', '');

          return (
            <div key={id} className={`flex items-center gap-2 px-2.5 py-2 rounded border ${
              s.isRunning ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-white/[0.02] border-white/8'
            }`}>
              {/* Status dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                s.isRunning ? 'bg-cyan-400 shadow-[0_0_6px_2px_rgba(34,211,238,0.5)]'
                  : s.queue.length > 0 ? 'bg-amber-400'
                  : completedCount > 0 ? 'bg-emerald-400'
                  : 'bg-white/20'
              }`} />

              {/* Session info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">S{slotNum}</span>
                  {queuedCount > 0 && <span className="text-sm text-cyan-300">+{queuedCount}</span>}
                  {completedCount > 0 && !s.isRunning && <span className="text-sm text-emerald-300">{completedCount} done</span>}
                </div>
                {currentTask && (
                  <span className="text-sm text-white truncate block">
                    {currentTask.requirementName.replace(/\.md$/, '')}
                  </span>
                )}
              </div>

              {/* Clear button for non-running sessions with history */}
              {!s.isRunning && (completedCount > 0 || s.queue.length > 0) && (
                <button
                  onClick={() => clearSession(id)}
                  className="text-sm text-white hover:text-red-300 transition-colors shrink-0"
                  title="Clear session"
                >
                  x
                </button>
              )}
            </div>
          );
        })}
        </div>
      </div>

      {/* ═══ B) Assign button — middle ═══ */}
      <div className="shrink-0 py-2">
        <button
          onClick={assignSelected}
          disabled={selectedReqs.size === 0 || freeSessions.length === 0}
          className="w-full py-2 rounded text-sm font-semibold bg-cyan-600/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-600/30 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          Assign{selectedReqs.size > 0 ? ` (${selectedReqs.size})` : ''}{freeSessions.length === 0 ? ' — no free slots' : ''}
        </button>
      </div>

      {/* ═══ C) Buffer column — bottom ═══ */}
      <div className="overflow-y-auto" style={{ minHeight: '200px', maxHeight: '320px' }}>
        {reqsLoading ? (
          <div className="flex items-center justify-center py-4 text-white text-sm">Loading...</div>
        ) : requirements.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-white text-sm">
            {projectId ? 'No requirement files' : 'Select project'}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {requirements.map(req => {
              const key = `${req.projectId}:${req.name}`;
              const isSelected = selectedReqs.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleReq(key)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded text-left transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-cyan-500/10 border border-cyan-500/30'
                      : 'bg-white/[0.02] border border-transparent hover:border-white/10 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm border shrink-0 transition-colors ${
                    isSelected ? 'bg-cyan-500 border-cyan-400' : 'border-white/25'
                  }`} />
                  <span className="text-sm text-white truncate flex-1">
                    {req.name.replace(/\.md$/, '')}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
