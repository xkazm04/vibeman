/**
 * TaskItem Component Stories
 *
 * Demonstrates all visual states and interactions of the TaskItem component.
 * Can be used with Storybook or as standalone visual test cases.
 */

'use client';

import React, { useState } from 'react';
import TaskItem from '../../TaskItem';
import { createMockRequirement } from '../mockGenerators';
import { createMockActions } from '../testUtils';
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
    <div className="p-4 space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <div className="max-w-md">{children}</div>
    </div>
  );
}

// ============================================================================
// Individual Stories
// ============================================================================

/**
 * TaskItem in idle state (default)
 */
export function TaskItemIdle() {
  const [isSelected, setIsSelected] = useState(false);
  const requirement = createMockRequirement({
    requirementName: 'add-user-authentication',
    status: 'idle',
  });

  return (
    <StoryWrapper title="Idle State" description="Default state, selectable">
      <TaskItem
        requirement={requirement}
        isSelected={isSelected}
        onToggleSelect={() => setIsSelected(!isSelected)}
        onDelete={() => console.log('Delete clicked')}
        projectPath={requirement.projectPath}
      />
    </StoryWrapper>
  );
}

/**
 * TaskItem in queued state
 */
export function TaskItemQueued() {
  const requirement = createMockRequirement({
    requirementName: 'implement-caching',
    status: 'queued',
  });

  return (
    <StoryWrapper title="Queued State" description="Waiting in batch queue, not selectable">
      <TaskItem
        requirement={requirement}
        isSelected={false}
        onToggleSelect={() => {}}
        onDelete={() => console.log('Delete clicked')}
        projectPath={requirement.projectPath}
      />
    </StoryWrapper>
  );
}

/**
 * TaskItem in running state
 */
export function TaskItemRunning() {
  const requirement = createMockRequirement({
    requirementName: 'refactor-database-layer',
    status: 'running',
  });

  return (
    <StoryWrapper title="Running State" description="Currently being executed, not selectable">
      <TaskItem
        requirement={requirement}
        isSelected={false}
        onToggleSelect={() => {}}
        onDelete={() => console.log('Delete clicked')}
        projectPath={requirement.projectPath}
      />
    </StoryWrapper>
  );
}

/**
 * TaskItem in completed state
 */
export function TaskItemCompleted() {
  const [isSelected, setIsSelected] = useState(false);
  const requirement = createMockRequirement({
    requirementName: 'fix-login-bug',
    status: 'completed',
  });

  return (
    <StoryWrapper title="Completed State" description="Successfully executed">
      <TaskItem
        requirement={requirement}
        isSelected={isSelected}
        onToggleSelect={() => setIsSelected(!isSelected)}
        onDelete={() => console.log('Delete clicked')}
        projectPath={requirement.projectPath}
      />
    </StoryWrapper>
  );
}

/**
 * TaskItem in failed state
 */
export function TaskItemFailed() {
  const [isSelected, setIsSelected] = useState(false);
  const requirement = createMockRequirement({
    requirementName: 'update-dependencies',
    status: 'failed',
  });

  return (
    <StoryWrapper title="Failed State" description="Execution failed with error">
      <TaskItem
        requirement={requirement}
        isSelected={isSelected}
        onToggleSelect={() => setIsSelected(!isSelected)}
        onDelete={() => console.log('Delete clicked')}
        projectPath={requirement.projectPath}
      />
    </StoryWrapper>
  );
}

/**
 * TaskItem in session-limit state
 */
export function TaskItemSessionLimit() {
  const [isSelected, setIsSelected] = useState(false);
  const requirement = createMockRequirement({
    requirementName: 'large-refactoring-task',
    status: 'session-limit',
  });

  return (
    <StoryWrapper title="Session Limit State" description="Hit Claude session limit">
      <TaskItem
        requirement={requirement}
        isSelected={isSelected}
        onToggleSelect={() => setIsSelected(!isSelected)}
        onDelete={() => console.log('Delete clicked')}
        projectPath={requirement.projectPath}
      />
    </StoryWrapper>
  );
}

/**
 * TaskItem selected state
 */
