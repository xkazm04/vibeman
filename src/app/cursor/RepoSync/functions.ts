import { HealthStatus, Repository, SyncResult, SyncStatus } from './types';

// API Functions
export const checkHealthAPI = async (): Promise<HealthStatus> => {
  try {
    const response = await fetch('/api/repo-sync?action=health');
    const data: HealthStatus = await response.json();
    return data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Health check failed');
  }
};

export const loadRepositoriesAPI = async (): Promise<Repository[]> => {
  try {
    const response = await fetch('/api/repo-sync?action=repositories');
    const data = await response.json();
    return data.repositories;
  } catch (error) {
    console.error('Failed to load repositories:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to load repositories');
  }
};

export const startSyncAPI = async (repoName: string): Promise<SyncResult> => {
  try {
    const response = await fetch('/api/repo-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync',
        repository: repoName
      })
    });

    const result: SyncResult = await response.json();
    return result;
  } catch (error) {
    console.error(`Sync failed for ${repoName}:`, error);
    throw new Error(error instanceof Error ? error.message : 'Sync failed');
  }
};

export const syncAllRepositoriesAPI = async (repositories: string[]): Promise<any> => {
  try {
    const response = await fetch('/api/repo-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync',
        repositories
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Batch sync failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Batch sync failed');
  }
};

export const getSyncStatusAPI = async (syncId: string): Promise<SyncStatus> => {
  try {
    const response = await fetch(`/api/repo-sync?action=status&sync_id=${syncId}`);
    const status = await response.json();
    return status;
  } catch (error) {
    console.error('Status polling failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Status polling failed');
  }
};

// Helper Functions
export const getStatusIcon = (status: SyncStatus | undefined) => {
  return status?.status || 'ready';
};

export const getStatusText = (status: SyncStatus | undefined, isActive: boolean): string => {
  if (isActive && !status) return 'Starting...';
  
  switch (status?.status) {
    case 'completed':
      return `Completed (${status.filesIndexed || 0} files)`;
    case 'failed':
      return `Failed: ${status.error || 'Unknown error'}`;
    case 'scanning':
      return 'Scanning files...';
    case 'indexing':
      return `Indexing... (${status.filesProcessed || 0}/${status.totalFiles || 0})`;
    default:
      return 'Ready to sync';
  }
};

export const getProgressPercent = (status: SyncStatus | undefined): number => {
  if (status?.status === 'indexing' && status.totalFiles && status.totalFiles > 0) {
    return Math.round(((status.filesProcessed || 0) / status.totalFiles) * 100);
  }
  return 0;
};

export const formatDuration = (startTime?: string, endTime?: string): string => {
  if (!startTime || !endTime) return 'N/A';
  
  const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
  return `${duration}s`;
};

export const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString();
};

// Polling function
export const createPollingFunction = (
  syncId: string,
  repoName: string,
  onStatusUpdate: (repoName: string, status: SyncStatus) => void,
  onComplete: (repoName: string) => void,
  onError: (repoName: string) => void
) => {
  const poll = async () => {
    try {
      const status = await getSyncStatusAPI(syncId);
      onStatusUpdate(repoName, status);
      
      if (status.status === 'completed' || status.status === 'failed') {
        onComplete(repoName);
        return;
      }
      
      // Continue polling if still in progress
      if (status.status === 'scanning' || status.status === 'indexing') {
        setTimeout(poll, 1000);
      }
    } catch (error) {
      console.error('Status polling failed:', error);
      onError(repoName);
    }
  };
  
  return poll;
};