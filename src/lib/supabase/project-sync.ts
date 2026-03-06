/**
 * Project Sync Service
 * Syncs local Vibeman projects to the vibeman_projects table in Supabase,
 * allowing 3rd-party apps to discover available projects.
 */

import os from 'os';
import { createSupabaseClient, isSupabaseConfigured } from './client';
import { projectDb } from '@/lib/project_database';
import type { VibemanProjectSync } from './external-types';

/**
 * Get the device identifier for this Vibeman instance.
 * Uses machine hostname for human-readable multi-device identification.
 */
export function getDeviceId(): string {
  return os.hostname();
}

/**
 * Sync all local projects to the vibeman_projects table in Supabase.
 * Uses upsert with ON CONFLICT(device_id, project_id) to avoid duplicates.
 */
export async function syncProjectsToSupabase(): Promise<{
  success: boolean;
  synced: number;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { success: false, synced: 0, error: 'Supabase is not configured' };
  }

  try {
    const supabase = createSupabaseClient();
    const deviceId = getDeviceId();
    const allProjects = projectDb.getAllProjects();

    if (allProjects.length === 0) {
      return { success: true, synced: 0 };
    }

    const records: VibemanProjectSync[] = allProjects.map((p) => ({
      device_id: deviceId,
      project_id: p.id,
      project_name: p.name,
      project_path: p.path ?? undefined,
    }));

    // Upsert: insert or update on (device_id, project_id) conflict
    const { error } = await supabase
      .from('vibeman_projects')
      .upsert(
        records.map((r) => ({
          ...r,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'device_id,project_id' }
      );

    if (error) {
      return { success: false, synced: 0, error: error.message };
    }

    return { success: true, synced: records.length };
  } catch (err) {
    return {
      success: false,
      synced: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
