/**
 * Remote Message Broker (Client-Safe Exports)
 * Supabase-based event publishing for third-party integration
 *
 * This module exports only client-safe code (no database dependencies).
 * For server-side config/command handling, import directly from:
 * - './config.server' for database config
 * - './commandProcessor' for command processing
 * - './commandHandlers' for handler registration
 */

// Types (client-safe)
export * from './types';

// Event publisher (client-safe - uses Supabase JS client)
export { remoteEvents, getRemoteEventPublisher } from './eventPublisher';

// Client-safe config utilities
export { initializeRemoteServices, isRemoteReady } from './config';

// Healthcheck publisher (client-safe)
export {
  startHealthcheckPublishing,
  stopHealthcheckPublishing,
  publishHealthcheckNow,
  isHealthcheckPublishing,
  getHealthcheckPublisher,
} from './healthcheckPublisher';
