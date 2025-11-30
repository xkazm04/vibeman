/**
 * DualBatchPanel Component Stories
 *
 * Demonstrates all visual states and interactions of the DualBatchPanel component.
 * Shows batch management, progress tracking, and queue visualization.
 */

'use client';

import React, { useState } from 'react';
import DualBatchPanel from '../../components/DualBatchPanel';
import {
  createMockRequirementsForProject,
  createBatchExecutionScenario,
  createIdleBatch,
  createRunningBatch,
  createPausedBatch,
  createCompletedBatch,
  generateRequirementId,
} from '../mockGenerators';
import { getRequirementId, createMockActions } from '../testUtils';
import type { BatchState, BatchId } from '../../store/taskRunnerStore';
import type { ProjectRequirement } from '../../lib/types';

// ============================================================================
// Story Wrapper Component
// ============================================================================

interface StoryWrapperProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function StoryWrapper({ title, description, children }: StoryWrapperProps) {
  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <div className="max-w-4xl">{children}</div>
    </div>
  );
}

// ============================================================================
// Mock Actions
// ============================================================================

const mockActions = createMockActions();

// ============================================================================
// Individual Stories
// ============================================================================

/**
 * No batches created yet
 */
export function NoBatches() {
  const projectId = 'demo-project';
  const requirements = createMockRequirementsForProject(projectId, 5, {
    projectName: 'Demo Project',
  });

  return (
    <StoryWrapper title="No Batches" description="Initial state with no batches created">
      <DualBatchPanel
        batch1={null}
        batch2={null}
        batch3={null}
        batch4={null}
        onStartBatch={mockActions.onStartBatch}
        onPauseBatch={mockActions.onPauseBatch}
        onResumeBatch={mockActions.onResumeBatch}
        onClearBatch={mockActions.onClearBatch}
        onCreateBatch={mockActions.onCreateBatch}
        selectedCount={3}
        requirements={requirements}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Single idle batch
 */
export function SingleIdleBatch() {
  const projectId = 'demo-project';
  const requirements = createMockRequirementsForProject(projectId, 5, {
    projectName: 'Demo Project',
  });

  const taskIds = requirements.map(getRequirementId);
  const batch1 = createIdleBatch(taskIds);

  return (
    <StoryWrapper title="Single Idle Batch" description="One batch created, not started">
      <DualBatchPanel
        batch1={batch1}
        batch2={null}
        batch3={null}
        batch4={null}
        onStartBatch={mockActions.onStartBatch}
        onPauseBatch={mockActions.onPauseBatch}
        onResumeBatch={mockActions.onResumeBatch}
        onClearBatch={mockActions.onClearBatch}
        onCreateBatch={mockActions.onCreateBatch}
        selectedCount={0}
        requirements={requirements}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Running batch with progress
 */
export function RunningBatch() {
  const { requirements, tasks } = createBatchExecutionScenario('batch1');

  // Update requirement statuses based on tasks
  requirements.forEach((req) => {
    const taskId = getRequirementId(req);
    const task = tasks[taskId];
    if (task) {
      req.status = task.status.type === 'running' ? 'running' :
                   task.status.type === 'completed' ? 'completed' :
                   task.status.type === 'failed' ? 'failed' : 'queued';
    }
  });

  const taskIds = Object.keys(tasks);
  const batch1 = createRunningBatch(taskIds, 2, 1);

  return (
    <StoryWrapper
      title="Running Batch"
      description="Batch executing with some completed, one running, some queued"
    >
      <DualBatchPanel
        batch1={batch1}
        batch2={null}
        batch3={null}
        batch4={null}
        onStartBatch={mockActions.onStartBatch}
        onPauseBatch={mockActions.onPauseBatch}
        onResumeBatch={mockActions.onResumeBatch}
        onClearBatch={mockActions.onClearBatch}
        onCreateBatch={mockActions.onCreateBatch}
        selectedCount={0}
        requirements={requirements}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Paused batch
 */
export function PausedBatch() {
  const projectId = 'demo-project';
  const requirements = createMockRequirementsForProject(projectId, 6, {
    projectName: 'Demo Project',
  });

  // Set some as completed, some as queued
  requirements[0].status = 'completed';
  requirements[1].status = 'completed';
  requirements[2].status = 'queued';
  requirements[3].status = 'queued';
  requirements[4].status = 'queued';
  requirements[5].status = 'queued';

  const taskIds = requirements.map(getRequirementId);
  const batch1 = createPausedBatch(taskIds, 2, 0);

  return (
    <StoryWrapper title="Paused Batch" description="Batch paused mid-execution">
      <DualBatchPanel
        batch1={batch1}
        batch2={null}
        batch3={null}
        batch4={null}
        onStartBatch={mockActions.onStartBatch}
        onPauseBatch={mockActions.onPauseBatch}
        onResumeBatch={mockActions.onResumeBatch}
        onClearBatch={mockActions.onClearBatch}
        onCreateBatch={mockActions.onCreateBatch}
        selectedCount={0}
        requirements={requirements}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Completed batch
 */
export function CompletedBatch() {
  const projectId = 'demo-project';
  const requirements = createMockRequirementsForProject(projectId, 5, {
    projectName: 'Demo Project',
  });

  // All completed
  requirements.forEach((req) => {
    req.status = 'completed';
  });

  const taskIds = requirements.map(getRequirementId);
  const batch1 = createCompletedBatch(taskIds, 5, 0);

  return (
    <StoryWrapper title="Completed Batch" description="All tasks completed successfully">
      <DualBatchPanel
        batch1={batch1}
        batch2={null}
        batch3={null}
        batch4={null}
        onStartBatch={mockActions.onStartBatch}
        onPauseBatch={mockActions.onPauseBatch}
        onResumeBatch={mockActions.onResumeBatch}
        onClearBatch={mockActions.onClearBatch}
        onCreateBatch={mockActions.onCreateBatch}
        selectedCount={0}
        requirements={requirements}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Two batches running concurrently
 */
export function TwoBatchesRunning() {
  // First batch
  const proj1Reqs = createMockRequirementsForProject('proj-1', 4, {
    projectName: 'Frontend App',
  });
  proj1Reqs[0].status = 'completed';
  proj1Reqs[1].status = 'running';
  proj1Reqs[2].status = 'queued';
  proj1Reqs[3].status = 'queued';

  const batch1TaskIds = proj1Reqs.map(getRequirementId);
  const batch1 = createRunningBatch(batch1TaskIds, 1, 0);

  // Second batch
  const proj2Reqs = createMockRequirementsForProject('proj-2', 3, {
    projectName: 'API Service',
  });
  proj2Reqs[0].status = 'running';
  proj2Reqs[1].status = 'queued';
  proj2Reqs[2].status = 'queued';

  const batch2TaskIds = proj2Reqs.map(getRequirementId);
  const batch2 = createRunningBatch(batch2TaskIds, 0, 0);

  const allRequirements = [...proj1Reqs, ...proj2Reqs];

  return (
    <StoryWrapper title="Two Batches Running" description="Concurrent batch execution">
      <DualBatchPanel
        batch1={batch1}
        batch2={batch2}
        batch3={null}
        batch4={null}
        onStartBatch={mockActions.onStartBatch}
        onPauseBatch={mockActions.onPauseBatch}
        onResumeBatch={mockActions.onResumeBatch}
        onClearBatch={mockActions.onClearBatch}
        onCreateBatch={mockActions.onCreateBatch}
        selectedCount={0}
        requirements={allRequirements}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * All four batches active
 */
export function AllFourBatches() {
  const allRequirements: ProjectRequirement[] = [];

  // Batch 1 - Running
  const proj1Reqs = createMockRequirementsForProject('proj-1', 3, {
    projectName: 'Frontend App',
  });
  proj1Reqs[0].status = 'completed';
  proj1Reqs[1].status = 'running';
  proj1Reqs[2].status = 'queued';
  const batch1 = createRunningBatch(proj1Reqs.map(getRequirementId), 1, 0);
  allRequirements.push(...proj1Reqs);

  // Batch 2 - Paused
  const proj2Reqs = createMockRequirementsForProject('proj-2', 4, {
    projectName: 'API Service',
  });
  proj2Reqs[0].status = 'completed';
  proj2Reqs[1].status = 'completed';
  proj2Reqs[2].status = 'queued';
  proj2Reqs[3].status = 'queued';
  const batch2 = createPausedBatch(proj2Reqs.map(getRequirementId), 2, 0);
  allRequirements.push(...proj2Reqs);

  // Batch 3 - Idle
  const proj3Reqs = createMockRequirementsForProject('proj-3', 2, {
    projectName: 'Shared Library',
  });
  const batch3 = createIdleBatch(proj3Reqs.map(getRequirementId));
  allRequirements.push(...proj3Reqs);

  // Batch 4 - Completed with failures
  const proj4Reqs = createMockRequirementsForProject('proj-4', 5, {
    projectName: 'Mobile App',
  });
  proj4Reqs[0].status = 'completed';
  proj4Reqs[1].status = 'completed';
  proj4Reqs[2].status = 'completed';
  proj4Reqs[3].status = 'failed';
  proj4Reqs[4].status = 'completed';
  const batch4 = createCompletedBatch(proj4Reqs.map(getRequirementId), 4, 1);
  allRequirements.push(...proj4Reqs);

  return (
    <StoryWrapper title="All Four Batches" description="All batch slots in use with different states">
      <DualBatchPanel
        batch1={batch1}
        batch2={batch2}
        batch3={batch3}
        batch4={batch4}
        onStartBatch={mockActions.onStartBatch}
        onPauseBatch={mockActions.onPauseBatch}
        onResumeBatch={mockActions.onResumeBatch}
        onClearBatch={mockActions.onClearBatch}
        onCreateBatch={mockActions.onCreateBatch}
        selectedCount={0}
        requirements={allRequirements}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

/**
 * Batch with failures
 */
export function BatchWithFailures() {
  const projectId = 'demo-project';
  const requirements = createMockRequirementsForProject(projectId, 6, {
    projectName: 'Demo Project',
  });

  requirements[0].status = 'completed';
  requirements[1].status = 'completed';
  requirements[2].status = 'failed';
  requirements[3].status = 'session-limit';
  requirements[4].status = 'completed';
  requirements[5].status = 'queued';

  const taskIds = requirements.map(getRequirementId);
  const batch1 = createRunningBatch(taskIds, 3, 2);

  return (
    <StoryWrapper title="Batch with Failures" description="Shows failed and session-limit tasks">
      <DualBatchPanel
        batch1={batch1}
        batch2={null}
        batch3={null}
        batch4={null}
        onStartBatch={mockActions.onStartBatch}
        onPauseBatch={mockActions.onPauseBatch}
        onResumeBatch={mockActions.onResumeBatch}
        onClearBatch={mockActions.onClearBatch}
        onCreateBatch={mockActions.onCreateBatch}
        selectedCount={0}
        requirements={requirements}
        getRequirementId={getRequirementId}
      />
    </StoryWrapper>
  );
}

// ============================================================================
// Interactive Demo
// ============================================================================

/**
 * Interactive demo with state management
 */
export function InteractiveDemo() {
  const [batch1, setBatch1] = useState<BatchState | null>(null);
  const [batch2, setBatch2] = useState<BatchState | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  const projectId = 'demo-project';
  const requirements = createMockRequirementsForProject(projectId, 8, {
    projectName: 'Interactive Demo',
  });

  const handleCreateBatch = (batchId: BatchId) => {
    const taskIds = requirements.slice(0, 4).map(getRequirementId);
    const batch = createIdleBatch(taskIds);

    if (batchId === 'batch1') setBatch1(batch);
    else if (batchId === 'batch2') setBatch2(batch);
  };

  const handleStartBatch = (batchId: BatchId) => {
    if (batchId === 'batch1' && batch1) {
      setBatch1(createRunningBatch(batch1.taskIds, 0, 0));
    } else if (batchId === 'batch2' && batch2) {
      setBatch2(createRunningBatch(batch2.taskIds, 0, 0));
    }
  };

  const handlePauseBatch = (batchId: BatchId) => {
    if (batchId === 'batch1' && batch1) {
      setBatch1(createPausedBatch(batch1.taskIds, batch1.completedCount, batch1.failedCount));
    } else if (batchId === 'batch2' && batch2) {
      setBatch2(createPausedBatch(batch2.taskIds, batch2.completedCount, batch2.failedCount));
    }
  };

  const handleClearBatch = (batchId: BatchId) => {
    if (batchId === 'batch1') setBatch1(null);
    else if (batchId === 'batch2') setBatch2(null);
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h2 className="text-lg font-bold text-white mb-4">DualBatchPanel - Interactive Demo</h2>

      {/* Controls */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-32">Selected count:</span>
          <input
            type="range"
            min="0"
            max="8"
            value={selectedCount}
            onChange={(e) => setSelectedCount(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-xs text-gray-300 w-8">{selectedCount}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBatch1(null);
              setBatch2(null);
            }}
            className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Panel */}
      <div className="max-w-4xl">
        <DualBatchPanel
          batch1={batch1}
          batch2={batch2}
          batch3={null}
          batch4={null}
          onStartBatch={handleStartBatch}
          onPauseBatch={handlePauseBatch}
          onResumeBatch={handleStartBatch}
          onClearBatch={handleClearBatch}
          onCreateBatch={handleCreateBatch}
          selectedCount={selectedCount}
          requirements={requirements}
          getRequirementId={getRequirementId}
        />
      </div>

      {/* State Info */}
      <div className="mt-6 p-3 bg-gray-800/50 rounded-lg max-w-4xl">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">Current State</h4>
        <pre className="text-xs text-gray-300 font-mono overflow-x-auto">
          {JSON.stringify(
            {
              batch1: batch1
                ? { status: batch1.status.type, tasks: batch1.taskIds.length }
                : null,
              batch2: batch2
                ? { status: batch2.status.type, tasks: batch2.taskIds.length }
                : null,
              selectedCount,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}

// ============================================================================
// Default Export for Storybook
// ============================================================================

export default {
  title: 'TaskRunner/DualBatchPanel',
  component: DualBatchPanel,
};
