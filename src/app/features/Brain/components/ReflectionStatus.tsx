'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useBrainStore } from '@/stores/brainStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { ReflectionTerminal } from './ReflectionTerminal';
import { ReflectionActions } from './ReflectionActions';

interface Props {
  isLoading: boolean;
  scope?: 'project' | 'global';
}

const POLL_INTERVAL_MS = 8000;

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'running' ? 'bg-blue-500/20 text-blue-400'
    : status === 'completed' ? 'bg-green-500/20 text-green-400'
    : status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-700/50 text-zinc-400';
  return (
    <div className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      {status === 'running' ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Running</span>
        : status === 'completed' ? <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Idle</span>
        : status === 'failed' ? <span className="flex items-center gap-1"><XCircle className="w-3 h-3" />Failed</span>
        : 'Idle'}
    </div>
  );
}

export default function ReflectionStatus({ isLoading, scope = 'project' }: Props) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const allProjects = useServerProjectStore((state) => state.projects);
  const {
    reflectionStatus: projectStatus,
    lastReflection,
    decisionsSinceReflection,
    nextThreshold,
    shouldTrigger,
    triggerReason,
    runningReflectionId: projectRunningId,
    requirementName: projectRequirementName,
    globalReflectionStatus,
    lastGlobalReflection,
    globalRunningReflectionId,
    globalRequirementName,
    triggerReflection,
    triggerGlobalReflection,
    cancelReflection,
    fetchReflectionStatus,
    fetchGlobalReflectionStatus,
  } = useBrainStore();

  const reflectionStatus = scope === 'global' ? globalReflectionStatus : projectStatus;
  const runningReflectionId = scope === 'global' ? globalRunningReflectionId : projectRunningId;
  const requirementName = scope === 'global' ? globalRequirementName : projectRequirementName;
  const lastReflectionForDisplay = scope === 'global' ? lastGlobalReflection : lastReflection;

  const refreshStatus = () => {
    if (scope === 'global') fetchGlobalReflectionStatus();
    else if (activeProject?.id) fetchReflectionStatus(activeProject.id);
  };

  // Detect completion transitions
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === 'running' && (reflectionStatus === 'completed' || reflectionStatus === 'failed')) {
      const isSuccess = reflectionStatus === 'completed';
      setCompletionMessage({ type: isSuccess ? 'success' : 'error', text: isSuccess ? 'Reflection completed! Insights updated.' : 'Reflection failed. Check logs.' });
      const timeout = setTimeout(() => setCompletionMessage(null), 8000);
      return () => clearTimeout(timeout);
    }
    prevStatusRef.current = reflectionStatus;
  }, [reflectionStatus]);

  // Fetch on mount + poll while running
  useEffect(() => { refreshStatus(); }, [scope, activeProject?.id]);
  useEffect(() => {
    if (reflectionStatus !== 'running') return;
    pollRef.current = setInterval(refreshStatus, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [reflectionStatus, scope, activeProject?.id]);

  const handleTrigger = async () => {
    setIsTriggering(true);
    setCompletionMessage(null);
    try {
      if (scope === 'global') {
        const projects = allProjects.map(p => ({ id: p.id, name: p.name, path: p.path }));
        const workspacePath = projects[0]?.path?.replace(/[/\\][^/\\]+$/, '') || '.';
        await triggerGlobalReflection(projects, workspacePath);
      } else {
        if (!activeProject) return;
        await triggerReflection(activeProject.id, activeProject.name, activeProject.path);
      }
    } finally {
      setIsTriggering(false);
    }
  };

  const handleCancel = async () => {
    if (!activeProject && scope !== 'global') return;
    await cancelReflection(scope === 'global' ? '__global__' : activeProject!.id);
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Reflection Agent</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-8 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  const progress = nextThreshold > 0 ? Math.min((decisionsSinceReflection / nextThreshold) * 100, 100) : 0;
  const isRunning = reflectionStatus === 'running';
  const lastDate = lastReflectionForDisplay?.completed_at || null;
  const formattedDate = !lastDate ? 'Never' : (() => {
    const diffDays = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
    return diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : diffDays < 7 ? `${diffDays} days ago` : new Date(lastDate).toLocaleDateString();
  })();

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">
            {scope === 'global' ? 'Global Reflection' : 'Reflection Agent'}
          </h2>
        </div>
        <StatusBadge status={reflectionStatus} />
      </div>

      {completionMessage && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          completionMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {completionMessage.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
          <span className={`text-sm ${completionMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
            {completionMessage.text}
          </span>
          <button onClick={() => setCompletionMessage(null)} className="ml-auto text-xs text-zinc-500 hover:text-zinc-300">Dismiss</button>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
        <Clock className="w-4 h-4" />
        <span>Last {scope === 'global' ? 'global ' : ''}reflection: {formattedDate}</span>
      </div>

      <ReflectionTerminal
        scope={scope}
        reflectionStatus={reflectionStatus}
        requirementName={requirementName}
        runningReflectionId={runningReflectionId}
        activeProject={activeProject}
        allProjects={allProjects}
        onStatusRefresh={refreshStatus}
      />

      <ReflectionActions
        isRunning={isRunning}
        isTriggering={isTriggering}
        shouldTrigger={shouldTrigger}
        scope={scope}
        progress={progress}
        decisionsSinceReflection={decisionsSinceReflection}
        nextThreshold={nextThreshold}
        triggerReason={triggerReason}
        onTrigger={handleTrigger}
        onCancel={handleCancel}
      />
    </div>
  );
}
