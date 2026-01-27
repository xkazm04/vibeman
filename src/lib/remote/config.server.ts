/**
 * Remote Config Module (Server-Only)
 * Stores and retrieves Supabase configuration for the remote message broker
 *
 * WARNING: This file uses better-sqlite3 and must only be imported on the server.
 * Use the client-safe exports from index.ts for client components.
 */

import type { RemoteConfig, RemoteConnectionStatus } from './types';
import { remoteEvents } from './eventPublisher';
import { commandProcessor } from './commandProcessor';

// In-memory config cache
let cachedConfig: RemoteConfig | null = null;

/**
 * Get the remote config from database (Server-only)
 */
export function getRemoteConfig(): RemoteConfig | null {
  // Return cached if available
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // Dynamic import to avoid circular dependencies
    const { getConnection } = require('@/app/db/drivers');
    const db = getConnection();

    const result = db.prepare(`
      SELECT * FROM remote_config ORDER BY created_at DESC LIMIT 1
    `).get() as RemoteConfig | undefined;

    if (result) {
      cachedConfig = result;
    }

    return result || null;
  } catch (error) {
    // Table might not exist yet
    console.warn('[RemoteConfig] Could not get config:', error);
    return null;
  }
}

/**
 * Save remote config to database (Server-only)
 */
export function saveRemoteConfig(config: Omit<RemoteConfig, 'id' | 'created_at' | 'updated_at'>): RemoteConfig {
  const { getConnection } = require('@/app/db/drivers');
  const db = getConnection();

  const id = `remote-config-${Date.now()}`;
  const now = new Date().toISOString();

  // Delete existing configs (only one config should exist)
  db.prepare('DELETE FROM remote_config').run();

  // Insert new config
  db.prepare(`
    INSERT INTO remote_config (
      id, supabase_url, supabase_anon_key, supabase_service_role_key,
      is_configured, last_validated_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    config.supabase_url,
    config.supabase_anon_key,
    config.supabase_service_role_key,
    config.is_configured ? 1 : 0,
    config.last_validated_at || null,
    now,
    now
  );

  const saved: RemoteConfig = {
    id,
    ...config,
    created_at: now,
    updated_at: now,
  };

  // Update cache
  cachedConfig = saved;

  // Configure the event publisher and command processor
  if (config.is_configured) {
    initializeRemoteServices(config.supabase_url, config.supabase_service_role_key);
  }

  return saved;
}

/**
 * Update last validated timestamp (Server-only)
 */
export function updateLastValidated(): void {
  const { getConnection } = require('@/app/db/drivers');
  const db = getConnection();

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE remote_config SET last_validated_at = ?, updated_at = ?
  `).run(now, now);

  // Update cache
  if (cachedConfig) {
    cachedConfig.last_validated_at = now;
    cachedConfig.updated_at = now;
  }
}

/**
 * Delete remote config (Server-only)
 */
export function deleteRemoteConfig(): void {
  const { getConnection } = require('@/app/db/drivers');
  const db = getConnection();

  db.prepare('DELETE FROM remote_config').run();
  cachedConfig = null;
}

/**
 * Initialize remote services with credentials
 */
export function initializeRemoteServices(url: string, serviceRoleKey: string): void {
  remoteEvents.configure(url, serviceRoleKey);
  commandProcessor.configure(url, serviceRoleKey);
  console.log('[RemoteConfig] Remote services initialized');
}

/**
 * Check if remote is configured (either from DB or env vars) (Server-only)
 */
export function isRemoteConfigured(): boolean {
  // Check env vars first
  const envUrl = process.env.REMOTE_SUPABASE_URL;
  const envKey = process.env.REMOTE_SUPABASE_SERVICE_ROLE_KEY;

  if (envUrl && envKey) {
    return true;
  }

  // Check database
  const config = getRemoteConfig();
  return config?.is_configured || false;
}

/**
 * Get active remote config (prefers env vars over database) (Server-only)
 */
export function getActiveRemoteConfig(): { url: string; anonKey: string; serviceRoleKey: string } | null {
  // Check env vars first
  const envUrl = process.env.REMOTE_SUPABASE_URL;
  const envAnonKey = process.env.REMOTE_SUPABASE_ANON_KEY;
  const envServiceKey = process.env.REMOTE_SUPABASE_SERVICE_ROLE_KEY;

  if (envUrl && envServiceKey) {
    return {
      url: envUrl,
      anonKey: envAnonKey || '',
      serviceRoleKey: envServiceKey,
    };
  }

  // Fall back to database
  const config = getRemoteConfig();
  if (config?.is_configured) {
    return {
      url: config.supabase_url,
      anonKey: config.supabase_anon_key,
      serviceRoleKey: config.supabase_service_role_key,
    };
  }

  return null;
}

/**
 * Auto-initialize on module load if env vars are set (Server-only)
 */
export function autoInitialize(): void {
  const config = getActiveRemoteConfig();
  if (config) {
    initializeRemoteServices(config.url, config.serviceRoleKey);
  }
}

/**
 * Get connection status (Server-only)
 */
export async function getConnectionStatus(): Promise<RemoteConnectionStatus> {
  const config = getActiveRemoteConfig();

  if (!config) {
    return {
      is_configured: false,
      is_connected: false,
    };
  }

  // Check if services are ready
  const publisherReady = remoteEvents.isReady();
  const processorReady = commandProcessor.isReady();

  // Get pending command count if connected
  let pendingCommands = 0;
  if (processorReady) {
    pendingCommands = await commandProcessor.getPendingCount();
  }

  const dbConfig = getRemoteConfig();

  return {
    is_configured: true,
    is_connected: publisherReady && processorReady,
    last_validated_at: dbConfig?.last_validated_at,
    pending_commands: pendingCommands,
  };
}
