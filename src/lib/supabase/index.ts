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

export {
  syncGoalToSupabase,
  deleteGoalFromSupabase,
  batchSyncGoals,
  fireAndForgetSync,
  type GoalSyncResult,
  type BatchSyncResult
} from './goalSync';

// Realtime module for cross-device Zen mode
export {
  vibemanRealtime,
  getVibemanRealtime,
  VibemanRealtime,
  getOrCreateDeviceId,
  getDeviceName,
  setDeviceName,
  generatePairingCode,
  isSupabaseRealtimeConfigured,
  type RealtimeConfig,
  type PresenceCallback,
  type TaskCallback,
  type EventCallback,
  type ConnectionCallback,
} from './realtime';

export * from './realtimeTypes';
