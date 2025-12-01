/**
 * Database Sync Utilities
 * Handles syncing data from SQLite to Supabase
 */

import { createSupabaseClient } from './client';
import { getDatabase } from '@/app/db/connection';
import { projectDb } from '@/lib/project_database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('Sync');

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

interface SyncMetadata {
  table_name: string;
  last_sync_at: string;
  record_count: number;
  sync_status: 'success' | 'failed' | 'in_progress';
  error_message: string | null;
  updated_at: string;
}

interface TableRecord {
  [key: string]: unknown;
}

type SyncStatus = 'success' | 'failed' | 'in_progress';

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
] as const;

const BATCH_SIZE = 1000;

/**
 * Get error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Get current ISO timestamp
 */
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Update sync metadata in Supabase
 */
async function updateSyncMetadata(
  supabase: SupabaseClient,
  tableName: string,
  status: SyncStatus,
  recordCount?: number,
  errorMessage?: string
): Promise<void> {
  const metadata: SyncMetadata = {
    table_name: tableName,
    last_sync_at: getCurrentTimestamp(),
    record_count: recordCount || 0,
    sync_status: status,
    error_message: errorMessage || null,
    updated_at: getCurrentTimestamp()
  };

  const { error } = await supabase
    .from('sync_metadata')
    .upsert(metadata, { onConflict: 'table_name' });

  if (error) {
    logger.error(`Failed to update metadata for ${tableName}:`, error);
  }
}

/**
 * Fetch records from SQLite for a given table
 */
function fetchRecordsFromSQLite(tableName: string): TableRecord[] {
  if (tableName === 'projects') {
    return projectDb.getAllProjects() as unknown as TableRecord[];
  }

  const db = getDatabase();
  const stmt = db.prepare(`SELECT * FROM ${tableName}`);
  return stmt.all() as TableRecord[];
}

/**
 * Clear all existing records in Supabase table
 */
async function clearSupabaseTable(
  supabase: SupabaseClient,
  tableName: string
): Promise<void> {
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .neq('id', ''); // Delete all records

  if (deleteError) {
    throw new Error(`Failed to clear existing data: ${deleteError.message}`);
  }
}

/**
 * Insert records in batches to Supabase
 */
async function insertRecordsInBatches(
  supabase: SupabaseClient,
  tableName: string,
  records: TableRecord[]
): Promise<number> {
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
    logger.info(`Inserted ${totalInserted}/${records.length} records for ${tableName}`);
  }

  return totalInserted;
}

/**
 * Create a success sync result
 */
function createSuccessResult(tableName: string, recordCount: number): SyncResult {
  return {
    success: true,
    tableName,
    recordCount
  };
}

/**
 * Create a failed sync result
 */
function createFailedResult(tableName: string, errorMessage: string): SyncResult {
  return {
    success: false,
    tableName,
    error: errorMessage
  };
}

/**
 * Handle empty table sync
 */
async function handleEmptyTable(
  supabase: SupabaseClient,
  tableName: string
): Promise<SyncResult> {
  await updateSyncMetadata(supabase, tableName, 'success', 0);
  return createSuccessResult(tableName, 0);
}

/**
 * Sync table data to Supabase
 */
async function syncTableData(
  supabase: SupabaseClient,
  tableName: string,
  records: TableRecord[]
): Promise<number> {
  await clearSupabaseTable(supabase, tableName);
  return await insertRecordsInBatches(supabase, tableName, records);
}

/**
 * Sync a single table from SQLite to Supabase
 */
async function syncTable(supabase: SupabaseClient, tableName: string): Promise<SyncResult> {
  try {
    logger.info(`Starting sync for table: ${tableName}`);
    await updateSyncMetadata(supabase, tableName, 'in_progress');

    const records = fetchRecordsFromSQLite(tableName);
    logger.info(`Found ${records.length} records in ${tableName}`);

    if (records.length === 0) {
      return await handleEmptyTable(supabase, tableName);
    }

    const totalInserted = await syncTableData(supabase, tableName, records);
    await updateSyncMetadata(supabase, tableName, 'success', totalInserted);

    return createSuccessResult(tableName, totalInserted);

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error(`Error syncing table ${tableName}:`, errorMessage);
    await updateSyncMetadata(supabase, tableName, 'failed', 0, errorMessage);
    return createFailedResult(tableName, errorMessage);
  }
}

/**
 * Process sync results and determine if should continue
 */
function shouldContinueSync(result: SyncResult, stopOnError: boolean): boolean {
  if (result.success) {
    return true;
  }
  if (stopOnError) {
    logger.error(`Stopping sync due to error in ${result.tableName}`);
    return false;
  }
  return true;
}

/**
 * Calculate sync summary statistics
 */
function calculateSyncSummary(
  results: SyncResult[],
  timestamp: string
): { totalRecords: number; failedTables: string[]; allSuccess: boolean } {
  let totalRecords = 0;
  const failedTables: string[] = [];

  for (const result of results) {
    if (result.success) {
      totalRecords += result.recordCount || 0;
    } else {
      failedTables.push(result.tableName);
    }
  }

  return {
    totalRecords,
    failedTables,
    allSuccess: failedTables.length === 0
  };
}

/**
 * Create sync summary object
 */
function createSyncSummary(
  results: SyncResult[],
  timestamp: string,
  totalRecords: number,
  failedTables: string[],
  allSuccess: boolean
): SyncSummary {
  return {
    success: allSuccess,
    timestamp,
    results,
    totalRecords,
    failedTables
  };
}

/**
 * Sync all tables from SQLite to Supabase
 * @param stopOnError - If true, stop syncing on first error. If false, continue with remaining tables.
 */
export async function syncAllTables(stopOnError: boolean = false): Promise<SyncSummary> {
  const timestamp = getCurrentTimestamp();
  const results: SyncResult[] = [];

  try {
    logger.info('Starting database sync to Supabase...');
    const supabase = createSupabaseClient();

    for (const tableName of SYNC_ORDER) {
      const result = await syncTable(supabase, tableName);
      results.push(result);

      if (!shouldContinueSync(result, stopOnError)) {
        break;
      }
    }

    const { totalRecords, failedTables, allSuccess } = calculateSyncSummary(results, timestamp);
    logger.info(`Sync completed. Total records: ${totalRecords}, Failed tables: ${failedTables.length}`);

    return createSyncSummary(results, timestamp, totalRecords, failedTables, allSuccess);

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error('Fatal error during sync:', errorMessage);

    const failedTables = SYNC_ORDER.filter(table => !results.find(r => r.tableName === table && r.success));

    return createSyncSummary(results, timestamp, 0, failedTables, false);
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
    const errorMessage = getErrorMessage(error);
    logger.error('Error getting sync status:', errorMessage);

    return {
      success: false,
      error: errorMessage
    };
  }
}
