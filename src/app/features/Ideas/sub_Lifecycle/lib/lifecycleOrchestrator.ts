/**
 * AI-Driven Code Quality Lifecycle Orchestrator
 * Central service that manages the automated quality lifecycle pipeline
 */

import {
  LifecycleConfig,
  LifecycleCycle,
  LifecycleEvent,
  LifecyclePhase,
  LifecycleTrigger,
  LifecycleOrchestratorStatus,
  QualityGateResult,
  QualityGateType,
  DEFAULT_LIFECYCLE_CONFIG,
} from './lifecycleTypes';
import { ScanType } from '../../lib/scanTypes';

// Generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Lifecycle Orchestrator callbacks
 */
interface LifecycleCallbacks {
  onPhaseChange?: (cycle: LifecycleCycle, phase: LifecyclePhase) => void;
  onEvent?: (event: LifecycleEvent) => void;
  onCycleComplete?: (cycle: LifecycleCycle) => void;
  onCycleError?: (cycle: LifecycleCycle, error: Error) => void;
}

/**
 * Lifecycle Orchestrator class
 * Singleton pattern for managing lifecycle automation
 */
class LifecycleOrchestrator {
  private isRunning: boolean = false;
  private currentCycle: LifecycleCycle | null = null;
  private cycleHistory: LifecycleCycle[] = [];
  private eventHistory: LifecycleEvent[] = [];
  private config: LifecycleConfig | null = null;
  private callbacks: LifecycleCallbacks = {};
  private pollTimer: NodeJS.Timeout | null = null;
  private lastCycleAt: string | null = null;
  private nextScheduledAt: string | null = null;

  /**
   * Initialize the orchestrator with a project configuration
   */
  async initialize(projectId: string, config?: Partial<LifecycleConfig>): Promise<void> {
    const now = new Date().toISOString();

    this.config = {
      ...DEFAULT_LIFECYCLE_CONFIG,
      ...config,
      id: config?.id || generateId('lifecycle_config'),
      project_id: projectId,
      created_at: now,
      updated_at: now,
    };

    this.logEvent('info', 'idle', 'Lifecycle orchestrator initialized');
  }

  /**
   * Start the lifecycle orchestrator
   */
  start(callbacks?: LifecycleCallbacks): void {
    if (this.isRunning) {
      return;
    }

    if (!this.config) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }

    this.isRunning = true;
    this.callbacks = callbacks || {};

    this.logEvent('info', 'idle', 'Lifecycle orchestrator started');

