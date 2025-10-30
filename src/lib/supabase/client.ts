/**
 * Supabase Client for Database Sync
 * Provides server-side connection to Supabase for syncing operations
 */

import { createClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Check if Supabase is configured with environment variables
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return !!(url && key);
}

/**
 * Get Supabase configuration from environment variables
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn('[Supabase] Missing configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
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
 * Test the Supabase connection
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getSupabaseConfig();

    if (!config) {
      return {
        success: false,
        error: 'Supabase is not configured. Please set environment variables.'
      };
    }

    const supabase = createSupabaseClient();

    // Try a simple query to test the connection
    const { error } = await supabase.from('sync_metadata').select('id').limit(1);

    if (error) {
      // If sync_metadata doesn't exist, try to create it
      if (error.code === '42P01') {
        return {
          success: false,
          error: 'Tables not found. Please run the Supabase schema migration first.'
        };
      }

      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
