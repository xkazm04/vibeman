/**
 * TaskRunner Mock Data Generators
 *
 * Factory functions for generating realistic mock data for TaskRunner components.
 * Use these generators for testing, Storybook stories, and development.
 */

import type { ProjectRequirement } from '../lib/types';
import type { BatchState, TaskState, BatchId } from '../store/taskRunnerStore';
import {
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
  createIdleBatchStatus,
  createRunningBatchStatus,
  createPausedBatchStatus,
  createCompletedBatchStatus,
  type TaskStatusUnion,
  type BatchStatusUnion,
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
  batchId?: BatchId | null;
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
    status: options.status ?? 'idle',
    taskId: options.taskId,
    batchId: options.batchId,
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
  const statuses: ProjectRequirement['status'][] = [
    'idle',
    'queued',
    'running',
    'completed',
    'failed',
    'session-limit',
  ];

  return statuses.map((status, i) => {
    return createMockRequirement({
      projectId: id,
      requirementName: `${status}-requirement-${i}`,
      status,
    });
  });
}

/**
 * Create a batch execution scenario
 */
export function createBatchExecutionScenario(batchId: BatchId): {
  requirements: ProjectRequirement[];
  tasks: Record<string, TaskState>;
} {
  const projectId = generateProjectId();
  const requirements: ProjectRequirement[] = [];
  const tasks: Record<string, TaskState> = {};

  // 2 completed
  for (let i = 0; i < 2; i++) {
    const req = createMockRequirement({
      projectId,
      requirementName: `completed-task-${i}`,
      status: 'completed',
      batchId,
    });
    requirements.push(req);
    const taskId = generateRequirementId(req.projectId, req.requirementName);
    tasks[taskId] = {
      id: taskId,
      batchId,
      status: createCompletedStatus(),
    };
  }

  // 1 running
  const runningReq = createMockRequirement({
    projectId,
    requirementName: 'running-task',
    status: 'running',
    batchId,
  });
  requirements.push(runningReq);
  const runningTaskId = generateRequirementId(runningReq.projectId, runningReq.requirementName);
  tasks[runningTaskId] = {
    id: runningTaskId,
    batchId,
    status: createRunningStatus(),
  };

  // 3 queued
  for (let i = 0; i < 3; i++) {
    const req = createMockRequirement({
      projectId,
      requirementName: `queued-task-${i}`,
      status: 'queued',
      batchId,
    });
    requirements.push(req);
    const taskId = generateRequirementId(req.projectId, req.requirementName);
    tasks[taskId] = {
      id: taskId,
      batchId,
      status: createQueuedStatus(),
    };
  }

  // 1 failed
  const failedReq = createMockRequirement({
    projectId,
    requirementName: 'failed-task',
    status: 'failed',
    batchId,
  });
  requirements.push(failedReq);
  const failedTaskId = generateRequirementId(failedReq.projectId, failedReq.requirementName);
  tasks[failedTaskId] = {
    id: failedTaskId,
    batchId,
    status: createFailedStatus('Mock error: Task execution failed'),
  };

  return { requirements, tasks };
}

// ============================================================================
// Batch State Generators
// ============================================================================

export interface MockBatchOptions {
  batchId?: BatchId;
  name?: string;
  taskIds?: string[];
  status?: BatchStatusUnion;
  completedCount?: number;
  failedCount?: number;
}

/**
 * Create a mock batch state
 */
export function createMockBatchState(options: MockBatchOptions = {}): BatchState {
  const batchId = options.batchId ?? 'batch1';
  const taskIds = options.taskIds ?? [];

  return {
    id: generateId('batch'),
    name: options.name ?? `Batch ${batchId.slice(-1)}`,
    taskIds,
    status: options.status ?? createIdleBatchStatus(),
    completedCount: options.completedCount ?? 0,
    failedCount: options.failedCount ?? 0,
  };
}

/**
 * Create an idle batch
 */
export function createIdleBatch(taskIds: string[] = []): BatchState {
  return createMockBatchState({
    taskIds,
    status: createIdleBatchStatus(),
  });
}

/**
 * Create a running batch
 */
export function createRunningBatch(
  taskIds: string[],
  completedCount = 0,
  failedCount = 0
): BatchState {
  return createMockBatchState({
    taskIds,
    status: createRunningBatchStatus(Date.now() - 60000), // Started 1 minute ago
    completedCount,
    failedCount,
  });
}

/**
 * Create a paused batch
 */
export function createPausedBatch(
  taskIds: string[],
  completedCount = 0,
  failedCount = 0
): BatchState {
  const startedAt = Date.now() - 120000; // Started 2 minutes ago
  return createMockBatchState({
    taskIds,
    status: createPausedBatchStatus(startedAt, Date.now() - 30000), // Paused 30 seconds ago
    completedCount,
    failedCount,
  });
}

/**
 * Create a completed batch
 */
