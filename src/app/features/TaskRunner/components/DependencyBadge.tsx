/**
 * DependencyBadge
 *
 * Small badge shown on TaskItem cards when dependencies exist.
 * - Lock icon + "Blocked" when task has incomplete parents
 * - Link icon + parent count when has deps but all parents are complete
 */

'use client';

import React from 'react';
import { Lock, Link2 } from 'lucide-react';
import { useDependencyStore } from '../store/dependencyStore';
import { useTaskRunnerStore } from '../store/taskRunnerStore';
import { TruncateTooltip } from '@/components/ui/TruncateTooltip';

interface DependencyBadgeProps {
  requirementId: string;
}

export const DependencyBadge = React.memo(function DependencyBadge({
  requirementId,
}: DependencyBadgeProps) {
  const parents = useDependencyStore((s) => s.parentMap[requirementId]);
  const children = useDependencyStore((s) => s.childMap[requirementId]);

  const hasParents = parents && parents.length > 0;
  const hasChildren = children && children.length > 0;
  if (!hasParents && !hasChildren) return null;

  const tasks = useTaskRunnerStore.getState().tasks;
  const taskStatuses: Record<string, { status: { type: string } }> = {};
  for (const [id, task] of Object.entries(tasks)) {
    taskStatuses[id] = { status: task.status };
  }

  const blockingParents = hasParents
    ? parents.filter(pid => {
        const task = taskStatuses[pid];
        return !task || task.status.type !== 'completed';
      })
    : [];
  const isBlocked = blockingParents.length > 0;

  const totalDeps = (parents?.length ?? 0) + (children?.length ?? 0);
  const tooltipText = isBlocked
    ? `Blocked by ${blockingParents.length} incomplete parent${blockingParents.length > 1 ? 's' : ''}`
    : `${totalDeps} dependency link${totalDeps > 1 ? 's' : ''}`;

  return (
    <TruncateTooltip text={tooltipText}>
      <div
        className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-2xs font-medium ${
          isBlocked
            ? 'bg-orange-500/15 text-orange-400'
            : 'bg-purple-500/10 text-purple-400'
        }`}
      >
        {isBlocked ? (
          <Lock className="w-2.5 h-2.5" />
        ) : (
          <Link2 className="w-2.5 h-2.5" />
        )}
        <span>{isBlocked ? blockingParents.length : totalDeps}</span>
      </div>
    </TruncateTooltip>
  );
});
