/**
 * Healthcheck Publisher
 * Periodic healthcheck publishing to Supabase for remote Butler coordination
 *
 * Publishes every 30 seconds while zen mode is active, allowing Butler
 * to know when Vibeman is ready to accept remote batch commands.
 *
 * IMPORTANT: This service runs client-side only. Uses dynamic imports
 * to avoid Zustand SSR issues.
 */

import { remoteEvents } from './eventPublisher';
import type { HealthcheckPayload } from './types';

const HEALTHCHECK_INTERVAL_MS = 30_000; // 30 seconds
const MAX_SESSIONS = 4;

/**
 * Get current state from Zustand stores via dynamic import
 * This avoids SSR issues by importing stores only when needed
 */
async function getClientState(): Promise<{
  zenMode: boolean;
  activeSessions: number;
}> {
  const { useZenStore } = await import('@/app/zen/lib/zenStore');
  const { useCLISessionStore } = await import('@/components/cli/store');

  const zenMode = useZenStore.getState().mode === 'online';
  const sessions = useCLISessionStore.getState().sessions;

  // Count active sessions (where isRunning === true)
  const activeSessions = Object.values(sessions).filter(
    (session) => session.isRunning
  ).length;

  return { zenMode, activeSessions };
}

/**
 * Build healthcheck payload from current state
 */
function buildPayload(
  zenMode: boolean,
  activeSessions: number
): HealthcheckPayload {
  return {
    zen_mode: zenMode,
    active_sessions: activeSessions,
    available_slots: MAX_SESSIONS - activeSessions,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Singleton healthcheck publisher service
 */
class HealthcheckPublisher {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private projectId: string | null = null;
  private isPublishing = false;

  /**
   * Start periodic healthcheck publishing
   */
  async start(projectId: string): Promise<void> {
    if (this.isPublishing) {
      console.log('[HealthcheckPublisher] Already publishing, updating projectId');
      this.projectId = projectId;
      return;
    }

    this.projectId = projectId;
    this.isPublishing = true;

    // Publish immediately
    await this.publishNow();

    // Start periodic publishing
    this.intervalId = setInterval(async () => {
      await this.publishNow();
    }, HEALTHCHECK_INTERVAL_MS);

    console.log('[HealthcheckPublisher] Started with 30s interval for project:', projectId);
  }

  /**
   * Stop periodic healthcheck publishing
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isPublishing = false;
    console.log('[HealthcheckPublisher] Stopped');
  }

  /**
   * Publish healthcheck now (manual trigger)
   */
  async publishNow(overrideProjectId?: string): Promise<void> {
    const projectId = overrideProjectId || this.projectId;

    if (!projectId) {
      console.warn('[HealthcheckPublisher] No projectId set, skipping publish');
      return;
    }

    try {
      const { zenMode, activeSessions } = await getClientState();
      const payload = buildPayload(zenMode, activeSessions);

      remoteEvents.publish('healthcheck', payload, projectId);

      console.log(
        '[HealthcheckPublisher] Published:',
        `zen=${payload.zen_mode}, active=${payload.active_sessions}, slots=${payload.available_slots}`
      );
    } catch (error) {
      console.warn('[HealthcheckPublisher] Failed to publish:', error);
    }
  }

  /**
   * Check if currently publishing
   */
  getIsPublishing(): boolean {
    return this.isPublishing;
  }

  /**
   * Get current project ID
   */
  getProjectId(): string | null {
    return this.projectId;
  }
}

// Singleton instance
let instance: HealthcheckPublisher | null = null;

function getHealthcheckPublisher(): HealthcheckPublisher {
  if (!instance) {
    instance = new HealthcheckPublisher();
  }
  return instance;
}

// ============================================================================
// Convenience exports
// ============================================================================

/**
 * Start healthcheck publishing for a project
 */
export async function startHealthcheckPublishing(projectId: string): Promise<void> {
  return getHealthcheckPublisher().start(projectId);
}

/**
 * Stop healthcheck publishing
 */
export function stopHealthcheckPublishing(): void {
  return getHealthcheckPublisher().stop();
}

/**
 * Publish healthcheck immediately (one-off)
 */
export async function publishHealthcheckNow(projectId?: string): Promise<void> {
  return getHealthcheckPublisher().publishNow(projectId);
}

/**
 * Check if healthcheck publishing is active
 */
export function isHealthcheckPublishing(): boolean {
  return getHealthcheckPublisher().getIsPublishing();
}

/**
 * Get the HealthcheckPublisher instance (for advanced use)
 */
export { getHealthcheckPublisher };