export function createCompletedBatch(
  taskIds: string[],
  completedCount: number,
  failedCount = 0
): BatchState {
  const startedAt = Date.now() - 300000; // Started 5 minutes ago
  return createMockBatchState({
    taskIds,
    status: createCompletedBatchStatus(startedAt),
    completedCount,
    failedCount,
  });
}

// ============================================================================
// Task State Generators
// ============================================================================

export interface MockTaskOptions {
  id?: string;
  batchId?: BatchId;
  status?: TaskStatusUnion;
}

/**
 * Create a mock task state
 */
export function createMockTaskState(options: MockTaskOptions = {}): TaskState {
  return {
    id: options.id ?? generateId('task'),
    batchId: options.batchId ?? 'batch1',
    status: options.status ?? createQueuedStatus(),
  };
}

/**
 * Create a queued task
 */
export function createQueuedTask(id: string, batchId: BatchId): TaskState {
  return createMockTaskState({
    id,
    batchId,
    status: createQueuedStatus(),
  });
}

/**
 * Create a running task
 */
export function createRunningTask(id: string, batchId: BatchId, progress?: number): TaskState {
  return createMockTaskState({
    id,
    batchId,
    status: createRunningStatus(Date.now() - 30000, progress), // Started 30 seconds ago
  });
}

/**
 * Create a completed task
 */
export function createCompletedTask(id: string, batchId: BatchId, duration?: number): TaskState {
  return createMockTaskState({
    id,
    batchId,
    status: createCompletedStatus(Date.now(), duration ?? 45000), // Took 45 seconds
  });
}

/**
 * Create a failed task
 */
export function createFailedTask(
  id: string,
  batchId: BatchId,
  error = 'Mock error',
  isSessionLimit = false
): TaskState {
  return createMockTaskState({
    id,
    batchId,
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
  batches: Record<BatchId, BatchState | null>;
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

  // Create batch with some tasks
  const batchTaskIds = requirements.slice(0, 4).map((r) => `${r.projectId}:${r.requirementName}`);

  const tasks: Record<string, TaskState> = {};
  tasks[batchTaskIds[0]] = createCompletedTask(batchTaskIds[0], 'batch1');
  tasks[batchTaskIds[1]] = createRunningTask(batchTaskIds[1], 'batch1');
  tasks[batchTaskIds[2]] = createQueuedTask(batchTaskIds[2], 'batch1');
  tasks[batchTaskIds[3]] = createQueuedTask(batchTaskIds[3], 'batch1');

  // Update requirement statuses
  requirements[0].status = 'completed';
  requirements[1].status = 'running';
  requirements[2].status = 'queued';
  requirements[3].status = 'queued';

  const batches: Record<BatchId, BatchState | null> = {
    batch1: createRunningBatch(batchTaskIds, 1, 0),
    batch2: null,
    batch3: null,
    batch4: null,
  };

  // Select some requirements
  const selectedRequirements = new Set<string>([
    `${requirements[5].projectId}:${requirements[5].requirementName}`,
    `${requirements[6].projectId}:${requirements[6].requirementName}`,
  ]);

  return {
    requirements,
    batches,
    tasks,
    selectedRequirements,
  };
}

/**
 * Create an empty state scenario
 */
export function createEmptyScenario(): {
  requirements: ProjectRequirement[];
  batches: Record<BatchId, BatchState | null>;
  tasks: Record<string, TaskState>;
  selectedRequirements: Set<string>;
} {
  return {
    requirements: [],
    batches: {
      batch1: null,
      batch2: null,
      batch3: null,
      batch4: null,
    },
    tasks: {},
    selectedRequirements: new Set(),
  };
}

/**
 * Create a scenario with all batches active
 */
export function createAllBatchesActiveScenario(): {
  requirements: ProjectRequirement[];
  batches: Record<BatchId, BatchState | null>;
  tasks: Record<string, TaskState>;
} {
  const allRequirements: ProjectRequirement[] = [];
  const allTasks: Record<string, TaskState> = {};
  const batches: Record<BatchId, BatchState | null> = {
    batch1: null,
    batch2: null,
    batch3: null,
    batch4: null,
  };

  const batchIds: BatchId[] = ['batch1', 'batch2', 'batch3', 'batch4'];

  batchIds.forEach((batchId, index) => {
    const projectId = `proj-${index + 1}`;
    const reqs = createMockRequirementsForProject(projectId, 3, {
      projectName: `Project ${index + 1}`,
    });

    const taskIds = reqs.map((r) => `${r.projectId}:${r.requirementName}`);

    // First task completed, second running, third queued
    reqs[0].status = 'completed';
    reqs[1].status = 'running';
    reqs[2].status = 'queued';

    allTasks[taskIds[0]] = createCompletedTask(taskIds[0], batchId);
    allTasks[taskIds[1]] = createRunningTask(taskIds[1], batchId);
    allTasks[taskIds[2]] = createQueuedTask(taskIds[2], batchId);

    allRequirements.push(...reqs);
    batches[batchId] = createRunningBatch(taskIds, 1, 0);
  });

  return {
    requirements: allRequirements,
    batches,
    tasks: allTasks,
  };
}
