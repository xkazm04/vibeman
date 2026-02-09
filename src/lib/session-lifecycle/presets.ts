/**
 * Lifecycle Presets
 *
 * Pre-configured SessionLifecycleManager instances for each subsystem.
 * These replace the bespoke lifecycle logic that was duplicated across
 * Claude Code, CLI, Automation, Terminal, and Remote Device sessions.
 *
 * Usage:
 *   import { createClaudeCodeLifecycle } from '@/lib/session-lifecycle/presets';
 *   const lifecycle = createClaudeCodeLifecycle();
 *   lifecycle.start();
 */

import { SessionLifecycleManager } from './SessionLifecycleManager';
import { InMemoryPersistence, ApiPersistence } from './persistence';
import { statusTimeout, noHeartbeat, maxAge, MINUTES, HOURS, DAYS } from './rules';
import type { BaseSession, SessionLifecycleConfig, LifecycleHooks } from './types';

// ============================================================================
// 1. CLAUDE CODE SESSIONS (Database-backed via API)
// ============================================================================

export interface ClaudeCodeSession extends BaseSession {
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  projectId: string;
  name: string;
  claudeSessionId: string | null;
  taskIds: string[];
  contextTokens: number;
}

export function createClaudeCodeLifecycle(
  projectId?: string,
  hooks?: LifecycleHooks<ClaudeCodeSession>
): SessionLifecycleManager<ClaudeCodeSession> {
  const queryParams: Record<string, string> = {};
  if (projectId) queryParams.projectId = projectId;

  const config: SessionLifecycleConfig<ClaudeCodeSession> = {
    name: 'claude-code',
    persistence: new ApiPersistence<ClaudeCodeSession>({
      baseUrl: '/api/claude-code/sessions',
      heartbeatUrl: '/api/claude-code/sessions/heartbeat',
      queryParams,
      parseResponse: (data) => {
        const d = data as { sessions?: ClaudeCodeSession[] };
        return d.sessions ?? [];
      },
    }),
    stalenessRules: [
      noHeartbeat('no_heartbeat', ['running'], MINUTES(30)),
      statusTimeout('stale_paused', 'paused', HOURS(48)),
      statusTimeout('stale_pending', 'pending', HOURS(2), true),
    ],
    heartbeatIntervalMs: 0, // Heartbeat is event-driven, not automatic
    scanIntervalMs: MINUTES(5),
    maxSessionAgeMs: 0, // No age-based cleanup; uses staleness rules
    activeStatuses: ['pending', 'running', 'paused'],
    hooks,
  };

  return new SessionLifecycleManager(config);
}

// ============================================================================
// 2. CLI SESSIONS (localStorage via Zustand)
// ============================================================================

export interface CLISession extends BaseSession {
  status: 'idle' | 'running' | 'pending';
  projectPath: string | null;
  isRunning: boolean;
  autoStart: boolean;
  completedCount: number;
  hasRunningTask: boolean;
  hasPendingTasks: boolean;
}

/**
 * CLI sessions use state-based staleness (not time-based).
 * The lifecycle manager provides structure; actual recovery logic is in hooks.
 */
export function createCLILifecycle(
  hooks?: LifecycleHooks<CLISession>
): SessionLifecycleManager<CLISession> {
  const config: SessionLifecycleConfig<CLISession> = {
    name: 'cli',
    persistence: new InMemoryPersistence<CLISession>(),
    stalenessRules: [
      // CLI uses state-based detection: running task but isRunning=false means crash
      {
        name: 'crashed_execution',
        isStale: (session) =>
          session.hasRunningTask && !session.isRunning,
      },
    ],
    heartbeatIntervalMs: 0, // Event-driven via SSE
    scanIntervalMs: 0, // Recovery is on-mount, not polling
    maxSessionAgeMs: 0,
    activeStatuses: ['running', 'pending'],
    hooks,
  };

  return new SessionLifecycleManager(config);
}

// ============================================================================
// 3. TERMINAL SESSIONS (In-memory Map)
// ============================================================================

export interface TerminalSessionEntry extends BaseSession {
  status: 'idle' | 'running' | 'waiting_approval' | 'completed' | 'error';
  projectPath: string;
  messageCount: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  lastPrompt?: string;
}

export function createTerminalLifecycle(
  hooks?: LifecycleHooks<TerminalSessionEntry>
): SessionLifecycleManager<TerminalSessionEntry> {
  const config: SessionLifecycleConfig<TerminalSessionEntry> = {
    name: 'terminal',
    persistence: new InMemoryPersistence<TerminalSessionEntry>(),
    stalenessRules: [
      maxAge('old_session', DAYS(1), ['running', 'waiting_approval']),
    ],
    heartbeatIntervalMs: 0, // Event-driven
    scanIntervalMs: 0, // Manual cleanup
    maxSessionAgeMs: DAYS(1),
    activeStatuses: ['running', 'waiting_approval'],
    hooks,
  };

  return new SessionLifecycleManager(config);
}

// ============================================================================
// 4. REMOTE DEVICE SESSIONS (External registry via API)
// ============================================================================

export interface RemoteDeviceSession extends BaseSession {
  status: 'online' | 'busy' | 'idle' | 'offline';
  deviceId: string;
  deviceName: string;
  activeSessions: number;
}

export function createRemoteDeviceLifecycle(
  hooks?: LifecycleHooks<RemoteDeviceSession>
): SessionLifecycleManager<RemoteDeviceSession> {
  const config: SessionLifecycleConfig<RemoteDeviceSession> = {
    name: 'remote-device',
    persistence: new ApiPersistence<RemoteDeviceSession>({
      baseUrl: '/api/remote/devices',
      heartbeatUrl: '/api/remote/devices/heartbeat',
      queryParams: { online: 'true' },
      parseResponse: (data) => {
        const d = data as { devices?: RemoteDeviceSession[] };
        return d.devices ?? [];
      },
    }),
    stalenessRules: [
      noHeartbeat('device_offline', ['online', 'busy'], MINUTES(2)),
    ],
    heartbeatIntervalMs: 30_000, // 30s heartbeat
    scanIntervalMs: 30_000, // 30s device refresh
    maxSessionAgeMs: 0,
    activeStatuses: ['online', 'busy'],
    hooks,
  };

  return new SessionLifecycleManager(config);
}
