/**
 * SessionLifecycleManager<T>
 *
 * Unified session lifecycle manager that replaces 5 independent implementations.
 * Handles: heartbeat, staleness detection, cleanup, and provides recovery hooks.
 *
 * Each subsystem instantiates this with domain-specific config rather than
 * reimplementing the state machine.
 */

import type {
  BaseSession,
  SessionLifecycleConfig,
  StaleSession,
} from './types';

export class SessionLifecycleManager<T extends BaseSession> {
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private _isRunning = false;

  constructor(private readonly config: SessionLifecycleConfig<T>) {}

  get name(): string {
    return this.config.name;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  /** Access the underlying persistence strategy for direct operations */
  get persistence(): SessionLifecycleConfig<T>['persistence'] {
    return this.config.persistence;
  }

  // ==========================================================================
  // LIFECYCLE CONTROL
  // ==========================================================================

  /**
   * Start automatic heartbeat and stale-session scanning.
   * Safe to call multiple times (idempotent).
   */
  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;

    const { heartbeatIntervalMs, scanIntervalMs } = this.config;

    if (heartbeatIntervalMs > 0) {
      this.heartbeatTimer = setInterval(() => {
        this.heartbeatAll().catch(this.logError('heartbeatAll'));
      }, heartbeatIntervalMs);
    }

    if (scanIntervalMs > 0) {
      this.scanTimer = setInterval(() => {
        this.scanAndCleanup().catch(this.logError('scanAndCleanup'));
      }, scanIntervalMs);
    }
  }

  /**
   * Stop all automatic timers.
   */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    this._isRunning = false;
  }

  // ==========================================================================
  // HEARTBEAT
  // ==========================================================================

  /**
   * Send heartbeat for a single session.
   */
  async heartbeat(sessionId: string): Promise<void> {
    await this.config.persistence.updateHeartbeat(sessionId);
  }

  /**
   * Send heartbeat for all active sessions.
   */
  async heartbeatAll(): Promise<void> {
    const sessions = await this.config.persistence.getAll();
    const active = sessions.filter((s) =>
      this.config.activeStatuses.includes(s.status)
    );

    await Promise.all(active.map((s) => this.heartbeat(s.id)));
  }

  // ==========================================================================
  // STALENESS DETECTION
  // ==========================================================================

  /**
   * Scan all sessions and return those that match any staleness rule.
   */
  async detectStale(): Promise<StaleSession<T>[]> {
    const sessions = await this.config.persistence.getAll();
    const now = Date.now();
    const stale: StaleSession<T>[] = [];

    for (const session of sessions) {
      for (const rule of this.config.stalenessRules) {
        if (rule.isStale(session, now)) {
          const entry: StaleSession<T> = {
            session,
            rule: rule.name,
            detectedAt: now,
          };
          stale.push(entry);
          await this.config.hooks?.onStaleDetected?.(entry);
          break; // one rule match per session is enough
        }
      }
    }

    return stale;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clean up a single session by ID.
   * Calls beforeCleanup/afterCleanup hooks.
   */
  async cleanup(sessionId: string): Promise<boolean> {
    const session = await this.config.persistence.getById(sessionId);
    if (!session) return false;

    const proceed = await this.config.hooks?.beforeCleanup?.(session);
    if (proceed === false) return false;

    const deleted = await this.config.persistence.delete(sessionId);
    if (deleted) {
      await this.config.hooks?.afterCleanup?.(session);
    }
    return !!deleted;
  }

  /**
   * Clean up multiple sessions.
   */
  async cleanupMany(sessionIds: string[]): Promise<number> {
    let cleaned = 0;
    for (const id of sessionIds) {
      if (await this.cleanup(id)) cleaned++;
    }
    return cleaned;
  }

  /**
   * Detect stale sessions and clean them up.
   * Returns the list of sessions that were cleaned.
   */
  async scanAndCleanup(): Promise<StaleSession<T>[]> {
    const stale = await this.detectStale();

    for (const entry of stale) {
      await this.cleanup(entry.session.id);
    }

    return stale;
  }

  /**
   * Clean up sessions older than maxSessionAgeMs that are NOT in an active status.
   */
  async cleanupOld(): Promise<number> {
    if (this.config.maxSessionAgeMs <= 0) return 0;

    const sessions = await this.config.persistence.getAll();
    const cutoff = Date.now() - this.config.maxSessionAgeMs;
    let cleaned = 0;

    for (const session of sessions) {
      if (
        session.updatedAt < cutoff &&
        !this.config.activeStatuses.includes(session.status)
      ) {
        if (await this.cleanup(session.id)) cleaned++;
      }
    }

    return cleaned;
  }

  // ==========================================================================
  // RECOVERY
  // ==========================================================================

  /**
   * Find sessions that may need recovery (active status but potentially stale).
   * The actual recovery logic is domain-specific and handled via hooks.
   */
  async getRecoverableSessions(): Promise<T[]> {
    const sessions = await this.config.persistence.getAll();
    return sessions.filter((s) =>
      this.config.activeStatuses.includes(s.status)
    );
  }

  /**
   * Run recovery for all recoverable sessions.
   * Calls onRecoveryStart and onRecoveryComplete hooks.
   */
  async recover(): Promise<{ recovered: number; failed: number }> {
    const sessions = await this.getRecoverableSessions();
    let recovered = 0;
    let failed = 0;

    for (const session of sessions) {
      try {
        await this.config.hooks?.onRecoveryStart?.(session);
        await this.config.hooks?.onRecoveryComplete?.(session, true);
        recovered++;
      } catch {
        await this.config.hooks?.onRecoveryComplete?.(session, false);
        failed++;
      }
    }

    return { recovered, failed };
  }

  // ==========================================================================
  // QUERY HELPERS
  // ==========================================================================

  async getAll(): Promise<T[]> {
    return this.config.persistence.getAll();
  }

  async getById(id: string): Promise<T | null> {
    return this.config.persistence.getById(id);
  }

  async getActive(): Promise<T[]> {
    const all = await this.config.persistence.getAll();
    return all.filter((s) => this.config.activeStatuses.includes(s.status));
  }

  hasActiveSessions(sessions: T[]): boolean {
    return sessions.some((s) => this.config.activeStatuses.includes(s.status));
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private logError(method: string) {
    return (err: unknown) => {
      console.error(
        `[SessionLifecycle:${this.config.name}] ${method} failed:`,
        err
      );
    };
  }
}