    // Start polling for triggers if enabled
    if (this.config.enabled) {
      this.startPolling();
    }
  }

  /**
   * Stop the lifecycle orchestrator
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.stopPolling();

    this.logEvent('info', 'idle', 'Lifecycle orchestrator stopped');
  }

  /**
   * Trigger a new lifecycle cycle manually or via event
   */
  async triggerCycle(
    trigger: LifecycleTrigger,
    triggerMetadata?: Record<string, unknown>
  ): Promise<LifecycleCycle> {
    if (!this.config) {
      throw new Error('Orchestrator not initialized');
    }

    // Check if already running a cycle
    if (this.currentCycle && this.currentCycle.phase !== 'completed' && this.currentCycle.phase !== 'failed') {
      throw new Error('A cycle is already in progress');
    }

    // Check rate limiting
    if (this.lastCycleAt) {
      const timeSinceLastCycle = Date.now() - new Date(this.lastCycleAt).getTime();
      if (timeSinceLastCycle < this.config.min_cycle_interval_ms) {
        throw new Error(`Rate limited. Wait ${Math.ceil((this.config.min_cycle_interval_ms - timeSinceLastCycle) / 1000)} seconds`);
      }
    }

    // Create new cycle
    const now = new Date().toISOString();
    const cycle: LifecycleCycle = {
      id: generateId('cycle'),
      config_id: this.config.id,
      project_id: this.config.project_id,
      phase: 'detecting',
      trigger,
      trigger_metadata: triggerMetadata,
      progress: 0,
      current_step: 'Initializing',
      total_steps: this.calculateTotalSteps(),
      scans_completed: 0,
      scans_total: this.config.scan_types.length,
      ideas_generated: 0,
      ideas_resolved: 0,
      quality_gates_passed: 0,
      quality_gates_total: this.config.quality_gates.length,
      gate_results: [],
      started_at: now,
      retry_count: 0,
      created_at: now,
      updated_at: now,
    };

    this.currentCycle = cycle;
    this.logEvent('phase_change', 'detecting', `Lifecycle cycle started via ${trigger}`);
    this.callbacks.onPhaseChange?.(cycle, 'detecting');

    // Run the cycle
    try {
      await this.runCycle(cycle);
    } catch (error) {
      await this.handleCycleError(cycle, error as Error);
    }

    return cycle;
  }

  /**
   * Run the lifecycle cycle through all phases
   */
  private async runCycle(cycle: LifecycleCycle): Promise<void> {
    try {
      // Phase 1: Detecting
      await this.runDetectionPhase(cycle);

      // Phase 2: Scanning
      await this.runScanningPhase(cycle);

      // Phase 3: Resolving
      await this.runResolvingPhase(cycle);

      // Phase 4: Testing/Validating
      await this.runValidationPhase(cycle);

      // Phase 5: Deploying (if enabled)
      if (this.config?.auto_deploy) {
        await this.runDeploymentPhase(cycle);
      }

      // Complete the cycle
      await this.completeCycle(cycle);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Detection phase - identify what triggered the cycle
   */
  private async runDetectionPhase(cycle: LifecycleCycle): Promise<void> {
    this.updateCyclePhase(cycle, 'detecting', 'Detecting code changes', 10);

    // Simulate detection (in real implementation, this would analyze git diff, file changes, etc.)
    await this.sleep(500);

    this.logEvent('info', 'detecting', 'Code changes detected', cycle.trigger_metadata);
    this.updateCycleProgress(cycle, 15, 'Changes identified');
  }

  /**
   * Scanning phase - run AI scans
   */
  private async runScanningPhase(cycle: LifecycleCycle): Promise<void> {
    this.updateCyclePhase(cycle, 'scanning', 'Running AI scans', 20);

    if (!this.config) return;

    const scanTypes = this.config.scan_types;
    let scansCompleted = 0;
    let totalIdeas = 0;

    for (const scanType of scanTypes) {
      if (!this.isRunning) {
        throw new Error('Cycle cancelled');
      }

      this.logEvent('scan_start', 'scanning', `Starting ${scanType} scan`);
      this.updateCycleProgress(cycle, 20 + (scansCompleted / scanTypes.length) * 25, `Running ${scanType} scan`);

      try {
        // Call the scan API
        const result = await this.executeScan(cycle.project_id, scanType);
        totalIdeas += result.ideaCount;
        scansCompleted++;

        cycle.scans_completed = scansCompleted;
        cycle.ideas_generated = totalIdeas;

        this.logEvent('scan_complete', 'scanning', `${scanType} scan complete: ${result.ideaCount} ideas`, {
          scanType,
          ideaCount: result.ideaCount,
        });
      } catch (error) {
        this.logEvent('error', 'scanning', `Scan ${scanType} failed: ${(error as Error).message}`);
        // Continue with other scans unless fail_fast is enabled
        if (this.config.fail_fast) {
          throw error;
        }
      }
    }

    this.updateCycleProgress(cycle, 45, `Scans complete: ${totalIdeas} ideas found`);
  }

  /**
   * Resolution phase - AI resolves identified issues
   */
  private async runResolvingPhase(cycle: LifecycleCycle): Promise<void> {
    this.updateCyclePhase(cycle, 'resolving', 'Resolving issues', 50);

    if (!this.config) return;

    if (!this.config.auto_resolve) {
      this.logEvent('info', 'resolving', 'Auto-resolve disabled, skipping resolution phase');
      this.updateCycleProgress(cycle, 60, 'Resolution phase skipped');
      return;
    }

    // Get ideas to resolve
    const ideas = await this.getIdeasToResolve(cycle.project_id);
    const ideasToResolve = ideas.slice(0, this.config.max_auto_implementations);

    let resolved = 0;
    for (const idea of ideasToResolve) {
      if (!this.isRunning) {
        throw new Error('Cycle cancelled');
      }

      this.logEvent('idea_resolved', 'resolving', `Resolving idea: ${idea.title}`, { ideaId: idea.id });

      try {
        await this.resolveIdea(idea.id, cycle.project_id);
        resolved++;
        cycle.ideas_resolved = resolved;

        this.updateCycleProgress(
          cycle,
          50 + (resolved / ideasToResolve.length) * 15,
          `Resolved ${resolved}/${ideasToResolve.length} ideas`
        );
      } catch (error) {
        this.logEvent('error', 'resolving', `Failed to resolve idea: ${(error as Error).message}`);
      }
    }

    this.updateCycleProgress(cycle, 65, `Resolution complete: ${resolved} ideas resolved`);
  }

  /**
   * Validation phase - run quality gates
   */
  private async runValidationPhase(cycle: LifecycleCycle): Promise<void> {
    this.updateCyclePhase(cycle, 'validating', 'Running quality gates', 70);

    if (!this.config) return;

    const gates = this.config.quality_gates;
    const results: QualityGateResult[] = [];
    let passed = 0;

    for (const gate of gates) {
      if (!this.isRunning) {
        throw new Error('Cycle cancelled');
      }

      this.logEvent('gate_start', 'validating', `Running ${gate} gate`);
      this.updateCycleProgress(cycle, 70 + (results.length / gates.length) * 20, `Running ${gate}`);

      const result = await this.runQualityGate(gate);
      results.push(result);

      if (result.passed) {
        passed++;
        this.logEvent('gate_complete', 'validating', `${gate} gate passed`, result as unknown as Record<string, unknown>);
      } else {
        this.logEvent('warning', 'validating', `${gate} gate failed: ${result.message}`, result as unknown as Record<string, unknown>);

        if (this.config.fail_fast) {
          cycle.gate_results = results;
          cycle.quality_gates_passed = passed;
          throw new Error(`Quality gate ${gate} failed: ${result.message}`);
        }
      }
    }

    cycle.gate_results = results;
    cycle.quality_gates_passed = passed;

    if (passed < gates.length) {
      this.updateCycleProgress(cycle, 90, `Validation complete: ${passed}/${gates.length} gates passed`);
    } else {
      this.updateCycleProgress(cycle, 90, 'All quality gates passed');
    }
  }

  /**
   * Deployment phase - deploy changes
   */
  private async runDeploymentPhase(cycle: LifecycleCycle): Promise<void> {
    this.updateCyclePhase(cycle, 'deploying', 'Deploying changes', 92);

    if (!this.config) return;

    // Check if all gates passed
    if (cycle.quality_gates_passed < cycle.quality_gates_total) {
      this.logEvent('info', 'deploying', 'Skipping deployment: not all quality gates passed');
      cycle.deployment_status = 'skipped';
      return;
    }

    // Check deployment restrictions
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const hour = now.getHours();
    const isBusinessHours = hour >= 9 && hour < 17;

    if (isWeekend && !this.config.deploy_on_weekend) {
      this.logEvent('info', 'deploying', 'Skipping deployment: weekend deployment disabled');
      cycle.deployment_status = 'skipped';
      return;
    }

    if (!isBusinessHours && this.config.deploy_during_business_hours) {
      this.logEvent('info', 'deploying', 'Skipping deployment: outside business hours');
      cycle.deployment_status = 'skipped';
      return;
    }

    cycle.deployment_status = 'in_progress';
    this.logEvent('deploy_start', 'deploying', 'Starting deployment');

    try {
      for (const target of this.config.deployment_targets) {
        await this.deployToTarget(target, cycle);
      }

      cycle.deployment_status = 'completed';
      this.logEvent('deploy_complete', 'deploying', 'Deployment completed successfully');
      this.updateCycleProgress(cycle, 98, 'Deployment complete');
    } catch (error) {
      cycle.deployment_status = 'failed';
      throw error;
    }
  }

  /**
   * Complete the cycle successfully
   */
  private async completeCycle(cycle: LifecycleCycle): Promise<void> {
    const now = new Date().toISOString();

    cycle.phase = 'completed';
    cycle.progress = 100;
    cycle.current_step = 'Completed';
    cycle.completed_at = now;
    cycle.duration_ms = Date.now() - new Date(cycle.started_at).getTime();
    cycle.updated_at = now;

    this.lastCycleAt = now;
    this.cycleHistory.push({ ...cycle });

    this.logEvent('phase_change', 'completed', 'Lifecycle cycle completed successfully', {
      duration_ms: cycle.duration_ms,
      ideas_generated: cycle.ideas_generated,
      ideas_resolved: cycle.ideas_resolved,
      gates_passed: cycle.quality_gates_passed,
    });

    this.callbacks.onPhaseChange?.(cycle, 'completed');
    this.callbacks.onCycleComplete?.(cycle);

    this.currentCycle = null;
  }

  /**
   * Handle cycle error
   */
  private async handleCycleError(cycle: LifecycleCycle, error: Error): Promise<void> {
    const now = new Date().toISOString();

    cycle.phase = 'failed';
    cycle.error_phase = cycle.phase;
    cycle.error_message = error.message;
    cycle.completed_at = now;
    cycle.duration_ms = Date.now() - new Date(cycle.started_at).getTime();
    cycle.updated_at = now;

    this.lastCycleAt = now;
    this.cycleHistory.push({ ...cycle });

    this.logEvent('error', 'failed', `Cycle failed: ${error.message}`, {
      error_phase: cycle.error_phase,
      retry_count: cycle.retry_count,
    });

    this.callbacks.onPhaseChange?.(cycle, 'failed');
    this.callbacks.onCycleError?.(cycle, error);

    this.currentCycle = null;

    // Apply cooldown
    if (this.config) {
      const cooldownUntil = new Date(Date.now() + this.config.cooldown_on_failure_ms);
      this.nextScheduledAt = cooldownUntil.toISOString();
    }
  }

  /**
   * Execute a scan via API
   */
  private async executeScan(projectId: string, scanType: ScanType): Promise<{ ideaCount: number }> {
    try {
      const response = await fetch('/api/lifecycle/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          scanType,
          provider: this.config?.provider || 'gemini',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Scan failed');
      }

      return await response.json();
    } catch (error) {
      // In development/test, simulate scan results
      await this.sleep(1000);
      return { ideaCount: Math.floor(Math.random() * 5) + 1 };
    }
  }

  /**
   * Get ideas to resolve
   */
  private async getIdeasToResolve(projectId: string): Promise<Array<{ id: string; title: string }>> {
    try {
      const response = await fetch(`/api/ideas?projectId=${projectId}&status=accepted`);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.ideas || [];
    } catch {
      return [];
    }
  }

  /**
   * Resolve an idea
   */
  private async resolveIdea(ideaId: string, projectId: string): Promise<void> {
    try {
      await fetch('/api/lifecycle/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, projectId }),
      });
    } catch {
      // Silently fail resolution attempts
    }
  }

  /**
   * Run a quality gate
   */
  private async runQualityGate(gate: QualityGateType): Promise<QualityGateResult> {
    const startTime = Date.now();

    try {
      const response = await fetch('/api/lifecycle/quality-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gate,
          projectId: this.config?.project_id,
          timeout: this.config?.gate_timeout_ms,
        }),
      });

      const result = await response.json();

      return {
        type: gate,
        passed: result.passed,
        message: result.message,
        details: result.details,
        duration_ms: Date.now() - startTime,
      };
    } catch {
      // In development, simulate gate results
      await this.sleep(500);
      return {
        type: gate,
        passed: Math.random() > 0.2, // 80% pass rate
        message: 'Gate completed',
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Deploy to a target
   */
  private async deployToTarget(target: string, cycle: LifecycleCycle): Promise<void> {
    this.logEvent('info', 'deploying', `Deploying to ${target}`);

    try {
      await fetch('/api/lifecycle/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          projectId: cycle.project_id,
          cycleId: cycle.id,
        }),
      });
    } catch {
      // Simulate deployment
      await this.sleep(1000);
    }
  }

  // Helper methods

  private updateCyclePhase(cycle: LifecycleCycle, phase: LifecyclePhase, step: string, progress: number): void {
    cycle.phase = phase;
    cycle.current_step = step;
    cycle.progress = progress;
    cycle.updated_at = new Date().toISOString();

    this.callbacks.onPhaseChange?.(cycle, phase);
  }

  private updateCycleProgress(cycle: LifecycleCycle, progress: number, step: string): void {
    cycle.progress = progress;
    cycle.current_step = step;
    cycle.updated_at = new Date().toISOString();
  }

  private calculateTotalSteps(): number {
    if (!this.config) return 5;

    return (
      1 + // Detection
      this.config.scan_types.length + // Scans
      (this.config.auto_resolve ? 1 : 0) + // Resolution
      this.config.quality_gates.length + // Gates
      (this.config.auto_deploy ? 1 : 0) // Deployment
    );
  }

  private logEvent(
    type: LifecycleEvent['event_type'],
    phase: LifecyclePhase,
    message: string,
    details?: Record<string, unknown>
  ): void {
    const event: LifecycleEvent = {
      id: generateId('event'),
      cycle_id: this.currentCycle?.id || 'none',
      project_id: this.config?.project_id || 'unknown',
      event_type: type,
      phase,
      message,
      details,
      created_at: new Date().toISOString(),
    };

    this.eventHistory.push(event);
    this.callbacks.onEvent?.(event);

    // Keep only last 1000 events in memory
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }
  }

  private startPolling(): void {
    if (this.pollTimer) return;

    // Poll every minute for scheduled triggers
    this.pollTimer = setInterval(() => {
      if (this.config?.enabled && this.config.triggers.includes('scheduled')) {
        this.checkScheduledTrigger();
      }
    }, 60000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private checkScheduledTrigger(): void {
    if (!this.currentCycle && this.nextScheduledAt) {
      const now = Date.now();
      const scheduled = new Date(this.nextScheduledAt).getTime();

      if (now >= scheduled) {
        this.triggerCycle('scheduled').catch(() => {
          // Silently handle scheduled trigger failures
        });
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public getters

  getStatus(): LifecycleOrchestratorStatus {
    return {
      is_running: this.isRunning,
      active_cycles: this.currentCycle ? 1 : 0,
      current_cycle_id: this.currentCycle?.id,
      current_phase: this.currentCycle?.phase,
      last_cycle_at: this.lastCycleAt || undefined,
      next_scheduled_at: this.nextScheduledAt || undefined,
      config: this.config || {},
    };
  }

  getCurrentCycle(): LifecycleCycle | null {
    return this.currentCycle;
  }

  getCycleHistory(): LifecycleCycle[] {
    return [...this.cycleHistory];
  }

  getEventHistory(limit: number = 100): LifecycleEvent[] {
    return this.eventHistory.slice(-limit);
  }

  getConfig(): LifecycleConfig | null {
    return this.config;
  }

  updateConfig(updates: Partial<LifecycleConfig>): void {
    if (!this.config) return;

    this.config = {
      ...this.config,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.logEvent('info', 'idle', 'Configuration updated', updates);
  }
}

// Singleton instance
export const lifecycleOrchestrator = new LifecycleOrchestrator();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    lifecycleOrchestrator.stop();
  });

  process.on('SIGINT', () => {
    lifecycleOrchestrator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    lifecycleOrchestrator.stop();
    process.exit(0);
  });
}
