'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Square,
} from 'lucide-react';
import { transition, hover as hoverPresets, tap, pulse, fadeSlideUp } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useBrainStore } from '@/stores/brainStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { ReflectionTerminal } from './ReflectionTerminal';
import GlowCard from './GlowCard';
import BrainPanelHeader from './BrainPanelHeader';
import { usePolling } from '@/hooks/usePolling';
import { useReflectionTrigger } from '@/hooks/useReflectionTrigger';

interface Props {
  isLoading: boolean;
  scope?: 'project' | 'global';
}

// SSE handles the fast path for completion detection — polling is a fallback only
const POLL_INITIAL_MS = 8000;
const POLL_MAX_MS = 60000;

const ACCENT_COLOR = '#a855f7'; // Purple
const GLOW_COLOR = 'rgba(168, 85, 247, 0.15)';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function StatusBadge({ status, elapsedSec, prefersReduced }: { status: string; elapsedSec?: number; prefersReduced?: boolean }) {
  const config = status === 'running'
    ? { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', icon: Loader2, spin: true, text: 'Running' }
    : status === 'completed'
    ? { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399', icon: CheckCircle, spin: false, text: 'Idle' }
    : status === 'failed'
    ? { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171', icon: XCircle, spin: false, text: 'Failed' }
    : { bg: 'rgba(113, 113, 122, 0.15)', border: 'rgba(113, 113, 122, 0.3)', color: '#a1a1aa', icon: Clock, spin: false, text: 'Idle' };

  const Icon = config.icon;

  const badge = (
    <div
      className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        boxShadow: status === 'running' ? `0 0 15px ${config.border}` : undefined
      }}
    >
      <Icon className={`w-3.5 h-3.5 ${config.spin ? 'animate-spin' : ''}`} />
      {config.text}
      {status === 'running' && elapsedSec !== undefined && (
        <span className="ml-1.5 text-blue-300/70 tabular-nums">{formatElapsed(elapsedSec)}</span>
      )}
    </div>
  );

  if (status === 'running') {
    const glowProps = pulse.glow(config.border);
    return (
      <motion.div
        className="relative"
        initial={false}
      >
        {/* Pulsing ring */}
        {!prefersReduced && (
          <motion.div
            className="absolute inset-0 rounded-lg"
            style={{ border: `1.5px solid ${config.border}` }}
            animate={glowProps.animate}
            transition={glowProps.transition}
          />
        )}
        {badge}
      </motion.div>
    );
  }

  return badge;
}

export default function ReflectionStatus({ isLoading, scope = 'project' }: Props) {
  const prefersReduced = useReducedMotion();
  const [completionMessage, setCompletionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const prevStatusRef = useRef<string | null>(null);
  const runStartRef = useRef<number>(Date.now());

  const activeProject = useClientProjectStore((state) => state.activeProject);
  const allProjects = useServerProjectStore((state) => state.projects);
  const {
    cancelReflection,
    fetchReflectionStatus,
    fetchGlobalReflectionStatus,
  } = useBrainStore();
  const scopeState = useBrainStore((s) => s.reflections[scope]);

  const {
    status: reflectionStatus,
    lastReflection: lastReflectionForDisplay,
    runningReflectionId,
    promptContent,
    decisionsSinceReflection,
    nextThreshold,
    shouldTrigger,
    triggerReason,
  } = scopeState;

  // Unified reflection trigger hook
  const {
    trigger,
    status: triggerStatus,
    isActive: isTriggering,
  } = useReflectionTrigger({
    scope,
    project:
      scope === 'project' && activeProject
        ? {
            projectId: activeProject.id,
            projectName: activeProject.name,
            projectPath: activeProject.path,
          }
        : undefined,
    global:
      scope === 'global'
        ? {
            projects: allProjects.map(p => ({ id: p.id, name: p.name, path: p.path })),
            workspacePath: allProjects[0]?.path?.replace(/[/\\][^/\\]+$/, '') || '.',
          }
        : undefined,
    onSuccess: () => {
      // Success feedback is handled by the completion message effect below
    },
    onError: (error) => {
      setCompletionMessage({
        type: 'error',
        text: error,
      });
      const timeout = setTimeout(() => setCompletionMessage(null), 8000);
      return () => clearTimeout(timeout);
    },
  });

  const refreshStatus = () => {
    if (scope === 'global') fetchGlobalReflectionStatus();
    else if (activeProject?.id) fetchReflectionStatus(activeProject.id);
  };

  // Fetch on mount
  useEffect(() => {
    refreshStatus();
  }, [scope, activeProject?.id]);

  // Unified polling with exponential backoff when running
  const isRunning = reflectionStatus === 'running';

  usePolling(refreshStatus, {
    enabled: isRunning,
    intervalMs: POLL_INITIAL_MS,
    immediate: false,
    backoff: { strategy: 'exponential', maxIntervalMs: POLL_MAX_MS },
  });

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

  // Elapsed timer while running
  useEffect(() => {
    if (reflectionStatus === 'running') {
      runStartRef.current = Date.now();
      setElapsedSec(0);
      const interval = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - runStartRef.current) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSec(0);
    }
  }, [reflectionStatus]);

  const handleTrigger = async () => {
    setCompletionMessage(null);
    await trigger();
  };

  const handleCancel = async () => {
    if (!activeProject && scope !== 'global') return;
    await cancelReflection(scope === 'global' ? '__global__' : activeProject!.id);
  };

  if (isLoading) {
    return (
      <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-purple-500/20" animate={false}>
        <div className="p-6">
          <BrainPanelHeader icon={Sparkles} title={scope === 'global' ? 'Global Reflection' : 'Project Reflection'} accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} />
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-8 bg-zinc-800 rounded" />
          </div>
        </div>
      </GlowCard>
    );
  }

  const progress = nextThreshold > 0 ? Math.min((decisionsSinceReflection / nextThreshold) * 100, 100) : 0;
  const lastDate = lastReflectionForDisplay?.completed_at || null;
  const formattedDate = !lastDate ? 'Never' : (() => {
    const diffDays = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
    return diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : diffDays < 7 ? `${diffDays} days ago` : new Date(lastDate).toLocaleDateString();
  })();

  return (
    <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-purple-500/20">
      <div className="p-6">
        {/* Header */}
        <BrainPanelHeader
          icon={Sparkles}
          title={scope === 'global' ? 'Global Reflection' : 'Project Reflection'}
          accentColor={ACCENT_COLOR}
          glowColor={GLOW_COLOR}
          glow
          right={<StatusBadge status={reflectionStatus} elapsedSec={elapsedSec} prefersReduced={prefersReduced} />}
        />

        {/* Completion Message */}
        {completionMessage && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition.deliberate}
            className="mb-4 p-3 rounded-lg flex items-center gap-2"
            style={{
              background: completionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${completionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}
          >
            {completionMessage.type === 'success'
              ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            <span className={`text-sm ${completionMessage.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
              {completionMessage.text}
            </span>
            <button onClick={() => setCompletionMessage(null)} aria-label="Dismiss message" className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 font-mono focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded outline-none">
              [×]
            </button>
          </motion.div>
        )}

        {/* Last Reflection */}
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
          <Clock className="w-4 h-4" />
          <span>Last reflection: <span className="font-mono text-zinc-300">{formattedDate}</span></span>
        </div>

        {/* Progress Bar (only for project scope) */}
        {scope === 'project' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 font-mono">DECISIONS_THRESHOLD</span>
              <span className="text-sm font-mono" style={{ color: ACCENT_COLOR }}>
                {decisionsSinceReflection} / {nextThreshold}
              </span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={prefersReduced ? false : { width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={transition.deliberate}
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)' }}
              />
            </div>
          </div>
        )}

        {/* Trigger Reason Alert */}
        {shouldTrigger && triggerReason && (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={transition.normal}
            className="mb-4 p-3 rounded-lg"
            style={{
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.2)'
            }}
          >
            <p className="text-xs text-purple-300">{triggerReason}</p>
          </motion.div>
        )}

        {/* Terminal (only when running with prompt content) */}
        <ReflectionTerminal
          scope={scope}
          reflectionStatus={reflectionStatus}
          promptContent={promptContent}
          runningReflectionId={runningReflectionId}
          activeProject={activeProject}
          allProjects={allProjects}
          onStatusRefresh={refreshStatus}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          {!isRunning ? (
            <motion.button
              onClick={handleTrigger}
              disabled={isTriggering}
              whileHover={!prefersReduced ? hoverPresets.button : undefined}
              whileTap={!prefersReduced ? tap.press : undefined}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_COLOR}30 0%, ${ACCENT_COLOR}15 100%)`,
                border: `1px solid ${ACCENT_COLOR}40`,
                color: '#e9d5ff',
                boxShadow: `0 0 20px ${GLOW_COLOR}`
              }}
            >
              {isTriggering ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isTriggering ? 'Starting...' : 'Trigger Reflection'}
            </motion.button>
          ) : (
            <motion.button
              onClick={handleCancel}
              whileHover={!prefersReduced ? hoverPresets.button : undefined}
              whileTap={!prefersReduced ? tap.press : undefined}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5'
              }}
            >
              <Square className="w-4 h-4" />
              Cancel
            </motion.button>
          )}
        </div>

        {/* Info Text */}
        <p className="text-xs text-zinc-600 mt-3 font-mono">
          {scope === 'global'
            ? 'Analyzes patterns across all projects.'
            : 'Analyzes accepted/rejected directions to learn preferences.'}
        </p>
      </div>
    </GlowCard>
  );
}
