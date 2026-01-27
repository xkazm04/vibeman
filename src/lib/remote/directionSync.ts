/**
 * Direction Sync Module
 * Syncs pending directions to Supabase vibeman_events table
 */

import { createClient } from '@supabase/supabase-js';
import { getActiveRemoteConfig } from './config.server';

export interface DirectionSyncResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Sync pending directions to Supabase
 * @param projectId - The project ID to sync directions for
 * @param projectName - The human-readable project name
 * @returns Result with success status and count of synced directions
 */
export async function syncPendingDirections(
  projectId: string,
  projectName: string
): Promise<DirectionSyncResult> {
  try {
    // Get remote config
    const config = getActiveRemoteConfig();
    if (!config) {
      return {
        success: false,
        count: 0,
        error: 'Remote not configured. Please set up Supabase connection first.',
      };
    }

    // Get pending directions from database
    // Dynamic import to avoid circular dependencies
    const { directionRepository } = await import('@/app/db/repositories/direction.repository');
    const pendingDirections = directionRepository.getPendingDirections(projectId);

    if (pendingDirections.length === 0) {
      return {
        success: true,
        count: 0,
      };
    }

    // Create Supabase client
    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Build events to insert
    const events = pendingDirections.map((direction) => ({
      event_type: 'direction_pending',
      project_id: projectId,
      project_name: projectName,
      payload: {
        direction_id: direction.id,
        summary: direction.summary,
        direction: direction.direction,
        context_name: direction.context_name || direction.context_map_title,
      },
      source: 'vibeman_sync',
    }));

    // Insert into Supabase
    const { error } = await supabase.from('vibeman_events').insert(events);

    if (error) {
      console.error('[DirectionSync] Supabase error:', error);
      return {
        success: false,
        count: 0,
        error: error.message,
      };
    }

    console.log(`[DirectionSync] Synced ${events.length} directions to Supabase`);

    return {
      success: true,
      count: events.length,
    };
  } catch (error) {
    console.error('[DirectionSync] Error:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error syncing directions',
    };
  }
}
