/**
 * Blueprint Test Runner
 *
 * Server-side test utilities for running blueprints and chains end-to-end.
 * Used for development testing and integration tests.
 *
 * @example
 * ```typescript
 * import { BlueprintTestRunner } from '@/lib/blueprint/testing';
 *
 * // Create test runner
 * const runner = new BlueprintTestRunner({
 *   projectPath: '/path/to/project',
 *   projectType: 'nextjs',
 * });
 *
 * // Run a single blueprint
 * const result = await runner.runBlueprint({
 *   analyzerId: 'analyzer.console',
 *   processorIds: ['processor.filter'],
 * });
 *
 * // Run a chain of blueprints
 * const chainResult = await runner.runChain([
 *   { analyzerId: 'analyzer.console' },
 *   { analyzerId: 'analyzer.any-types' },
 * ]);
 * ```
 */

import { ExecutionContext, Issue, ProjectType, BaseIssue } from '../types';
import {
  createAnalyzer,
  createProcessor,
  AnalyzerId,
  ProcessorId,
} from '../components';

// ============================================================================
// Types
// ============================================================================

export interface BlueprintTestConfig {
  /** Path to the project to analyze */
  projectPath: string;
  /** Project type for analyzer selection */
  projectType: ProjectType;
  /** Project ID for context */
  projectId?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Timeout for each stage in ms */
  stageTimeout?: number;
}

export interface BlueprintDefinition {
  /** Analyzer to use */
  analyzerId: AnalyzerId;
  /** Analyzer configuration override */
  analyzerConfig?: Record<string, unknown>;
  /** Optional processors to chain */
  processorIds?: ProcessorId[];
  /** Processor configurations */
  processorConfigs?: Record<string, Record<string, unknown>>;
  /** Blueprint name for logging */
  name?: string;
}

export interface StageResult {
  stageName: string;
  stageType: 'analyzer' | 'processor' | 'executor';
  status: 'success' | 'error' | 'skipped';
  duration: number;
  inputCount?: number;
  outputCount?: number;
  error?: string;
  output?: unknown;
}

export interface BlueprintTestResult {
  blueprintName: string;
  status: 'success' | 'error' | 'partial';
  duration: number;
  stages: StageResult[];
  issues: Issue[];
  error?: string;
}

export interface ChainTestResult {
  chainName: string;
  status: 'success' | 'error' | 'partial';
  duration: number;
  blueprintResults: BlueprintTestResult[];
  totalIssues: number;
  error?: string;
}

// ============================================================================
// Test Runner Implementation
// ============================================================================

export class BlueprintTestRunner {
  private config: Required<BlueprintTestConfig>;
  private logs: string[] = [];

  constructor(config: BlueprintTestConfig) {
    this.config = {
      projectPath: config.projectPath,
      projectType: config.projectType,
      projectId: config.projectId || `test-${Date.now()}`,
      verbose: config.verbose ?? false,
      stageTimeout: config.stageTimeout ?? 60000,
    };
  }

