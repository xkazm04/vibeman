/**
 * Database Sync Utilities
 * Handles syncing data from SQLite to Supabase
 */

import { createSupabaseClient } from './client';
import { getDatabase } from '@/app/db/connection';
import { projectDb } from '@/lib/project_database';

export interface SyncResult {
  success: boolean;
  tableName: string;
  recordCount?: number;
  error?: string;
}

export interface SyncSummary {
  success: boolean;
  timestamp: string;
  results: SyncResult[];
  totalRecords: number;
  failedTables: string[];
}

/**
 * Tables to sync in order (respecting foreign key dependencies)
 */
const SYNC_ORDER = [
  'projects',
  'context_groups',
  'contexts',
  'goals',
  'events',
  'scans',
  'ideas',
  'backlog_items',
  'implementation_log'
];

/**
 * Update sync metadata in Supabase
 */
async function updateSyncMetadata(
  supabase: any,
  tableName: string,
  status: 'success' | 'failed' | 'in_progress',
  recordCount?: number,
  errorMessage?: string
) {
  const metadata = {
    table_name: tableName,
    last_sync_at: new Date().toISOString(),
    record_count: recordCount || 0,
    sync_status: status,
    error_message: errorMessage || null,
    updated_at: new Date().toISOString()
  };

  // Upsert the metadata
  const { error } = await supabase
    .from('sync_metadata')
    .upsert(metadata, { onConflict: 'table_name' });

  if (error) {
    console.error(`[Sync] Failed to update metadata for ${tableName}:`, error);
  }
}

/**
 * Sync a single table from SQLite to Supabase
 */
async function syncTable(supabase: any, tableName: string): Promise<SyncResult> {
  try {
    console.log(`[Sync] Starting sync for table: ${tableName}`);
    await updateSyncMetadata(supabase, tableName, 'in_progress');

    // Get data from SQLite
    let records: any[] = [];

    if (tableName === 'projects') {
      records = projectDb.getAllProjects();
    } else {
      const db = getDatabase();
      const stmt = db.prepare(`SELECT * FROM ${tableName}`);
      records = stmt.all();
    }

    console.log(`[Sync] Found ${records.length} records in ${tableName}`);

    if (records.length === 0) {
      await updateSyncMetadata(supabase, tableName, 'success', 0);
      return {
        success: true,
        tableName,
        recordCount: 0
      };
    }

    // Delete all existing records in Supabase for this table (replace mode)
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', ''); // Delete all records

    if (deleteError) {
      throw new Error(`Failed to clear existing data: ${deleteError.message}`);
    }

    // Insert all records in batches (Supabase has a limit on batch size)
    const BATCH_SIZE = 1000;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(batch);

      if (insertError) {
        throw new Error(`Failed to insert batch: ${insertError.message}`);
      }

      totalInserted += batch.length;
      console.log(`[Sync] Inserted ${totalInserted}/${records.length} records for ${tableName}`);
    }

    await updateSyncMetadata(supabase, tableName, 'success', totalInserted);

    return {
      success: true,
      tableName,
      recordCount: totalInserted
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Sync] Error syncing table ${tableName}:`, errorMessage);

    await updateSyncMetadata(supabase, tableName, 'failed', 0, errorMessage);

    return {
      success: false,
      tableName,
      error: errorMessage
    };
  }
}

/**
 * Sync all tables from SQLite to Supabase
 * @param stopOnError - If true, stop syncing on first error. If false, continue with remaining tables.
 */
export async function syncAllTables(stopOnError: boolean = false): Promise<SyncSummary> {
  const timestamp = new Date().toISOString();
  const results: SyncResult[] = [];
  let totalRecords = 0;

  try {
    console.log('[Sync] Starting database sync to Supabase...');
    const supabase = createSupabaseClient();

    // Sync each table in order
    for (const tableName of SYNC_ORDER) {
      const result = await syncTable(supabase, tableName);
      results.push(result);

      if (result.success) {
        totalRecords += result.recordCount || 0;
      } else if (stopOnError) {
        // Stop syncing if we encounter an error and stopOnError is true
        console.error(`[Sync] Stopping sync due to error in ${tableName}`);
        break;
      }
    }

    const failedTables = results.filter(r => !r.success).map(r => r.tableName);
    const allSuccess = failedTables.length === 0;

    console.log(`[Sync] Sync completed. Total records: ${totalRecords}, Failed tables: ${failedTables.length}`);

    return {
      success: allSuccess,
      timestamp,
      results,
      totalRecords,
      failedTables
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Fatal error during sync:', errorMessage);

    return {
      success: false,
      timestamp,
      results,
      totalRecords,
      failedTables: SYNC_ORDER.filter(table => !results.find(r => r.tableName === table && r.success))
    };
  }
}

/**
 * Get sync status for all tables from Supabase
 */
export async function getSyncStatus(): Promise<{
  success: boolean;
  metadata?: Array<{
    table_name: string;
    last_sync_at: string | null;
    record_count: number;
    sync_status: string | null;
    error_message: string | null;
  }>;
  error?: string;
}> {
  try {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from('sync_metadata')
      .select('*')
      .order('table_name');

    if (error) {
      throw error;
    }

    return {
      success: true,
      metadata: data || []
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Sync] Error getting sync status:', errorMessage);

    return {
      success: false,
      error: errorMessage
    };
  }
}
