export interface ProjectOverviewItem {
  id: string;
  name: string;
  path: string;
  port: number;
  type: 'nextjs' | 'fastapi' | 'other';
  description?: string;
  relatedProjectId?: string;
  allowMultipleInstances?: boolean;
  basePort?: number;
  instanceOf?: string;
  runScript?: string;
  git?: {
    repository: string;
    branch: string;
    autoSync?: boolean;
  };
}

export interface AnnetteState {
  isActive: boolean;
  selectedProject: ProjectOverviewItem | null;
  isProcessing: boolean;
  lastResponse: string;
}

export interface ServerStatus {
  isRunning: boolean;
  hasError: boolean;
  isStopping: boolean;
  isLoading: boolean;
  status: any;
}