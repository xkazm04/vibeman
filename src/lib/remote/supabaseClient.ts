/**
 * Shared Supabase Client for Remote API Routes
 *
 * Provides a singleton Supabase client that is reused across all remote API
 * route handlers, avoiding the overhead of creating a new client per request.
 *
 * The client is lazily initialized and automatically reconfigured when the
 * remote config changes (detected by URL change).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getActiveRemoteConfig } from './config.server';

let sharedClient: SupabaseClient | null = null;
let configuredUrl: string | null = null;

/**
 * Get or create a shared Supabase client for remote API routes.
 * Returns null if remote is not configured.
 *
 * Automatically recreates the client if the config URL changes.
 */
export function getRemoteSupabase(): SupabaseClient | null {
  const config = getActiveRemoteConfig();
  if (!config) return null;

  // Recreate if config changed or not yet created
  if (!sharedClient || configuredUrl !== config.url) {
    sharedClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    configuredUrl = config.url;
  }

  return sharedClient;
}
