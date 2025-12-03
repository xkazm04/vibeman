/**
 * Blueprint Executor
 *
 * Client-side functions for executing blueprints and chains via API.
 */

import { BlueprintComposition, ScanChain, ScanEvidence } from '../types';
import type { ProjectType } from '@/lib/blueprint/types';

// ============================================================================
// Types
// ============================================================================

export interface ExecutionProgress {
  status: 'starting' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  currentStage?: string;
}

export interface BlueprintExecutionResult {
  success: boolean;
  blueprintName: string;
  status: 'success' | 'error' | 'partial';
  duration: number;
  issueCount: number;
  stages: Array<{
    stageName: string;
    stageType: string;
    status: string;
    duration: number;
    outputCount?: number;
    error?: string;
  }>;
  error?: string;
}

export interface ChainExecutionResult {
  success: boolean;
  chainName: string;
  status: 'success' | 'error' | 'partial';
  duration: number;
  totalIssues: number;
  blueprintResults: BlueprintExecutionResult[];
  error?: string;
}

export interface ExecutionOptions {
  projectPath: string;
  projectType: ProjectType;
  projectId?: string;
  verbose?: boolean;
  onProgress?: (progress: ExecutionProgress) => void;
}

// ============================================================================
// Blueprint Execution
// ============================================================================

/**
 * Execute a single blueprint
 */
