/**
 * Session Lifecycle Types
 *
 * Generic types for the unified session lifecycle abstraction.
 * All 5 session subsystems (Claude Code, CLI, Automation, Terminal, Remote Device)
 * share this common lifecycle pattern: create → heartbeat → detect-stale → recover → cleanup.
 */

// ============================================================================
// CORE SESSION INTERFACE
// ============================================================================

/**
 * Minimal contract every session must fulfill.
 * Subsystems extend this with domain-specific fields.
 */
export interface BaseSession {
  id: string;
  status: string;
  createdAt: number;   // ms timestamp
  updatedAt: number;   // ms timestamp (heartbeat / last activity)
}

// ============================================================================
// STALENESS
// ============================================================================

export interface StalenessRule<T extends BaseSession> {
  /** Human-readable name for this rule (e.g. 'no_heartbeat') */
  name: string;
  /** Return true if the session is stale according to this rule */
  isStale: (session: T, now: number) => boolean;
}

export interface StaleSession<T extends BaseSession> {
  session: T;
  rule: string;       // name of the StalenessRule that matched
  detectedAt: number;  // ms timestamp
}

// ============================================================================
// PERSISTENCE STRATEGY
// ============================================================================

/**
 * Pluggable persistence backend.
 * Implementations can target SQLite, localStorage, in-memory Map, or remote APIs.
 */
export interface PersistenceStrategy<T extends BaseSession> {
  getAll: () => T[] | Promise<T[]>;
  getById: (id: string) => T | null | Promise<T | null>;
  save: (session: T) => void | Promise<void>;
  delete: (id: string) => boolean | Promise<boolean>;
  updateHeartbeat: (id: string) => void | Promise<void>;
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

/**
 * Optional hooks that subsystems can provide for domain-specific behavior
 * at each lifecycle stage.
 */
export interface LifecycleHooks<T extends BaseSession> {
  /** Called before a session is cleaned up. Return false to skip cleanup. */
  beforeCleanup?: (session: T) => boolean | Promise<boolean>;
  /** Called after a session is cleaned up. */
  afterCleanup?: (session: T) => void | Promise<void>;
  /** Called when a stale session is detected. */
  onStaleDetected?: (stale: StaleSession<T>) => void | Promise<void>;
  /** Called when recovery starts for a session. */
  onRecoveryStart?: (session: T) => void | Promise<void>;
  /** Called when recovery completes for a session. */
  onRecoveryComplete?: (session: T, success: boolean) => void | Promise<void>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SessionLifecycleConfig<T extends BaseSession> {
  /** Unique name for this lifecycle instance (for logging) */
  name: string;

  /** Persistence backend */
  persistence: PersistenceStrategy<T>;

  /** Rules for detecting stale sessions */
  stalenessRules: StalenessRule<T>[];

  /** Heartbeat interval in ms. 0 = no automatic heartbeat. */
  heartbeatIntervalMs: number;

  /** How often to scan for stale sessions in ms. 0 = no automatic scanning. */
  scanIntervalMs: number;

  /** Maximum age in ms before a non-active session is eligible for cleanup. 0 = no age limit. */
  maxSessionAgeMs: number;

  /** Optional lifecycle hooks */
  hooks?: LifecycleHooks<T>;

  /** Filter for which statuses count as "active" (not eligible for age-based cleanup) */
  activeStatuses: string[];
}