  /**
   * Run a single blueprint
   */
  async runBlueprint(definition: BlueprintDefinition): Promise<BlueprintTestResult> {
    const startTime = Date.now();
    const stages: StageResult[] = [];
    const blueprintName = definition.name || definition.analyzerId;
    let issues: Issue[] = [];
    let cancelled = false;

    this.log(`Starting blueprint: ${blueprintName}`);

    const context = this.createContext(() => cancelled);

    try {
      // Stage 1: Run analyzer
      const analyzerStart = Date.now();
      this.log(`  [Analyzer] Starting ${definition.analyzerId}...`);

      const analyzer = createAnalyzer(definition.analyzerId);
      const analyzerConfig = definition.analyzerConfig || analyzer.getDefaultConfig();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await analyzer.initialize(analyzerConfig as any);

      const analyzerResult = await this.withTimeout(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        analyzer.execute(undefined, context) as Promise<any[]>,
        this.config.stageTimeout,
        `Analyzer ${definition.analyzerId} timed out`
      );
      issues = analyzerResult as Issue[];

      stages.push({
        stageName: definition.analyzerId,
        stageType: 'analyzer',
        status: 'success',
        duration: Date.now() - analyzerStart,
        outputCount: issues.length,
        output: { sampleIssues: issues.slice(0, 3) },
      });

      this.log(`  [Analyzer] Found ${issues.length} issues in ${Date.now() - analyzerStart}ms`);

      // Stage 2: Run processors
      if (definition.processorIds && definition.processorIds.length > 0) {
        for (const processorId of definition.processorIds) {
          const processorStart = Date.now();
          const inputCount = issues.length;

          this.log(`  [Processor] Starting ${processorId}...`);

          try {
            const processor = createProcessor(processorId);
            const config = definition.processorConfigs?.[processorId] || processor.getDefaultConfig();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await processor.initialize(config as any);

            const processorResult = await this.withTimeout(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              processor.execute(issues as any, context) as Promise<any>,
              this.config.stageTimeout,
              `Processor ${processorId} timed out`
            );
            issues = Array.isArray(processorResult) ? processorResult as Issue[] : issues;

            stages.push({
              stageName: processorId,
              stageType: 'processor',
              status: 'success',
              duration: Date.now() - processorStart,
              inputCount,
              outputCount: issues.length,
            });

            this.log(`  [Processor] Output ${issues.length} issues in ${Date.now() - processorStart}ms`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            stages.push({
              stageName: processorId,
              stageType: 'processor',
              status: 'error',
              duration: Date.now() - processorStart,
              inputCount,
              error: errorMessage,
            });
            this.log(`  [Processor] Error: ${errorMessage}`);
          }
        }
      }

      const result: BlueprintTestResult = {
        blueprintName,
        status: stages.every(s => s.status === 'success') ? 'success' : 'partial',
        duration: Date.now() - startTime,
        stages,
        issues,
      };

      this.log(`Blueprint ${blueprintName} completed: ${result.status} (${result.duration}ms, ${issues.length} issues)`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Blueprint ${blueprintName} failed: ${errorMessage}`);

      return {
        blueprintName,
        status: 'error',
        duration: Date.now() - startTime,
        stages,
        issues: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Run a chain of blueprints sequentially
   */
  async runChain(
    definitions: BlueprintDefinition[],
    chainName?: string
  ): Promise<ChainTestResult> {
    const startTime = Date.now();
    const name = chainName || `chain-${definitions.length}-blueprints`;
    const blueprintResults: BlueprintTestResult[] = [];
    let totalIssues = 0;

    this.log(`Starting chain: ${name} (${definitions.length} blueprints)`);

    try {
      for (let i = 0; i < definitions.length; i++) {
        const definition = definitions[i];
        this.log(`\n[Chain ${i + 1}/${definitions.length}]`);

        const result = await this.runBlueprint(definition);
        blueprintResults.push(result);
        totalIssues += result.issues.length;

        // Stop chain if blueprint failed completely
        if (result.status === 'error') {
          this.log(`Chain stopped due to blueprint error`);
          break;
        }
      }

      const hasErrors = blueprintResults.some(r => r.status === 'error');
      const allSuccess = blueprintResults.every(r => r.status === 'success');

      const result: ChainTestResult = {
        chainName: name,
        status: hasErrors ? 'error' : allSuccess ? 'success' : 'partial',
        duration: Date.now() - startTime,
        blueprintResults,
        totalIssues,
      };

      this.log(`\nChain ${name} completed: ${result.status} (${result.duration}ms, ${totalIssues} total issues)`);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Chain ${name} failed: ${errorMessage}`);

      return {
        chainName: name,
        status: 'error',
        duration: Date.now() - startTime,
        blueprintResults,
        totalIssues,
        error: errorMessage,
      };
    }
  }

  /**
   * Run a quick health check on core components
   */
  async runHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }>;
  }> {
    const checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }> = [];

    // Test analyzer instantiation
    try {
      const analyzer = createAnalyzer('analyzer.console');
      const config = analyzer.getDefaultConfig();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await analyzer.initialize(config as any);
      checks.push({ name: 'analyzer-instantiation', status: 'pass' });
    } catch (error) {
      checks.push({
        name: 'analyzer-instantiation',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    // Test processor instantiation
    try {
      const processor = createProcessor('processor.filter');
      const config = processor.getDefaultConfig();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await processor.initialize(config as any);
      checks.push({ name: 'processor-instantiation', status: 'pass' });
    } catch (error) {
      checks.push({
        name: 'processor-instantiation',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    // Test context creation
    try {
      const context = this.createContext(() => false);
      if (context.projectPath && context.executionId) {
        checks.push({ name: 'context-creation', status: 'pass' });
      } else {
        checks.push({ name: 'context-creation', status: 'fail', message: 'Missing required fields' });
      }
    } catch (error) {
      checks.push({
        name: 'context-creation',
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const failCount = checks.filter(c => c.status === 'fail').length;
    const status = failCount === 0 ? 'healthy' : failCount < checks.length / 2 ? 'degraded' : 'unhealthy';

    return { status, checks };
  }

  /**
   * Get accumulated logs
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private createContext(isCancelled: () => boolean): ExecutionContext {
    return {
      executionId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: this.config.projectId,
      projectPath: this.config.projectPath,
      projectType: this.config.projectType,
      reportProgress: (progress, message) => {
        if (this.config.verbose) {
          this.log(`    Progress: ${progress}% - ${message || ''}`);
        }
      },
      log: (level, message, data) => {
        if (this.config.verbose) {
          this.log(`    [${level.toUpperCase()}] ${message}`);
        }
      },
      isCancelled,
      onCancel: () => {},
      getNodeOutput: () => undefined,
    };
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString().slice(11, 23);
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    if (this.config.verbose) {
      console.log(logMessage);
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    errorMessage: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeout);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a test runner with default settings
 */
export function createTestRunner(config: BlueprintTestConfig): BlueprintTestRunner {
  return new BlueprintTestRunner(config);
}

/**
 * Quick test a single analyzer
 */
export async function testAnalyzer(
  analyzerId: AnalyzerId,
  projectPath: string,
  projectType: ProjectType = 'nextjs',
  config?: Record<string, unknown>
): Promise<BlueprintTestResult> {
  const runner = new BlueprintTestRunner({
    projectPath,
    projectType,
    verbose: true,
  });

  return runner.runBlueprint({
    analyzerId,
    analyzerConfig: config,
  });
}

/**
 * Quick test analyzer with processor
 */
export async function testAnalyzerWithProcessor(
  analyzerId: AnalyzerId,
  processorId: ProcessorId,
  projectPath: string,
  projectType: ProjectType = 'nextjs'
): Promise<BlueprintTestResult> {
  const runner = new BlueprintTestRunner({
    projectPath,
    projectType,
    verbose: true,
  });

  return runner.runBlueprint({
    analyzerId,
    processorIds: [processorId],
  });
}
