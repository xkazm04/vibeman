'use client';

/**
 * useConductorSync — Polls conductor status from within TaskRunner.
 *
 * Fetches active conductor runs for the current project so the TaskRunner
 * can display compact cards and surface Q&A requests. Polls every 5s when
 * active runs exist, otherwise fetches once on mount and stops.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import type { PipelineRun, ServerRunPayload, PipelineStatus, V3PipelineStage, PipelineStage } from '@/app/features/Conductor/lib/types';

export interface ConductorRunSummary {
  id: string;
  goalTitle: string;
  status: PipelineStatus;
  currentStage: PipelineStage | V3PipelineStage;
  cycle: number;
  pipelineVersion: 2 | 3;
  tasksCompleted: number;
  tasksTotal: number;
  estimatedCost: number;
  startedAt: string;
  /** True if intent refinement questions are pending */
  hasIntentQuestions: boolean;
  /** True if triage checkpoint needs user decisions */
  hasTriageCheckpoint: boolean;
  /** Number of unanswered intent questions */
  intentQuestionCount: number;
  /** Number of triage items awaiting decision */
  triageItemCount: number;
}

interface UseConductorSyncResult {
  runs: ConductorRunSummary[];
  /** True if any run has pending Q&A (intent or triage) */
  hasQA: boolean;
  /** Total number of pending Q&A items across all runs */
  qaCount: number;
  isLoading: boolean;
  /** Manually trigger a re-fetch (e.g. after starting a new run) */
  refresh: () => Promise<void>;
}

function summarizeRun(run: ServerRunPayload): ConductorRunSummary {
  const intentQuestions = run.intent_questions ?? [];
  const hasIntentQuestions = intentQuestions.length > 0 && run.status === 'paused';

  const triageItems = run.triage_data?.items ?? [];
  const triageDecisions = run.triage_data?.decisions ?? [];
  const undecidedTriage = triageItems.filter(
    (item) => !triageDecisions.some((d) => d.itemId === item.id)
  );
  const hasTriageCheckpoint = undecidedTriage.length > 0 && run.status === 'paused';

  return {
    id: run.id,
    goalTitle: run.goalTitle || `Run ${run.id.slice(0, 8)}`,
    status: run.status,
    currentStage: run.currentStage,
    cycle: run.cycle,
    pipelineVersion: run.pipelineVersion ?? 2,
    tasksCompleted: run.metrics?.tasksCompleted ?? 0,
    tasksTotal: (run.metrics?.tasksCompleted ?? 0) + (run.metrics?.tasksFailed ?? 0) + (run.metrics?.tasksCreated ?? 0),
    estimatedCost: run.metrics?.estimatedCost ?? 0,
    startedAt: run.startedAt,
    hasIntentQuestions,
    hasTriageCheckpoint,
    intentQuestionCount: hasIntentQuestions ? intentQuestions.length : 0,
    triageItemCount: hasTriageCheckpoint ? undecidedTriage.length : 0,
  };
}

export function useConductorSync(): UseConductorSyncResult {
  const activeProject = useClientProjectStore((s) => s.activeProject);
  const projectId = activeProject?.id || null;

  const [runs, setRuns] = useState<ConductorRunSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRuns = useCallback(async () => {
    if (!projectId || !mountedRef.current) return;
    try {
      const res = await fetch(`/api/conductor/status?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const serverRuns: ServerRunPayload[] = data.runs
            ? data.runs
            : data.run
              ? [data.run]
              : [];
          if (mountedRef.current) {
            setRuns(serverRuns.map(summarizeRun));
          }
        }
      }
    } catch {
      // Silent fail
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [projectId]);

  // Fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    if (projectId) fetchRuns();
    else { setRuns([]); setIsLoading(false); }
    return () => { mountedRef.current = false; };
  }, [projectId, fetchRuns]);

  // Poll only when active runs exist
  const hasActiveRuns = runs.some(
    (r) => r.status === 'running' || r.status === 'paused' || r.status === 'stopping'
  );

  useEffect(() => {
    if (!projectId || !hasActiveRuns) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(fetchRuns, 5000);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [projectId, hasActiveRuns, fetchRuns]);

  const hasQA = runs.some((r) => r.hasIntentQuestions || r.hasTriageCheckpoint);
  const qaCount = runs.reduce(
    (sum, r) => sum + r.intentQuestionCount + r.triageItemCount,
    0
  );

  // Only return active/recent runs (not completed long ago)
  const activeRuns = useMemo(
    () => runs.filter((r) => r.status !== 'completed' && r.status !== 'failed' && r.status !== 'interrupted'),
    [runs]
  );

  return { runs: activeRuns, hasQA, qaCount, isLoading, refresh: fetchRuns };
}
