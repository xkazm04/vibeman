'use client';
import React from 'react';
import { CLIBatchPanel } from '@/components/cli';
import type { ProjectRequirement } from '@/app/features/TaskRunner/lib/types';

const NO_REQUIREMENTS: ProjectRequirement[] = [];
const NO_SELECTION: string[] = [];
const noopId = (r: ProjectRequirement) => r.requirementName;

/**
 * Stale ambient view used when nerdMode is on. Renders only the CLI sessions
 * panel — no conductor row, no kanban/grid, no sidebar, no modals, no
 * ambient background effects. The full layout (and all of its data hooks
 * — useRequirements, useTaskRunnerBatchData, useConductorSync, polling) is
 * unmounted while this view is shown.
 *
 * Sessions still execute: CompactTerminal's SSE handler and autoStart queue
 * draining live inside CLIBatchPanel and continue to run.
 */
const TaskRunnerNerdView = () => {
  return (
    <div className="min-h-full bg-gray-950">
      <div className="max-w-[1600px] mx-auto p-3">
        <CLIBatchPanel
          selectedTaskIds={NO_SELECTION}
          requirements={NO_REQUIREMENTS}
          getRequirementId={noopId}
        />
      </div>
    </div>
  );
};

export default React.memo(TaskRunnerNerdView);
