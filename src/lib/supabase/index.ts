/**
 * Supabase Integration Entry Point
 * Provides centralized access to Supabase client and sync utilities
 */

export {
  createSupabaseClient,
  getSupabaseConfig,
  isSupabaseConfigured,
  testSupabaseConnection,
  type SupabaseConfig
} from './client';

export {
  syncAllTables,
  getSyncStatus,
  type SyncResult,
  type SyncSummary
} from './sync';

export {
  pullIdeasFromSupabase,
  getSupabaseIdeasCount,
  type PullResult
} from './pull';
