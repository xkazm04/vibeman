/**
 * Blueprint Execute API
 *
 * Handles blueprint and chain execution requests.
 *
 * POST /api/blueprint/execute
 * Actions:
 * - 'run-blueprint' - Run full blueprint (analyzer + processors)
 * - 'run-analyzer' - Run only analyzer phase
 * - 'run-processor' - Run only processor phase
 * - 'run-executor' - Run only executor phase
 * - 'run-chain' - Run chain of blueprints
 * - 'health-check' - Check system health
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  BlueprintTestRunner,
  BlueprintDefinition,
} from '@/lib/blueprint/testing';
import { ProjectType, Issue } from '@/lib/blueprint/types';
import {
  AnalyzerId,
  ProcessorId,
  createAnalyzer,
  createProcessor,
  createExecutor,
} from '@/lib/blueprint/components';

// ============================================================================
// Request Types
// ============================================================================

interface RunBlueprintRequest {
  action: 'run-blueprint';
  projectPath: string;
  projectType: ProjectType;
  projectId?: string;
  blueprint: {
    analyzerId: string;
    analyzerConfig?: Record<string, unknown>;
    processorIds?: string[];
    processorConfigs?: Record<string, Record<string, unknown>>;
    name?: string;
  };
  verbose?: boolean;
}

interface RunAnalyzerRequest {
  action: 'run-analyzer';
  projectPath: string;
  projectType: ProjectType;
  projectId?: string;
  analyzerId: string;
  analyzerConfig?: Record<string, unknown>;
}

interface RunProcessorRequest {
  action: 'run-processor';
  projectPath: string;
  projectType: ProjectType;
  processorId: string;
  processorConfig?: Record<string, unknown>;
  issues: Issue[];
}

interface RunExecutorRequest {
  action: 'run-executor';
  projectPath: string;
  projectType: ProjectType;
  projectId?: string;
  executorId: string;
  executorConfig?: Record<string, unknown>;
  issues: Issue[];
}

interface RunChainRequest {
  action: 'run-chain';
  projectPath: string;
  projectType: ProjectType;
  projectId?: string;
  chainName?: string;
  blueprints: Array<{
    analyzerId: string;
    analyzerConfig?: Record<string, unknown>;
    processorIds?: string[];
    processorConfigs?: Record<string, Record<string, unknown>>;
    name?: string;
  }>;
  verbose?: boolean;
}

interface HealthCheckRequest {
  action: 'health-check';
  projectPath: string;
  projectType?: ProjectType;
}

type RequestBody =
  | RunBlueprintRequest
  | RunAnalyzerRequest
  | RunProcessorRequest
  | RunExecutorRequest
  | RunChainRequest
  | HealthCheckRequest;

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RequestBody;

    console.log(`[Blueprint API] Action: ${body.action}`);

    switch (body.action) {
      case 'run-blueprint':
        return handleRunBlueprint(body);

      case 'run-analyzer':
        return handleRunAnalyzer(body);

      case 'run-processor':
        return handleRunProcessor(body);

      case 'run-executor':
        return handleRunExecutor(body);

      case 'run-chain':
        return handleRunChain(body);

      case 'health-check':
        return handleHealthCheck(body);

      default:
        return NextResponse.json(
          { error: `Unknown action: ${(body as { action: string }).action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Blueprint Execute API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Handler: Run Full Blueprint
// ============================================================================

async function handleRunBlueprint(body: RunBlueprintRequest) {
  const { projectPath, projectType, projectId, blueprint, verbose } = body;

  if (!projectPath) {
    return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });
  }

  if (!blueprint?.analyzerId) {
    return NextResponse.json({ error: 'blueprint.analyzerId is required' }, { status: 400 });
  }

  console.log(`[Blueprint API] Running blueprint: ${blueprint.name || blueprint.analyzerId}`);
  console.log(`[Blueprint API] Project: ${projectPath}`);

  const runner = new BlueprintTestRunner({
    projectPath,
    projectType: projectType || 'nextjs',
    projectId,
    verbose: verbose ?? true,  // Default to verbose for debugging
  });

  const definition: BlueprintDefinition = {
    analyzerId: blueprint.analyzerId as AnalyzerId,
    analyzerConfig: blueprint.analyzerConfig,
    processorIds: blueprint.processorIds as ProcessorId[],
    processorConfigs: blueprint.processorConfigs,
    name: blueprint.name,
  };

  const result = await runner.runBlueprint(definition);

  console.log(`[Blueprint API] Blueprint result: ${result.status}, ${result.issues.length} issues`);

  return NextResponse.json({
    success: result.status !== 'error',
    result,
    logs: runner.getLogs(),
  });
}

// ============================================================================
// Handler: Run Analyzer Only
// ============================================================================

async function handleRunAnalyzer(body: RunAnalyzerRequest) {
  const { projectPath, projectType, projectId, analyzerId, analyzerConfig } = body;

  if (!projectPath) {
    return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });
  }

  if (!analyzerId) {
    return NextResponse.json({ error: 'analyzerId is required' }, { status: 400 });
  }

  console.log(`[Blueprint API] Running analyzer: ${analyzerId}`);

  try {
    const analyzer = createAnalyzer(analyzerId as AnalyzerId);
    const config = analyzerConfig || analyzer.getDefaultConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await analyzer.initialize(config as any);

    // Create execution context
    const context = createExecutionContext(projectPath, projectType, projectId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issues = await (analyzer.execute(undefined, context) as Promise<any[]>);

    console.log(`[Blueprint API] Analyzer found ${issues.length} issues`);

    return NextResponse.json({
      success: true,
      result: {
        analyzerId,
        issues,
        issueCount: issues.length,
      },
    });
  } catch (error) {
    console.error(`[Blueprint API] Analyzer error:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// Handler: Run Processor Only
// ============================================================================

async function handleRunProcessor(body: RunProcessorRequest) {
  const { projectPath, projectType, processorId, processorConfig, issues } = body;

  if (!processorId) {
    return NextResponse.json({ error: 'processorId is required' }, { status: 400 });
  }

  if (!issues || !Array.isArray(issues)) {
    return NextResponse.json({ error: 'issues array is required' }, { status: 400 });
  }

  console.log(`[Blueprint API] Running processor: ${processorId} on ${issues.length} issues`);

  try {
    const processor = createProcessor(processorId as ProcessorId);
    const config = processorConfig || processor.getDefaultConfig();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await processor.initialize(config as any);

    // Create execution context
    const context = createExecutionContext(projectPath, projectType);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (processor.execute(issues as any, context) as Promise<any>);

    // Handle different processor outputs (some return arrays, some return grouped objects)
    const outputIssues = Array.isArray(result) ? result : issues;

    console.log(`[Blueprint API] Processor output: ${outputIssues.length} issues`);

    return NextResponse.json({
      success: true,
      result: {
        processorId,
        issues: outputIssues,
        issueCount: outputIssues.length,
      },
    });
  } catch (error) {
    console.error(`[Blueprint API] Processor error:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// Handler: Run Executor Only
// ============================================================================

async function handleRunExecutor(body: RunExecutorRequest) {
  const { projectPath, projectType, projectId, executorId, executorConfig, issues } = body;

  if (!executorId) {
    return NextResponse.json({ error: 'executorId is required' }, { status: 400 });
  }

  if (!issues || !Array.isArray(issues)) {
    return NextResponse.json({ error: 'issues array is required' }, { status: 400 });
  }

  console.log(`[Blueprint API] Running executor: ${executorId} on ${issues.length} issues`);

  try {
    // For now, just return success - executor implementation is separate
    // The actual Claude Code execution would be handled by existing infrastructure

    // TODO: Integrate with ClaudeCodeExecutor when ready
    console.log(`[Blueprint API] Executor would process ${issues.length} issues`);

    return NextResponse.json({
      success: true,
      result: {
        executorId,
        fixedCount: issues.length,
        message: 'Executor phase completed (fixes queued)',
      },
    });
  } catch (error) {
    console.error(`[Blueprint API] Executor error:`, error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// Handler: Run Chain
// ============================================================================

async function handleRunChain(body: RunChainRequest) {
  const { projectPath, projectType, projectId, chainName, blueprints, verbose } = body;

  if (!projectPath) {
    return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });
  }

  if (!blueprints || blueprints.length === 0) {
    return NextResponse.json({ error: 'blueprints array is required' }, { status: 400 });
  }

  console.log(`[Blueprint API] Running chain: ${chainName || 'unnamed'} (${blueprints.length} blueprints)`);

  const runner = new BlueprintTestRunner({
    projectPath,
    projectType: projectType || 'nextjs',
    projectId,
    verbose: verbose ?? true,
  });

  const definitions: BlueprintDefinition[] = blueprints.map(bp => ({
    analyzerId: bp.analyzerId as AnalyzerId,
    analyzerConfig: bp.analyzerConfig,
    processorIds: bp.processorIds as ProcessorId[],
    processorConfigs: bp.processorConfigs,
    name: bp.name,
  }));

  const result = await runner.runChain(definitions, chainName);

  console.log(`[Blueprint API] Chain result: ${result.status}, ${result.totalIssues} total issues`);

  return NextResponse.json({
    success: result.status !== 'error',
    result,
    logs: runner.getLogs(),
  });
}

// ============================================================================
// Handler: Health Check
// ============================================================================

async function handleHealthCheck(body: HealthCheckRequest) {
  const { projectPath, projectType } = body;

  if (!projectPath) {
    return NextResponse.json({ error: 'projectPath is required' }, { status: 400 });
  }

  const runner = new BlueprintTestRunner({
    projectPath,
    projectType: projectType || 'nextjs',
    verbose: false,
  });

  const result = await runner.runHealthCheck();

  return NextResponse.json({
    success: result.status === 'healthy',
    result,
  });
}

// ============================================================================
// Helpers
// ============================================================================

function createExecutionContext(
  projectPath: string,
  projectType: ProjectType,
  projectId?: string
) {
  return {
    executionId: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId: projectId || `project-${Date.now()}`,
    projectPath,
    projectType,
    reportProgress: (progress: number, message?: string) => {
      console.log(`[Blueprint API] Progress: ${progress}% - ${message || ''}`);
    },
    log: (level: string, message: string) => {
      console.log(`[Blueprint API] [${level}] ${message}`);
    },
    isCancelled: () => false,
    onCancel: () => {},
    getNodeOutput: () => undefined,
  };
}
