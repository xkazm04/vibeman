// TypeScript interfaces for RepoSync components
export interface Repository {
  name: string;
  path: string;
  exists: boolean;
}

export interface SyncStatus {
  status: 'scanning' | 'indexing' | 'completed' | 'failed';
  filesProcessed?: number;
  totalFiles?: number;
  filesIndexed?: number;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export interface HealthStatus {
  status: string;
  qdrant_connected: boolean;
  openai_configured: boolean;
  qdrant_configured: boolean;
  timestamp: string;
}

export interface SyncResult {
  syncId?: string;
  repository: string;
  status: string;
  error?: string;
}

export interface SyncState {
  repositories: Repository[];
  syncStatuses: Map<string, SyncStatus>;
  activeSyncs: Set<string>;
  healthStatus: HealthStatus | null;
  isInitializing: boolean;
  lastRefresh: Date;
}