export function TaskItemSelected() {
  const requirement = createMockRequirement({
    requirementName: 'add-unit-tests',
    status: 'idle',
  });

  return (
    <StoryWrapper title="Selected State" description="Item is selected for batch">
      <TaskItem
        requirement={requirement}
        isSelected={true}
        onToggleSelect={() => {}}
        onDelete={() => console.log('Delete clicked')}
        projectPath={requirement.projectPath}
      />
    </StoryWrapper>
  );
}

/**
 * TaskItem with long requirement name
 */
export function TaskItemLongName() {
  const [isSelected, setIsSelected] = useState(false);
  const requirement = createMockRequirement({
    requirementName: 'implement-user-authentication-with-oauth2-and-social-login-providers',
    status: 'idle',
  });

  return (
    <StoryWrapper title="Long Name" description="Name should be truncated with ellipsis">
      <TaskItem
        requirement={requirement}
        isSelected={isSelected}
        onToggleSelect={() => setIsSelected(!isSelected)}
        onDelete={() => console.log('Delete clicked')}
        projectPath={requirement.projectPath}
      />
    </StoryWrapper>
  );
}

// ============================================================================
// All States Overview
// ============================================================================

/**
 * Shows all TaskItem status variants together
 */
export function AllStatusVariants() {
  const [selections, setSelections] = useState<Set<string>>(new Set());

  const toggleSelection = (name: string) => {
    setSelections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const statuses: ProjectRequirement['status'][] = [
    'idle',
    'queued',
    'running',
    'completed',
    'failed',
    'session-limit',
  ];

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h2 className="text-lg font-bold text-white mb-4">TaskItem - All Status Variants</h2>
      <div className="max-w-md space-y-2">
        {statuses.map((status) => {
          const requirement = createMockRequirement({
            requirementName: `${status}-example-task`,
            status,
          });
          const isSelectable = status !== 'running' && status !== 'queued';

          return (
            <div key={status} className="flex items-center gap-3">
              <span className="w-24 text-xs text-gray-500 font-mono">{status}</span>
              <div className="flex-1">
                <TaskItem
                  requirement={requirement}
                  isSelected={selections.has(status)}
                  onToggleSelect={() => isSelectable && toggleSelection(status)}
                  onDelete={() => console.log('Delete:', status)}
                  projectPath={requirement.projectPath}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Interactive Demo
// ============================================================================

/**
 * Interactive demo with state cycling
 */
export function InteractiveDemo() {
  const [status, setStatus] = useState<ProjectRequirement['status']>('idle');
  const [isSelected, setIsSelected] = useState(false);

  const statuses: ProjectRequirement['status'][] = [
    'idle',
    'queued',
    'running',
    'completed',
    'failed',
    'session-limit',
  ];

  const requirement = createMockRequirement({
    requirementName: 'interactive-demo-task',
    status,
  });

  const isSelectable = status !== 'running' && status !== 'queued';

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h2 className="text-lg font-bold text-white mb-4">TaskItem - Interactive Demo</h2>

      {/* Controls */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-20">Status:</span>
          <div className="flex gap-1 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  status === s
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-20">Selected:</span>
          <button
            onClick={() => isSelectable && setIsSelected(!isSelected)}
            disabled={!isSelectable}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              !isSelectable
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : isSelected
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {isSelected ? 'Yes' : 'No'}
          </button>
          {!isSelectable && (
            <span className="text-xs text-gray-500">(not selectable in this state)</span>
          )}
        </div>
      </div>

      {/* TaskItem Preview */}
      <div className="max-w-md">
        <TaskItem
          requirement={requirement}
          isSelected={isSelected}
          onToggleSelect={() => isSelectable && setIsSelected(!isSelected)}
          onDelete={() => console.log('Delete clicked')}
          projectPath={requirement.projectPath}
        />
      </div>

      {/* State Info */}
      <div className="mt-6 p-3 bg-gray-800/50 rounded-lg max-w-md">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">Current Props</h4>
        <pre className="text-xs text-gray-300 font-mono">
          {JSON.stringify(
            {
              status: requirement.status,
              isSelected,
              isSelectable,
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
  title: 'TaskRunner/TaskItem',
  component: TaskItem,
};
