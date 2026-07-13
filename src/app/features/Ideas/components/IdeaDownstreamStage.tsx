'use client';

/**
 * IdeaDownstreamStage — live "requirement → task → done" indicator (Direction 3).
 *
 * Shown on accepted/implemented idea cards (Buffer + Kanban). The idea→requirement
 * link is DB-backed (idea.requirement_id), so the stage survives reload. The live
 * task status comes from the Claude-Code execution queue, polled per project and
 * shared across cards via one React-Query key. Clicking the chip deep-links into
 * TaskRunner (the 'tasker' module) with the requirement recorded so the user lands
 * pointed at the right work.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, Loader2, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import type { DbIdea } from '@/app/db/models/types';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import {
  resolveDownstreamStage,
  indexTasksByRequirement,
  type DownstreamStageKey,
  type DownstreamTask,
} from '../lib/downstreamStage';

interface StageVisual {
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  spin?: boolean;
}

const STAGE_VISUAL: Record<DownstreamStageKey, StageVisual> = {
  requirement: { icon: FileText, className: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  queued: { icon: Clock, className: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  running: { icon: Loader2, className: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', spin: true },
  done: { icon: CheckCircle2, className: 'text-green-400 bg-green-500/10 border-green-500/30' },
  failed: { icon: AlertTriangle, className: 'text-red-400 bg-red-500/10 border-red-500/30' },
};

async function fetchProjectTasks(projectId: string): Promise<DownstreamTask[]> {
  const res = await fetch(`/api/claude-code/tasks?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) return [];
  const data = await res.json();
  const tasks = (data.tasks ?? []) as Array<{ requirementName?: string; status?: string }>;
  return tasks
    .filter((t): t is DownstreamTask => Boolean(t.requirementName) && Boolean(t.status))
    .map(t => ({ requirementName: t.requirementName!, status: t.status as DownstreamTask['status'] }));
}

/** Shared per-project task query — deduped across every card on the board. */
function useProjectTasks(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['claude-code-tasks', projectId],
    queryFn: () => fetchProjectTasks(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 3000,
    refetchInterval: 5000, // keep the downstream stage live while the board is open
    refetchOnWindowFocus: true,
  });
}

interface IdeaDownstreamStageProps {
  idea: DbIdea;
  /** Compact chip for dense list rows (Buffer). */
  compact?: boolean;
}

const IdeaDownstreamStage = React.memo(function IdeaDownstreamStage({ idea, compact = false }: IdeaDownstreamStageProps) {
  const setActiveModule = useOnboardingStore(s => s.setActiveModule);
  const pushStep = useWorkflowStore(s => s.pushStep);
  const addRecentEntity = useWorkflowStore(s => s.addRecentEntity);

  // Only accepted/implemented ideas have a downstream to show.
  const isRelevant = idea.status === 'accepted' || idea.status === 'implemented';
  const { data: tasks } = useProjectTasks(isRelevant ? idea.project_id : null);

  if (!isRelevant) return null;

  const taskMap = tasks ? indexTasksByRequirement(tasks) : undefined;
  const task = idea.requirement_id ? taskMap?.get(idea.requirement_id) ?? null : null;
  const stage = resolveDownstreamStage(idea, task);
  if (!stage) return null;

  const visual = STAGE_VISUAL[stage.key];
  const Icon = visual.icon;

  const handleDeepLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (idea.requirement_id) {
      addRecentEntity({
        id: idea.requirement_id,
        type: 'requirement',
        name: idea.requirement_id,
        module: 'tasker',
        projectId: idea.project_id,
      });
      pushStep({
        module: 'tasker',
        label: `Requirement: ${idea.requirement_id}`,
        entityId: idea.requirement_id,
        entityType: 'requirement',
        entityName: idea.requirement_id,
        projectId: idea.project_id,
      });
    }
    setActiveModule('tasker');
  };

  const title = idea.requirement_id
    ? `${stage.label} — open "${idea.requirement_id}" in TaskRunner`
    : stage.label;

  return (
    <button
      type="button"
      onClick={handleDeepLink}
      title={title}
      aria-label={title}
      className={`group/stage inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${visual.className} transition-colors hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
        compact ? 'text-micro' : 'text-2xs'
      }`}
      data-testid={`downstream-stage-${idea.id}`}
    >
      <Icon className={`w-3 h-3 ${visual.spin ? 'animate-spin' : ''}`} />
      <span className="font-medium leading-none">{stage.label}</span>
      <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover/stage:opacity-70 transition-opacity" />
    </button>
  );
});

export default IdeaDownstreamStage;
