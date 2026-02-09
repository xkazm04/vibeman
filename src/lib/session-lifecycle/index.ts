/**
 * Session Lifecycle Module
 *
 * Unified session lifecycle abstraction for all 5 session subsystems:
 * - Claude Code sessions (DB-backed)
 * - CLI sessions (localStorage-backed)
 * - Terminal sessions (in-memory)
 * - Remote Device sessions (remote API-backed)
 *
 * Core pattern: create → heartbeat → detect-stale → recover → cleanup
 */

// Core
export { SessionLifecycleManager } from './SessionLifecycleManager';

// Types
export type {
  BaseSession,
  StalenessRule,
  StaleSession,
  PersistenceStrategy,
  LifecycleHooks,
  SessionLifecycleConfig,
} from './types';

// Persistence strategies
export { InMemoryPersistence, ApiPersistence } from './persistence';
export type { ApiPersistenceConfig } from './persistence';

// Staleness rules
export { statusTimeout, noHeartbeat, maxAge, MINUTES, HOURS, DAYS } from './rules';

// Presets (subsystem-specific factories)
export {
  createClaudeCodeLifecycle,
  createCLILifecycle,
  createTerminalLifecycle,
  createRemoteDeviceLifecycle,
} from './presets';

export type {
  ClaudeCodeSession,
  CLISession,
  TerminalSessionEntry,
  RemoteDeviceSession,
} from './presets';
