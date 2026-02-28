/**
 * TaskRunner Mock Data Generators
 *
 * Factory functions for generating realistic mock data for TaskRunner components.
 * Use these generators for testing, Storybook stories, and development.
 */

import type { ProjectRequirement } from '../lib/types';
import type { TaskState } from '../store/taskRunnerStore';
import {
  createIdleStatus,
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
  type TaskStatusUnion,
} from '../lib/types';

// ============================================================================
// ID Generators
// ============================================================================

let idCounter = 0;

/**
 * Generate a unique ID for testing
 */
export function generateId(prefix = 'mock'): string {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}

/**
 * Generate a unique project ID
 */
export function generateProjectId(): string {
  return generateId('project');
}

/**
 * Generate a composite requirement ID (projectId:requirementName)
 */
export function generateRequirementId(projectId: string, requirementName: string): string {
  return `${projectId}:${requirementName}`;
}

// ============================================================================
// Requirement Generators
// ============================================================================

export interface MockRequirementOptions {
  projectId?: string;
  projectName?: string;
  projectPath?: string;
  requirementName?: string;
  status?: ProjectRequirement['status'];
  taskId?: string;
}

/**
 * Generate a single mock requirement
 */
export function createMockRequirement(options: MockRequirementOptions = {}): ProjectRequirement {
  const projectId = options.projectId ?? generateProjectId();
  const requirementName = options.requirementName ?? `requirement-${generateId()}`;

  return {
    projectId,
    projectName: options.projectName ?? `Project ${projectId.slice(-4)}`,
    projectPath: options.projectPath ?? `/projects/${projectId}`,
    requirementName,
    status: options.status ?? createIdleStatus(),
    taskId: options.taskId,
  };
}

/**
 * Generate multiple mock requirements for a project
 */
export function createMockRequirementsForProject(
  projectId: string,
  count: number,
  options: Partial<MockRequirementOptions> = {}
): ProjectRequirement[] {
  const projectName = options.projectName ?? `Project ${projectId.slice(-4)}`;
  const projectPath = options.projectPath ?? `/projects/${projectId}`;

  return Array.from({ length: count }, (_, i) => {
    return createMockRequirement({
      projectId,
      projectName,
      projectPath,
      requirementName: `requirement-${i + 1}`,
      ...options,
    });
  });
}

/**
 * Generate requirements across multiple projects
 */
export function createMockRequirementsByProject(
  projectConfigs: Array<{ projectId?: string; projectName?: string; count: number }>
): ProjectRequirement[] {
  return projectConfigs.flatMap((config) => {
    const projectId = config.projectId ?? generateProjectId();
    return createMockRequirementsForProject(projectId, config.count, {
      projectName: config.projectName,
    });
  });
}

// ============================================================================
// Status Scenarios
// ============================================================================

/**
 * Create requirements with mixed statuses for testing status display
 */
export function createMixedStatusRequirements(projectId?: string): ProjectRequirement[] {
  const id = projectId ?? generateProjectId();
  const statuses: Array<{ status: ProjectRequirement['status']; label: string }> = [
    { status: createIdleStatus(), label: 'idle' },
    { status: createQueuedStatus(), label: 'queued' },
    { status: createRunningStatus(), label: 'running' },
    { status: createCompletedStatus(), label: 'completed' },
    { status: createFailedStatus('Mock error'), label: 'failed' },
    { status: createFailedStatus('Session limit reached', Date.now(), true), label: 'session-limit' },
  ];

  return statuses.map(({ status, label }, i) => {
    return createMockRequirement({
      projectId: id,
      requirementName: `${label}-requirement-${i}`,
      status,
    });
  });
}

// ============================================================================
// Task State Generators
// ============================================================================

export interface MockTaskOptions {
  id?: string;
  status?: TaskStatusUnion;
}

/**
 * Create a mock task state
 */
export function createMockTaskState(options: MockTaskOptions = {}): TaskState {
  return {
    id: options.id ?? generateId('task'),
    status: options.status ?? createQueuedStatus(),
  };
}

/**
 * Create a queued task
 */
export function createQueuedTask(id: string): TaskState {
  return createMockTaskState({
    id,
    status: createQueuedStatus(),
  });
}

/**
 * Create a running task
 */
export function createRunningTask(id: string, progress?: number): TaskState {
  return createMockTaskState({
    id,
    status: createRunningStatus(Date.now() - 30000, progress),
  });
}

/**
 * Create a completed task
 */
export function createCompletedTask(id: string, duration?: number): TaskState {
  return createMockTaskState({
    id,
    status: createCompletedStatus(Date.now(), duration ?? 45000),
  });
}

/**
 * Create a failed task
 */
export function createFailedTask(
  id: string,
  error = 'Mock error',
  isSessionLimit = false
): TaskState {
  return createMockTaskState({
    id,
    status: createFailedStatus(error, Date.now(), isSessionLimit),
  });
}

// ============================================================================
// Complete Scenario Generators
// ============================================================================

/**
 * Create a complete TaskRunner scenario for testing
 */
export function createTaskRunnerScenario(): {
  requirements: ProjectRequirement[];
  tasks: Record<string, TaskState>;
  selectedRequirements: Set<string>;
} {
  // Create requirements from 3 projects
  const project1Reqs = createMockRequirementsForProject('proj-1', 5, {
    projectName: 'Frontend App',
  });
  const project2Reqs = createMockRequirementsForProject('proj-2', 3, {
    projectName: 'API Service',
  });
  const project3Reqs = createMockRequirementsForProject('proj-3', 4, {
    projectName: 'Shared Library',
  });

  const requirements = [...project1Reqs, ...project2Reqs, ...project3Reqs];

  const taskIds = requirements.slice(0, 4).map((r) => `${r.projectId}:${r.requirementName}`);

  const tasks: Record<string, TaskState> = {};
  tasks[taskIds[0]] = createCompletedTask(taskIds[0]);
  tasks[taskIds[1]] = createRunningTask(taskIds[1]);
  tasks[taskIds[2]] = createQueuedTask(taskIds[2]);
  tasks[taskIds[3]] = createQueuedTask(taskIds[3]);

  // Update requirement statuses
  requirements[0].status = createCompletedStatus();
  requirements[1].status = createRunningStatus();
  requirements[2].status = createQueuedStatus();
  requirements[3].status = createQueuedStatus();

  // Select some requirements
  const selectedRequirements = new Set<string>([
    `${requirements[5].projectId}:${requirements[5].requirementName}`,
    `${requirements[6].projectId}:${requirements[6].requirementName}`,
  ]);

  return {
    requirements,
    tasks,
    selectedRequirements,
  };
}

/**
 * Create an empty state scenario
 */
export function createEmptyScenario(): {
  requirements: ProjectRequirement[];
  tasks: Record<string, TaskState>;
  selectedRequirements: Set<string>;
} {
  return {
    requirements: [],
    tasks: {},
    selectedRequirements: new Set(),
  };
}
