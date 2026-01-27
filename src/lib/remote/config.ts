/**
 * Remote Config Module (Client-Safe)
 * Client-side utilities for remote event publishing
 *
 * For server-side config (database access), use config.server.ts directly in API routes.
 */

import { remoteEvents } from './eventPublisher';

/**
 * Initialize remote services with credentials (can be called on client or server)
 * On client, this configures the event publisher for fire-and-forget publishing.
 */
export function initializeRemoteServices(url: string, serviceRoleKey: string): void {
  remoteEvents.configure(url, serviceRoleKey);
  console.log('[RemoteConfig] Event publisher initialized');
}

/**
 * Check if remote event publisher is ready
 */
export function isRemoteReady(): boolean {
  return remoteEvents.isReady();
}
