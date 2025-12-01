/**
 * Supabase Pull Sync Utilities
 * Handles pulling data from Supabase to SQLite
 */

import { createSupabaseClient } from './client';
import { ideaDb } from '@/app/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('Pull');

export interface PullResult {
  success: boolean;
  recordCount?: number;
  error?: string;
  deletedCount?: number;
}

interface SupabaseIdea {
  id: string;
  scan_id: string;
  project_id: string;
  context_id: string | null;
  scan_type: string;
  category: string | null;
  title: string;
  description: string | null;
  reasoning: string | null;
  status: string | null;
  user_feedback: string | null;
  user_pattern: number | boolean;
  effort: number | null;
  impact: number | null;
}

/**
 * Get error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Fetch ideas from Supabase
 */
async function fetchIdeasFromSupabase(supabase: SupabaseClient): Promise<SupabaseIdea[]> {
  const { data: supabaseIdeas, error: fetchError } = await supabase
    .from('ideas')
    .select('*')
    .order('created_at', { ascending: false });

  if (fetchError) {
    throw new Error(`Failed to fetch ideas from Supabase: ${fetchError.message}`);
  }

  return supabaseIdeas || [];
}

/**
 * Convert Supabase idea to SQLite format
 */
function convertSupabaseIdeaToSQLite(idea: SupabaseIdea) {
  // Validate status value
  const validStatuses = ['pending', 'accepted', 'rejected', 'implemented'] as const;
  const status = validStatuses.includes(idea.status as typeof validStatuses[number])
    ? (idea.status as typeof validStatuses[number])
    : 'pending';

  return {
    id: idea.id,
    scan_id: idea.scan_id,
    project_id: idea.project_id,
    context_id: idea.context_id || null,
    scan_type: idea.scan_type,
    category: idea.category || 'general',
    title: idea.title,
    description: idea.description || undefined,
    reasoning: idea.reasoning || undefined,
    status,
    user_feedback: idea.user_feedback || undefined,
    user_pattern: idea.user_pattern === 1 || idea.user_pattern === true,
    effort: idea.effort || null,
    impact: idea.impact || null
  };
}

/**
 * Insert a single idea into SQLite
 */
function insertIdeaToSQLite(idea: SupabaseIdea): boolean {
  try {
    const ideaData = convertSupabaseIdeaToSQLite(idea);
    ideaDb.createIdea(ideaData);
    return true;
  } catch (error) {
    logger.error(`Failed to insert idea ${idea.id}:`, error);
    return false;
  }
}

/**
 * Insert ideas into SQLite
 */
function insertIdeasToSQLite(ideas: SupabaseIdea[]): number {
  let insertedCount = 0;
  for (const idea of ideas) {
    if (insertIdeaToSQLite(idea)) {
      insertedCount++;
    }
  }
  return insertedCount;
}

/**
 * Create a successful pull result
 */
function createSuccessfulPullResult(insertedCount: number, deletedCount: number): PullResult {
  return {
    success: true,
    recordCount: insertedCount,
    deletedCount
  };
}

/**
 * Create an empty pull result (no records found)
 */
function createEmptyPullResult(): PullResult {
  return {
    success: true,
    recordCount: 0,
    deletedCount: 0
  };
}

/**
 * Create a failed pull result
 */
function createFailedPullResult(errorMessage: string): PullResult {
  return {
    success: false,
    error: errorMessage
  };
}

/**
 * Replace local ideas with Supabase data
 */
function replaceLocalIdeas(supabaseIdeas: SupabaseIdea[]): { deletedCount: number; insertedCount: number } {
  const deletedCount = ideaDb.deleteAllIdeas();
  logger.info(`Deleted ${deletedCount} existing ideas from SQLite`);

  const insertedCount = insertIdeasToSQLite(supabaseIdeas);
  logger.info(`Successfully synced ${insertedCount} ideas from Supabase`);

  return { deletedCount, insertedCount };
}

/**
 * Pull ideas from Supabase and replace SQLite data
 * This performs a full replace: deletes all local ideas and inserts from Supabase
 */
export async function pullIdeasFromSupabase(): Promise<PullResult> {
  try {
    logger.info('Starting ideas sync from Supabase to SQLite...');
    const supabase = createSupabaseClient();

    const supabaseIdeas = await fetchIdeasFromSupabase(supabase);

    if (supabaseIdeas.length === 0) {
      logger.info('No ideas found in Supabase');
      return createEmptyPullResult();
    }

    logger.info(`Found ${supabaseIdeas.length} ideas in Supabase`);

    const { deletedCount, insertedCount } = replaceLocalIdeas(supabaseIdeas);

    return createSuccessfulPullResult(insertedCount, deletedCount);

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Error syncing ideas from Supabase:', errorMessage);

    return createFailedPullResult(errorMessage);
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
    const errorMessage = getErrorMessage(error);
    logger.error('Error getting Supabase ideas count:', errorMessage);

    return {
      success: false,
      error: errorMessage
    };
  }
}
