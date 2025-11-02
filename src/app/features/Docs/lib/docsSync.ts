import { syncStaleDocs } from './docsGenerator';
import { eventDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * Documentation Auto-Sync Service
 * Handles automatic documentation updates on commit events
 */

interface SyncOptions {
  projectId: string;
  projectPath: string;
  projectName: string;
  trigger: 'manual' | 'commit' | 'scheduled';
}

/**
 * Trigger documentation sync
 */
export async function triggerDocSync(options: SyncOptions): Promise<number> {
  const { projectId, projectPath, projectName, trigger } = options;

  try {
    // Log sync start event
    eventDb.create({
      id: uuidv4(),
      project_id: projectId,
      title: 'Documentation Sync Started',
      description: `Auto-sync triggered by ${trigger}`,
      type: 'info',
      agent: 'docs-hub',
      message: null
    });

    // Sync stale docs (docs older than 60 minutes)
    const updatedCount = await syncStaleDocs(
      projectId,
      projectPath,
      projectName,
      60
    );

    // Log sync completion
    eventDb.create({
      id: uuidv4(),
      project_id: projectId,
      title: 'Documentation Sync Completed',
      description: `Updated ${updatedCount} documentation section(s)`,
      type: 'success',
      agent: 'docs-hub',
      message: `Sync trigger: ${trigger}`
    });

    return updatedCount;
  } catch (error) {
    // Log sync error
    eventDb.create({
      id: uuidv4(),
      project_id: projectId,
      title: 'Documentation Sync Failed',
      description: `Error: ${error instanceof Error ? error.message : String(error)}`,
      type: 'error',
      agent: 'docs-hub',
      message: null
    });

    throw error;
  }
}

/**
 * Check if documentation needs syncing
 */
export function shouldSyncDocs(lastSyncTime: string | null, thresholdMinutes: number = 60): boolean {
  if (!lastSyncTime) return true;

  const lastSync = new Date(lastSyncTime);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);

  return diffMinutes >= thresholdMinutes;
}

/**
 * Schedule periodic documentation sync
 */
export function scheduleDocSync(
  projectId: string,
  projectPath: string,
  projectName: string,
  intervalMinutes: number = 120
): NodeJS.Timeout {
  const interval = setInterval(async () => {
    try {
      await triggerDocSync({
        projectId,
        projectPath,
        projectName,
        trigger: 'scheduled'
      });
    } catch (error) {
      console.error('Scheduled doc sync failed:', error);
    }
  }, intervalMinutes * 60 * 1000);

  return interval;
}
