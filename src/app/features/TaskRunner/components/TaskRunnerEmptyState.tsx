/**
 * TaskRunnerEmptyState
 *
 * Shared empty-state treatment for TaskRunner surfaces (requirement grid,
 * Kanban columns). Mirrors the SessionSidebar empty-state pattern: a centered
 * icon followed by a title and helper subtext, with an optional action slot.
 */

'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface TaskRunnerEmptyStateProps {
  /** Lucide icon component rendered above the title. */
  icon: LucideIcon;
  /** Primary one-line message. */
  title: string;
  /** Optional helper subtext shown beneath the title. */
  subtitle?: string;
  /** Optional action element (e.g. a button or link) shown beneath the text. */
  action?: React.ReactNode;
  /** Optional extra classes applied to the wrapper. */
  className?: string;
}

function TaskRunnerEmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
  className = '',
}: TaskRunnerEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 text-center ${className}`}>
      <Icon className="w-8 h-8 text-gray-700 mb-2" />
      <p className="text-xs text-gray-500">{title}</p>
      {subtitle && (
        <p className="text-2xs text-gray-600 mt-1">{subtitle}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export default TaskRunnerEmptyState;
