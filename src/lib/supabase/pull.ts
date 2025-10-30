/**
 * Supabase Pull Sync Utilities
 * Handles pulling data from Supabase to SQLite
 */

import { createSupabaseClient } from './client';
import { ideaDb } from '@/app/db';

export interface PullResult {
  success: boolean;
  recordCount?: number;
  error?: string;
  deletedCount?: number;
}

/**
 * Pull ideas from Supabase and replace SQLite data
 * This performs a full replace: deletes all local ideas and inserts from Supabase
 */
export async function pullIdeasFromSupabase(): Promise<PullResult> {
  try {
    console.log('[Pull] Starting ideas sync from Supabase to SQLite...');
    const supabase = createSupabaseClient();

    // Fetch all ideas from Supabase
    const { data: supabaseIdeas, error: fetchError } = await supabase
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch ideas from Supabase: ${fetchError.message}`);
    }

    if (!supabaseIdeas) {
      console.log('[Pull] No ideas found in Supabase');
      return {
        success: true,
        recordCount: 0,
        deletedCount: 0
      };
    }

    console.log(`[Pull] Found ${supabaseIdeas.length} ideas in Supabase`);

    // Delete all existing ideas in SQLite
    const deletedCount = ideaDb.deleteAllIdeas();
    console.log(`[Pull] Deleted ${deletedCount} existing ideas from SQLite`);

    // Insert all ideas from Supabase to SQLite
    let insertedCount = 0;
    for (const idea of supabaseIdeas) {
      try {
        ideaDb.createIdea({
          id: idea.id,
          scan_id: idea.scan_id,
          project_id: idea.project_id,
          context_id: idea.context_id || null,
          scan_type: idea.scan_type,
          category: idea.category || 'general',
          title: idea.title,
          description: idea.description || undefined,
          reasoning: idea.reasoning || undefined,
          status: idea.status || 'pending',
          user_feedback: idea.user_feedback || undefined,
          user_pattern: idea.user_pattern === 1 || idea.user_pattern === true,
          effort: idea.effort || null,
          impact: idea.impact || null
        });
        insertedCount++;
      } catch (error) {
        console.error(`[Pull] Failed to insert idea ${idea.id}:`, error);
        // Continue with next idea instead of failing the entire sync
      }
    }

    console.log(`[Pull] Successfully synced ${insertedCount} ideas from Supabase`);

    return {
      success: true,
      recordCount: insertedCount,
      deletedCount
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pull] Error syncing ideas from Supabase:', errorMessage);

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Get ideas count from Supabase for comparison
 */
export async function getSupabaseIdeasCount(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = createSupabaseClient();

    const { count, error } = await supabase
      .from('ideas')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    return {
      success: true,
      count: count || 0
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pull] Error getting Supabase ideas count:', errorMessage);

    return {
      success: false,
      error: errorMessage
    };
  }
}
