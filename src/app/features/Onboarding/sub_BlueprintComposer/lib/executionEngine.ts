/**
 * Blueprint Execution Engine
 *
 * Handles phased execution of blueprints:
 * 1. Analyzer phase - find issues
 * 2. Processor phase - transform issues
 * 3. Decision phase - pause for user decision (if Decision Gate selected)
 * 4. Executor phase - execute fixes via Claude Code
 */

import { BlueprintComposition } from '../types';
import type { Issue } from '@/lib/blueprint/types';

// ============================================================================
// Types
// ============================================================================

export type ExecutionPhase =
  | 'idle'
  | 'analyzer'
  | 'processor'
  | 'decision'     // Waiting for user decision
  | 'executor'
  | 'completed'
  | 'failed';

export interface ExecutionLog {
  timestamp: Date;
  phase: ExecutionPhase;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

export interface ExecutionState {
  phase: ExecutionPhase;
  progress: number;  // 0-100
  logs: ExecutionLog[];
  issues: Issue[];
  error?: string;

  // Decision gate state
  pendingDecision?: {
    issues: Issue[];
    summary: string;
    onAccept: () => void;
    onReject: () => void;
  };

  // Result data
  result?: {
    totalIssues: number;
    processedIssues: number;
    executedFixes: number;
    duration: number;
  };
}

export interface ExecutionConfig {
  projectPath: string;
  projectType: 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other';
  projectId?: string;
  verbose?: boolean;
}

export type StateListener = (state: ExecutionState) => void;

// ============================================================================
// Execution Engine Class
// ============================================================================

export class BlueprintExecutionEngine {
  private state: ExecutionState;
  private listeners: Set<StateListener> = new Set();
  private abortController: AbortController | null = null;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): ExecutionState {
    return {
      phase: 'idle',
      progress: 0,
      logs: [],
      issues: [],
    };
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  getState(): ExecutionState {
    return { ...this.state };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(updates: Partial<ExecutionState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  private log(level: ExecutionLog['level'], message: string, data?: unknown) {
    const logEntry: ExecutionLog = {
      timestamp: new Date(),
      phase: this.state.phase,
      level,
      message,
      data,
    };

    this.updateState({
      logs: [...this.state.logs, logEntry],
    });

    // Also console log for debugging
    console.log(`[Blueprint ${this.state.phase}] ${message}`, data || '');
  }

  // ---------------------------------------------------------------------------
  // Execution
  // ---------------------------------------------------------------------------

  async execute(
    composition: BlueprintComposition,
    config: ExecutionConfig
  ): Promise<ExecutionState> {
    // Reset state
    this.state = this.createInitialState();
    this.abortController = new AbortController();

    const startTime = Date.now();

    try {
      // Phase 1: Analyzer
      await this.runAnalyzerPhase(composition, config);
      if (this.isAborted()) return this.getState();

      // Phase 2: Processors
      if (composition.processors.length > 0) {
        await this.runProcessorPhase(composition, config);
        if (this.isAborted()) return this.getState();
      }

      // Phase 3: Check for Decision Gate
      const hasDecisionGate = composition.decisionNodes.some(n => n.enabled);
      const hasExecutor = composition.executor !== null;

      if (hasDecisionGate && this.state.issues.length > 0) {
        // Pause for user decision
        await this.runDecisionPhase(composition, config);
        if (this.isAborted()) return this.getState();

        // If rejected, stop here
        if (this.state.phase === 'completed') {
          return this.getState();
        }
      }

      // Phase 4: Executor (if selected and issues exist)
      if (hasExecutor && this.state.issues.length > 0) {
        await this.runExecutorPhase(composition, config);
      }

      // Complete
      const duration = Date.now() - startTime;
      this.updateState({
        phase: 'completed',
        progress: 100,
        result: {
          totalIssues: this.state.issues.length,
          processedIssues: this.state.issues.length,
          executedFixes: hasExecutor ? this.state.issues.length : 0,
          duration,
        },
      });

      this.log('info', `Execution completed in ${duration}ms`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateState({
        phase: 'failed',
        error: errorMessage,
      });
      this.log('error', `Execution failed: ${errorMessage}`);
    }

    return this.getState();
  }

  abort() {
    this.abortController?.abort();
    this.log('warn', 'Execution aborted by user');
  }

  private isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  // ---------------------------------------------------------------------------
  // Phase Implementations
  // ---------------------------------------------------------------------------

  private async runAnalyzerPhase(
    composition: BlueprintComposition,
    config: ExecutionConfig
  ): Promise<void> {
    this.updateState({ phase: 'analyzer', progress: 5 });
    this.log('info', `Starting analyzer: ${composition.analyzer?.name}`);

    if (!composition.analyzer) {
      throw new Error('No analyzer selected');
    }

    const response = await fetch('/api/blueprint/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'run-analyzer',
        projectPath: config.projectPath,
        projectType: config.projectType,
        projectId: config.projectId,
        analyzerId: composition.analyzer.componentId,
        analyzerConfig: composition.analyzerConfig,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`Analyzer failed: ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Analyzer failed');
    }

    const issues = data.result?.issues || [];
    this.updateState({
      issues,
      progress: 30,
    });

    this.log('info', `Analyzer found ${issues.length} issues`);
  }

  private async runProcessorPhase(
    composition: BlueprintComposition,
    config: ExecutionConfig
  ): Promise<void> {
    this.updateState({ phase: 'processor', progress: 35 });

    let currentIssues = this.state.issues;

    for (let i = 0; i < composition.processors.length; i++) {
      const processor = composition.processors[i];
      this.log('info', `Running processor ${i + 1}/${composition.processors.length}: ${processor.name}`);

      const progress = 35 + ((i + 1) / composition.processors.length) * 25;
      this.updateState({ progress });

      const response = await fetch('/api/blueprint/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run-processor',
          projectPath: config.projectPath,
          projectType: config.projectType,
          processorId: processor.componentId,
          processorConfig: composition.processorConfigs?.[processor.componentId],
          issues: currentIssues,
        }),
        signal: this.abortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`Processor ${processor.name} failed: ${await response.text()}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || `Processor ${processor.name} failed`);
      }

      currentIssues = data.result?.issues || currentIssues;
      this.log('info', `Processor output: ${currentIssues.length} issues`);
    }

    this.updateState({
      issues: currentIssues,
      progress: 60,
    });
  }

  private async runDecisionPhase(
    composition: BlueprintComposition,
    config: ExecutionConfig
  ): Promise<void> {
    this.updateState({ phase: 'decision', progress: 65 });
    this.log('info', `Waiting for user decision on ${this.state.issues.length} issues`);

    // Create a promise that resolves when user makes a decision
    return new Promise((resolve) => {
      const summary = `Found ${this.state.issues.length} issues. Review and decide whether to proceed with fixes.`;

      this.updateState({
        pendingDecision: {
          issues: this.state.issues,
          summary,
          onAccept: () => {
            this.log('info', 'User accepted - proceeding to executor');
            this.updateState({
              pendingDecision: undefined,
              progress: 70,
            });
            resolve();
          },
          onReject: () => {
            this.log('info', 'User rejected - stopping execution');
            this.updateState({
              phase: 'completed',
              pendingDecision: undefined,
              progress: 100,
              result: {
                totalIssues: this.state.issues.length,
                processedIssues: this.state.issues.length,
                executedFixes: 0,
                duration: 0,
              },
            });
            resolve();
          },
        },
      });
    });
  }

  private async runExecutorPhase(
    composition: BlueprintComposition,
    config: ExecutionConfig
  ): Promise<void> {
    this.updateState({ phase: 'executor', progress: 75 });
    this.log('info', `Starting executor: ${composition.executor?.name}`);

    if (!composition.executor) {
      throw new Error('No executor selected');
    }

    const response = await fetch('/api/blueprint/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'run-executor',
        projectPath: config.projectPath,
        projectType: config.projectType,
        projectId: config.projectId,
        executorId: composition.executor.componentId,
        executorConfig: composition.executorConfig,
        issues: this.state.issues,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`Executor failed: ${await response.text()}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Executor failed');
    }

    this.log('info', `Executor completed: ${data.result?.fixedCount || 0} fixes applied`);
    this.updateState({ progress: 95 });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let engineInstance: BlueprintExecutionEngine | null = null;

export function getExecutionEngine(): BlueprintExecutionEngine {
  if (!engineInstance) {
    engineInstance = new BlueprintExecutionEngine();
  }
  return engineInstance;
}

export function createExecutionEngine(): BlueprintExecutionEngine {
  return new BlueprintExecutionEngine();
}
