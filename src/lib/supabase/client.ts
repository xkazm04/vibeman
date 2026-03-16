/**
 * Supabase Client for Database Sync
 * Provides server-side connection to Supabase for syncing operations
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/utils/logger';
import { env } from '@/lib/config/envConfig';

const logger = createLogger('Supabase');

export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Check if Supabase is configured with environment variables
 * For server-side: checks service role key
 * For client-side: checks anon key (NEXT_PUBLIC_ prefix)
 */
export function isSupabaseConfigured(): boolean {
  return env.isSupabaseConfigured();
}

/**
 * Get Supabase configuration from environment variables
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = env.supabaseUrl();
  const serviceRoleKey = env.supabaseServiceRoleKey();

  if (!url || url === 'https://your-project.supabase.co' || !serviceRoleKey) {
    logger.warn('Missing configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  return {
    url,
    serviceRoleKey
  };
}

/**
 * Create a Supabase client for server-side operations
 * Uses service role key to bypass RLS
 */
export function createSupabaseClient() {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create a connection test error result
 */
function createConnectionError(errorMessage: string): { success: false; error: string } {
  return {
    success: false,
    error: errorMessage
  };
}

/**
 * Check if error indicates missing tables
 */
function isMissingTablesError(errorCode?: string): boolean {
  return errorCode === '42P01';
}

/**
 * Test the Supabase connection
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getSupabaseConfig();

    if (!config) {
      return createConnectionError('Supabase is not configured. Please set environment variables.');
    }

    const supabase = createSupabaseClient();

    // Try a simple query to test the connection
    const { error } = await supabase.from('sync_metadata').select('id').limit(1);

    if (error) {
      // If sync_metadata doesn't exist, return specific error
      if (isMissingTablesError(error.code)) {
        return createConnectionError('Tables not found. Please run the Supabase schema migration first.');
      }

      return createConnectionError(error.message);
    }

    return { success: true };
  } catch (error) {
    return createConnectionError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