export async function executeBlueprint(
  composition: BlueprintComposition,
  options: ExecutionOptions
): Promise<BlueprintExecutionResult> {
  const { projectPath, projectType, projectId, verbose, onProgress } = options;

  onProgress?.({
    status: 'starting',
    progress: 0,
    message: 'Starting blueprint execution...',
  });

  if (!composition.analyzer) {
    return {
      success: false,
      blueprintName: composition.name || 'Unknown',
      status: 'error',
      duration: 0,
      issueCount: 0,
      stages: [],
      error: 'No analyzer selected',
    };
  }

  try {
    onProgress?.({
      status: 'running',
      progress: 10,
      message: `Running ${composition.analyzer.name}...`,
      currentStage: composition.analyzer.componentId,
    });

    const response = await fetch('/api/blueprint/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'run-blueprint',
        projectPath,
        projectType,
        projectId,
        verbose,
        blueprint: {
          analyzerId: composition.analyzer.componentId,
          analyzerConfig: composition.analyzerConfig,
          processorIds: composition.processors.map(p => p.componentId),
          processorConfigs: composition.processorConfigs,
          name: composition.name,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const data = await response.json();

    onProgress?.({
      status: data.success ? 'completed' : 'failed',
      progress: 100,
      message: data.success ? 'Blueprint completed' : 'Blueprint failed',
    });

    return {
      success: data.success,
      blueprintName: data.result?.blueprintName || composition.name || 'Unknown',
      status: data.result?.status || 'error',
      duration: data.result?.duration || 0,
      issueCount: data.result?.issues?.length || 0,
      stages: data.result?.stages || [],
      error: data.result?.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    onProgress?.({
      status: 'failed',
      progress: 100,
      message: `Error: ${errorMessage}`,
    });

    return {
      success: false,
      blueprintName: composition.name || 'Unknown',
      status: 'error',
      duration: 0,
      issueCount: 0,
      stages: [],
      error: errorMessage,
    };
  }
}

// ============================================================================
// Chain Execution
// ============================================================================

/**
 * Execute a chain of blueprints
 */
export async function executeChain(
  chain: ScanChain,
  blueprints: BlueprintComposition[],
  options: ExecutionOptions
): Promise<ChainExecutionResult> {
  const { projectPath, projectType, projectId, verbose, onProgress } = options;

  onProgress?.({
    status: 'starting',
    progress: 0,
    message: `Starting chain: ${chain.name}...`,
  });

  // Resolve blueprint IDs to actual compositions
  const orderedBlueprints = chain.blueprints
    .map(id => blueprints.find(bp => bp.id === id))
    .filter((bp): bp is BlueprintComposition => bp !== undefined && bp.analyzer !== null);

  if (orderedBlueprints.length === 0) {
    return {
      success: false,
      chainName: chain.name,
      status: 'error',
      duration: 0,
      totalIssues: 0,
      blueprintResults: [],
      error: 'No valid blueprints in chain',
    };
  }

  try {
    onProgress?.({
      status: 'running',
      progress: 10,
      message: `Executing ${orderedBlueprints.length} blueprints...`,
    });

    const blueprintDefinitions = orderedBlueprints.map(bp => ({
      analyzerId: bp.analyzer!.componentId,
      analyzerConfig: bp.analyzerConfig,
      processorIds: bp.processors.map(p => p.componentId),
      processorConfigs: bp.processorConfigs,
      name: bp.name,
    }));

    const response = await fetch('/api/blueprint/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'run-chain',
        projectPath,
        projectType,
        projectId,
        verbose,
        chainName: chain.name,
        blueprints: blueprintDefinitions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const data = await response.json();

    onProgress?.({
      status: data.success ? 'completed' : 'failed',
      progress: 100,
      message: data.success
        ? `Chain completed: ${data.result?.totalIssues || 0} issues found`
        : 'Chain failed',
    });

    return {
      success: data.success,
      chainName: data.result?.chainName || chain.name,
      status: data.result?.status || 'error',
      duration: data.result?.duration || 0,
      totalIssues: data.result?.totalIssues || 0,
      blueprintResults: (data.result?.blueprintResults || []).map((br: any) => ({
        success: br.status !== 'error',
        blueprintName: br.blueprintName,
        status: br.status,
        duration: br.duration,
        issueCount: br.issues?.length || 0,
        stages: br.stages,
        error: br.error,
      })),
      error: data.result?.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    onProgress?.({
      status: 'failed',
      progress: 100,
      message: `Error: ${errorMessage}`,
    });

    return {
      success: false,
      chainName: chain.name,
      status: 'error',
      duration: 0,
      totalIssues: 0,
      blueprintResults: [],
      error: errorMessage,
    };
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Run a health check on the blueprint system
 */
export async function runHealthCheck(
  projectPath: string,
  projectType: ProjectType = 'nextjs'
): Promise<{
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }>;
}> {
  try {
    const response = await fetch('/api/blueprint/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'health-check',
        projectPath,
        projectType,
      }),
    });

    if (!response.ok) {
      return {
        healthy: false,
        status: 'unhealthy',
        checks: [{ name: 'api-response', status: 'fail', message: `HTTP ${response.status}` }],
      };
    }

    const data = await response.json();

    return {
      healthy: data.result?.status === 'healthy',
      status: data.result?.status || 'unhealthy',
      checks: data.result?.checks || [],
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'unhealthy',
      checks: [{
        name: 'api-connection',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
      }],
    };
  }
}

// ============================================================================
// Evidence Helpers
// ============================================================================

/**
 * Create evidence from a blueprint execution result
 */
export function createEvidenceFromResult(
  result: BlueprintExecutionResult,
  composition: BlueprintComposition
): Omit<ScanEvidence, 'id' | 'timestamp'> {
  return {
    blueprintId: composition.id || 'unknown',
    name: result.blueprintName,
    color: composition.color,
    status: result.status === 'error' ? 'failed' : 'completed',
    progress: 100,
    issueCount: result.issueCount,
  };
}

/**
 * Create evidence entries from a chain execution result
 */
export function createEvidenceFromChainResult(
  result: ChainExecutionResult,
  blueprints: BlueprintComposition[]
): Array<Omit<ScanEvidence, 'id' | 'timestamp'>> {
  return result.blueprintResults.map(br => {
    const composition = blueprints.find(bp => bp.name === br.blueprintName);
    return {
      blueprintId: composition?.id || 'unknown',
      name: br.blueprintName,
      color: composition?.color || '#6366f1',
      status: br.status === 'error' ? 'failed' : 'completed',
      progress: 100,
      issueCount: br.issueCount,
    };
  });
}
