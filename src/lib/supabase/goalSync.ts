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
      logger.warn(`Failed to sync goal ${goal.id} to Supabase:`, error.message);
      return { success: false, operation: 'update', goalId: goal.id, error: error.message };
    }

    logger.info(`Goal ${goal.id} synced to Supabase`);
    return { success: true, operation: 'update', goalId: goal.id };

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.warn(`Error syncing goal ${goal.id}:`, errorMessage);
    return { success: false, operation: 'update', goalId: goal.id, error: errorMessage };
  }
}

/**
 * Delete a goal from Supabase
 * Non-blocking - returns result but doesn't throw
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
      logger.warn(`Failed to delete goal ${goalId} from Supabase:`, error.message);
      return { success: false, operation: 'delete', goalId, error: error.message };
    }

    logger.info(`Goal ${goalId} deleted from Supabase`);
    return { success: true, operation: 'delete', goalId };

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.warn(`Error deleting goal ${goalId}:`, errorMessage);
    return { success: false, operation: 'delete', goalId, error: errorMessage };
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
 * All errors are caught and logged - never throws
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
      const errorMessage = getErrorMessage(error);
      logger.warn(`Fire-and-forget sync failed [${context}]:`, errorMessage);
    }
  });
}
