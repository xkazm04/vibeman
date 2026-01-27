/**
 * Requirement Sync Module
 * Syncs requirements from .claude/requirements/ to Supabase vibeman_events table
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { getActiveRemoteConfig } from './config.server';

export interface RequirementSyncResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Sync requirements to Supabase
 * @param projectId - The project ID
 * @param projectName - The human-readable project name
 * @param projectPath - The filesystem path to the project root
 * @returns Result with success status and count of synced requirements
 */
export async function syncRequirements(
  projectId: string,
  projectName: string,
  projectPath: string
): Promise<RequirementSyncResult> {
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

    // Build requirements directory path
    const requirementsDir = path.join(projectPath, '.claude', 'requirements');

    // Check if requirements directory exists
    if (!fs.existsSync(requirementsDir)) {
      return {
        success: true,
        count: 0, // No requirements directory = no requirements to sync
      };
    }

    // Read all .md files from requirements directory
    const files = fs.readdirSync(requirementsDir).filter((file) => file.endsWith('.md'));

    if (files.length === 0) {
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
    const events = files.map((filename) => {
      const filePath = path.join(requirementsDir, filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      return {
        event_type: 'requirement_pending',
        project_id: projectId,
        project_name: projectName,
        payload: {
          requirement_name: filename.replace('.md', ''),
          content,
        },
        source: 'vibeman_sync',
      };
    });

    // Insert into Supabase
    const { error } = await supabase.from('vibeman_events').insert(events);

    if (error) {
      console.error('[RequirementSync] Supabase error:', error);
      return {
        success: false,
        count: 0,
        error: error.message,
      };
    }

    console.log(`[RequirementSync] Synced ${events.length} requirements to Supabase`);

    return {
      success: true,
      count: events.length,
    };
  } catch (error) {
    console.error('[RequirementSync] Error:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error syncing requirements',
    };
  }
}
