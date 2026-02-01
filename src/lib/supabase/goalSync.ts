/**
 * Goal Sync Service
 * Provides non-blocking sync utilities for goals to Supabase
 * SQLite remains the primary source of truth
 */

import { createSupabaseClient, isSupabaseConfigured } from './client';
import { goalDb } from '@/app/db';
import { createLogger } from '@/lib/utils/logger';
import type { DbGoal } from '@/app/db/models/types';
import type { Database } from '@/lib/supabase';

const logger = createLogger('GoalSync');

// ============================================================================
// ERROR DIAGNOSTICS
// ============================================================================

/**
 * Sync error codes for structured error handling
 */
export type SupabaseSyncErrorCode =
  | 'NOT_CONFIGURED'
  | 'AUTH_FAILED'
  | 'NETWORK_ERROR'
  | 'TABLE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Structured sync error with actionable guidance
 */
export interface SupabaseSyncError {
  code: SupabaseSyncErrorCode;
  message: string;
  action: string;
  goalId: string;
  details?: string;
}

/**
 * Diagnose error and provide actionable guidance
 */
function diagnoseSupabaseError(error: unknown, goalId: string): SupabaseSyncError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  // Check for authentication issues
  if (errorLower.includes('jwt') || errorLower.includes('token') || errorLower.includes('auth') || errorLower.includes('apikey')) {
    return {
      code: 'AUTH_FAILED',
      message: `Supabase authentication failed for goal ${goalId}`,
      action: 'Check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local - ensure it matches your Supabase project settings',
      goalId,
      details: errorMessage,
    };
  }

  // Check for network/connection issues
  if (errorLower.includes('fetch') || errorLower.includes('network') || errorLower.includes('econnrefused') || errorLower.includes('timeout')) {
    return {
      code: 'NETWORK_ERROR',
      message: `Network error syncing goal ${goalId} to Supabase`,
      action: 'Check your internet connection and verify NEXT_PUBLIC_SUPABASE_URL is correct in .env.local',
      goalId,
      details: errorMessage,
    };
  }

  // Check for table/schema issues
  if (errorLower.includes('relation') || errorLower.includes('table') || errorLower.includes('does not exist')) {
    return {
      code: 'TABLE_NOT_FOUND',
      message: `Supabase "goals" table not found for goal ${goalId}`,
      action: 'Run Supabase migrations or create the "goals" table in your Supabase dashboard',
      goalId,
      details: errorMessage,
    };
  }

  // Check for permission issues
  if (errorLower.includes('permission') || errorLower.includes('denied') || errorLower.includes('policy') || errorLower.includes('rls')) {
    return {
      code: 'PERMISSION_DENIED',
      message: `Permission denied syncing goal ${goalId} to Supabase`,
      action: 'Check Row Level Security (RLS) policies on the "goals" table in Supabase dashboard',
      goalId,
      details: errorMessage,
    };
  }

  // Check for validation errors
  if (errorLower.includes('violates') || errorLower.includes('constraint') || errorLower.includes('invalid')) {
    return {
      code: 'VALIDATION_ERROR',
      message: `Data validation failed for goal ${goalId}`,
      action: 'Check goal data matches Supabase schema - ensure all required fields are present',
      goalId,
      details: errorMessage,
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN_ERROR',
    message: `Unexpected error syncing goal ${goalId} to Supabase`,
    action: 'Check Supabase dashboard logs for more details',
    goalId,
    details: errorMessage,
  };
}

/**
 * Log structured sync error with actionable guidance
 */
function logSyncError(syncError: SupabaseSyncError, operation: string): void {
  logger.warn(
    `[${syncError.code}] ${syncError.message}\n` +
    `  Operation: ${operation}\n` +
    `  Action: ${syncError.action}` +
    (syncError.details ? `\n  Details: ${syncError.details}` : '')
  );
}

// Re-export for convenience
export { isSupabaseConfigured };

// ============================================================================
// TYPES
// ============================================================================

export interface GoalSyncResult {
  success: boolean;
  operation: 'create' | 'update' | 'delete';
  goalId: string;
  error?: string;
}

export interface BatchSyncResult {
  success: boolean;
  goalsCount: number;
  errors: string[];
}

