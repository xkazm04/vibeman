/**
 * Conductor Backend Provider
 *
 * Adapts the existing Conductor pipeline orchestrator to the unified executor interface.
 * Handles Scout → Triage → Batch → Execute → Review workflow.
 */

import type {
  ExecutionBackendProvider,
  ExecutionTask,
  ExecutionConfig,
  ExecutionStatus,
} from '../types';

/**
 * Conductor backend provider.
 * Routes scan/triage/batch tasks to the Conductor pipeline.
 * Uses /api/conductor endpoints for communication (works from both client and server).
 */
export class ConductorBackendProvider implements ExecutionBackendProvider {
  readonly backend = 'conductor' as const;

  canHandle(taskType: string, _backend?: string): boolean {
    // Conductor handles these task types
    const supportedTypes = [
      'scan',        // Full scan pipeline
      'triage',      // Triage stage only
      'batch',       // Batch selection stage
      'execute',     // Execute stage only
      'review',      // Review results stage
      'full-pipeline' // Scout through Review
    ];
    return supportedTypes.includes(taskType);
  }

  async submit<T>(config: ExecutionConfig<T>): Promise<string> {
    const { taskType, payload, projectId, sourceId, timeout } = config;

    // Map task types to start stage (all start from scout unless specified)
    let startStage = 'scout';
    switch (taskType) {
      case 'triage': startStage = 'triage'; break;
      case 'batch': startStage = 'batch'; break;
      case 'execute': startStage = 'execute'; break;
      case 'review': startStage = 'review'; break;
      case 'full-pipeline':
      case 'scan':
      default: startStage = 'scout'; break;
    }

    // Call the /api/conductor/run endpoint
    const response = await fetch('/api/conductor/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        projectId: projectId || 'default',
        sourceId,
        startStage,
        timeout,
        config: payload,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Conductor submission failed: ${error}`);
    }

    const result = await response.json();
    return result.runId || result.id;
  }

  async getStatus<T>(executionId: string): Promise<ExecutionTask<T> | null> {
    // Call the /api/conductor/status endpoint
    try {
      const response = await fetch(`/api/conductor/status?runId=${executionId}`);
      if (!response.ok) return null;

      const run = await response.json();
      return {
        id: run.id,
        backend: 'conductor',
        taskType: 'scan',
        status: (run.status || 'running') as ExecutionStatus,
        createdAt: run.started_at ? new Date(run.started_at).getTime() : Date.now(),
        lastUpdate: Date.now(),
        progress: {
          phase: run.current_stage,
          message: `Current stage: ${run.current_stage}`,
        },
        result: run as T,
      } as ExecutionTask<T>;
    } catch {
      return null;
    }
  }

  async cancel(executionId: string): Promise<void> {
    // Call /api/conductor/run with stop action
    try {
      await fetch('/api/conductor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          runId: executionId,
        }),
      });
    } catch (error) {
      console.error('Failed to cancel Conductor run:', error);
    }
  }

  async listRecent(options?: {
    limit?: number;
    status?: ExecutionStatus;
  }): Promise<ExecutionTask[]> {
    // Call the /api/conductor/history endpoint
    try {
      const response = await fetch(
        `/api/conductor/history?limit=${options?.limit || 20}`
      );
      if (!response.ok) return [];

      const runs = await response.json();
      return (Array.isArray(runs) ? runs : runs.runs || []).map((run: any) => ({
        id: run.id,
        backend: 'conductor',
        taskType: 'scan',
        status: (run.status || 'completed') as ExecutionStatus,
        createdAt: run.started_at ? new Date(run.started_at).getTime() : Date.now(),
        lastUpdate: run.ended_at ? new Date(run.ended_at).getTime() : Date.now(),
        progress: { message: `Final stage: ${run.current_stage}` },
      }));
    } catch {
      return [];
    }
  }
}

/**
 * Create and register the Conductor backend provider.
 */
export function createConductorBackend(): ConductorBackendProvider {
  return new ConductorBackendProvider();
}
