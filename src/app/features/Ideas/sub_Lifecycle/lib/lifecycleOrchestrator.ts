/**
 * AI-Driven Code Quality Lifecycle Orchestrator
 * Pure state machine that delegates phase execution to PhaseExecutor implementations.
 */

import {
  LifecycleConfig,
  LifecycleCycle,
  LifecycleEvent,
  LifecyclePhase,
  LifecycleTrigger,
  LifecycleOrchestratorStatus,
  PhaseExecutor,
  PhaseContext,
  DEFAULT_LIFECYCLE_CONFIG,
} from './lifecycleTypes';
import {
  DetectionExecutor,
  ScanningExecutor,
  ResolvingExecutor,
  ValidationExecutor,
  DeploymentExecutor,
} from './executors';

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
 * Singleton state machine that delegates phase work to executor instances.
 */
class LifecycleOrchestrator {
  private _isRunning: boolean = false;
  private currentCycle: LifecycleCycle | null = null;
  private cycleHistory: LifecycleCycle[] = [];
  private eventHistory: LifecycleEvent[] = [];
  private config: LifecycleConfig | null = null;
  private callbacks: LifecycleCallbacks = {};
  private pollTimer: NodeJS.Timeout | null = null;
  private lastCycleAt: string | null = null;
  private nextScheduledAt: string | null = null;
  private cycleLock: boolean = false;

  // Phase executors — instantiated once, reused across cycles
  private readonly executors: {
    detection: PhaseExecutor;
    scanning: PhaseExecutor;
    resolving: PhaseExecutor;
    validation: PhaseExecutor;
    deployment: PhaseExecutor;
  } = {
    detection: new DetectionExecutor(),
    scanning: new ScanningExecutor(),
    resolving: new ResolvingExecutor(),
    validation: new ValidationExecutor(),
    deployment: new DeploymentExecutor(),
  };

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
    if (this._isRunning) {
      return;
    }

    if (!this.config) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }

    this._isRunning = true;
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
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;
    this.cycleLock = false;
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

    // Atomic lock check — prevents concurrent calls from both passing the guard
    if (this.cycleLock) {
      throw new Error('A cycle is already in progress');
    }

    // Check if already running a cycle
    if (this.currentCycle && this.currentCycle.phase !== 'completed' && this.currentCycle.phase !== 'failed') {
      throw new Error('A cycle is already in progress');
    }

    // Acquire lock before any async work
    this.cycleLock = true;

    // Check rate limiting
    if (this.lastCycleAt) {
      const timeSinceLastCycle = Date.now() - new Date(this.lastCycleAt).getTime();
      if (timeSinceLastCycle < this.config.min_cycle_interval_ms) {
        this.cycleLock = false;
        throw new Error(`Rate limited. Wait ${Math.ceil((this.config.min_cycle_interval_ms - timeSinceLastCycle) / 1000)} seconds`);
      }
    }

    // Create new cycle
    const now = new Date().toISOString();
    const isSimulation = this.config.simulation_mode ?? false;
    const cycle: LifecycleCycle = {
      id: generateId('cycle'),
      config_id: this.config.id,
      project_id: this.config.project_id,
      phase: 'detecting',
      trigger,
      trigger_metadata: triggerMetadata,
      progress: 0,
      current_step: isSimulation ? 'Initializing (Simulation)' : 'Initializing',
      total_steps: this.calculateTotalSteps(),
      scans_completed: 0,
      scans_total: this.config.scan_types.length,
      ideas_generated: 0,
      ideas_resolved: 0,
      quality_gates_passed: 0,
      quality_gates_total: this.config.quality_gates.length,
      gate_results: [],
      is_simulation: isSimulation,
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
    } finally {
      this.cycleLock = false;
    }

    return cycle;
  }

  /**
   * Build a PhaseContext that bridges the orchestrator's state to executor calls.
   */
  private buildContext(cycle: LifecycleCycle): PhaseContext {
    const config = this.config!;
    return {
      config,
      cycle,
      isRunning: () => this._isRunning,
      updatePhase: (phase, step, progress) => this.updateCyclePhase(cycle, phase, step, progress),
      updateProgress: (progress, step) => this.updateCycleProgress(cycle, progress, step),
      logEvent: (type, phase, message, details) => this.logEvent(type, phase, message, details),
    };
  }

  /**
   * Run the lifecycle cycle through all phases by delegating to executors
   */
  private async runCycle(cycle: LifecycleCycle): Promise<void> {
    const ctx = this.buildContext(cycle);

    // Phase 1: Detecting
    await this.executors.detection.execute(ctx);

    // Phase 2: Scanning
    await this.executors.scanning.execute(ctx);

    // Phase 3: Resolving
    await this.executors.resolving.execute(ctx);

    // Phase 4: Validating
    await this.executors.validation.execute(ctx);

    // Phase 5: Deploying (if enabled or simulation mode)
    if (this.config?.auto_deploy || cycle.is_simulation) {
      await this.executors.deployment.execute(ctx);
    }

    // Complete the cycle
    await this.completeCycle(cycle);
  }

  // ── State-machine helpers ─────────────────────────────────────────────

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

    const completionMessage = cycle.is_simulation
      ? 'Simulation cycle completed — review preview to see what would have been deployed'
      : 'Lifecycle cycle completed successfully';

    this.logEvent('phase_change', 'completed', completionMessage, {
      duration_ms: cycle.duration_ms,
      ideas_generated: cycle.ideas_generated,
      ideas_resolved: cycle.ideas_resolved,
      gates_passed: cycle.quality_gates_passed,
      is_simulation: cycle.is_simulation,
    });

    this.callbacks.onPhaseChange?.(cycle, 'completed');
    this.callbacks.onCycleComplete?.(cycle);

    this.currentCycle = null;
  }

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

  // ── Internal helpers ──────────────────────────────────────────────────

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
    if (!this.currentCycle && !this.cycleLock && this.nextScheduledAt) {
      const now = Date.now();
      const scheduled = new Date(this.nextScheduledAt).getTime();

      if (now >= scheduled) {
        // Clear before triggering to prevent repeat-fire on every poll
        this.nextScheduledAt = null;
        this.triggerCycle('scheduled').catch(() => {
          // Silently handle scheduled trigger failures
        });
      }
    }
  }

  // ── Public getters ────────────────────────────────────────────────────

  getStatus(): LifecycleOrchestratorStatus {
    return {
      is_running: this._isRunning,
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