type SupabaseGoalInsert = Database['public']['Tables']['goals']['Insert'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Convert DbGoal to Supabase insert format
 */
function toSupabaseGoal(goal: DbGoal): SupabaseGoalInsert {
  return {
    id: goal.id,
    project_id: goal.project_id,
    context_id: goal.context_id,
    order_index: goal.order_index,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    created_at: goal.created_at,
    updated_at: goal.updated_at,
    // Extended fields - these may not exist on basic DbGoal
    // The upsert will handle null values gracefully
  };
}

// ============================================================================
// CORE SYNC FUNCTIONS
// ============================================================================

/**
 * Sync a single goal to Supabase (upsert)
 * Non-blocking - returns result but doesn't throw
 * Logs structured errors with actionable guidance on failure
 */
export async function syncGoalToSupabase(goal: DbGoal): Promise<GoalSyncResult> {
  if (!isSupabaseConfigured()) {
    return { success: true, operation: 'update', goalId: goal.id }; // No-op if not configured
  }

  try {
    const supabase = createSupabaseClient();
    const supabaseGoal = toSupabaseGoal(goal);

    const { error } = await supabase
      .from('goals')
      .upsert(supabaseGoal, { onConflict: 'id' });

    if (error) {
      const syncError = diagnoseSupabaseError(error, goal.id);
      logSyncError(syncError, `upsert goal "${goal.title}"`);
      return { success: false, operation: 'update', goalId: goal.id, error: syncError.message };
    }

    logger.info(`Goal ${goal.id} synced to Supabase`);
    return { success: true, operation: 'update', goalId: goal.id };

  } catch (error) {
    const syncError = diagnoseSupabaseError(error, goal.id);
    logSyncError(syncError, `upsert goal "${goal.title}"`);
    return { success: false, operation: 'update', goalId: goal.id, error: syncError.message };
  }
}

/**
 * Delete a goal from Supabase
 * Non-blocking - returns result but doesn't throw
 * Logs structured errors with actionable guidance on failure
 */
export async function deleteGoalFromSupabase(goalId: string): Promise<GoalSyncResult> {
  if (!isSupabaseConfigured()) {
    return { success: true, operation: 'delete', goalId }; // No-op if not configured
  }

  try {
    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      const syncError = diagnoseSupabaseError(error, goalId);
      logSyncError(syncError, `delete goal ${goalId}`);
      return { success: false, operation: 'delete', goalId, error: syncError.message };
    }

    logger.info(`Goal ${goalId} deleted from Supabase`);
    return { success: true, operation: 'delete', goalId };

  } catch (error) {
    const syncError = diagnoseSupabaseError(error, goalId);
    logSyncError(syncError, `delete goal ${goalId}`);
    return { success: false, operation: 'delete', goalId, error: syncError.message };
  }
}

/**
 * Batch sync all goals for a project to Supabase
 * Used for manual sync from GoalHub UI
 */
export async function batchSyncGoals(projectId: string): Promise<BatchSyncResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, goalsCount: 0, errors: ['Supabase is not configured'] };
  }

  const errors: string[] = [];

  try {
    const supabase = createSupabaseClient();

    // Fetch all goals for the project from SQLite
    const goals = goalDb.getGoalsByProject(projectId);

    if (goals.length === 0) {
      logger.info(`No goals to sync for project ${projectId}`);
      return { success: true, goalsCount: 0, errors: [] };
    }

    // Convert goals to Supabase format
    const supabaseGoals = goals.map(toSupabaseGoal);

    // First, delete existing goals for this project in Supabase
    const { error: deleteError } = await supabase
      .from('goals')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      errors.push(`Failed to clear existing goals: ${deleteError.message}`);
      // Continue anyway - upsert should still work
    }

    // Upsert all goals
    const { error: upsertError } = await supabase
      .from('goals')
      .upsert(supabaseGoals, { onConflict: 'id' });

    if (upsertError) {
      errors.push(`Failed to upsert goals: ${upsertError.message}`);
      return { success: false, goalsCount: 0, errors };
    }

    logger.info(`Batch synced ${goals.length} goals for project ${projectId}`);
    return { success: true, goalsCount: goals.length, errors };

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(`Batch sync failed for project ${projectId}:`, errorMessage);
    errors.push(errorMessage);
    return { success: false, goalsCount: 0, errors };
  }
}

// ============================================================================
// FIRE-AND-FORGET WRAPPER
// ============================================================================

/**
 * Fire-and-forget wrapper for non-blocking sync operations
 * Executes the sync function asynchronously without blocking the caller
 * All errors are caught and logged with actionable guidance - never throws
 */
export function fireAndForgetSync<T>(
  syncFn: () => Promise<T>,
  context: string
): void {
  // Use Promise.resolve().then() to push execution to next microtask
  // This ensures the caller is not blocked
  Promise.resolve().then(async () => {
    try {
      await syncFn();
    } catch (error) {
      // Extract goal ID from context if possible (format: "Create goal <id>")
      const goalIdMatch = context.match(/goal\s+([a-f0-9-]+)/i);
      const goalId = goalIdMatch ? goalIdMatch[1] : 'unknown';

      const syncError = diagnoseSupabaseError(error, goalId);
      logSyncError(syncError, context);
    }
  });
}
