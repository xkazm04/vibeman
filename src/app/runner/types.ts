export interface ProjectOverviewItem {
  id: string;
  name: string;
  path: string;
  port: number;
  type: string;
  git?: {
    repository: string;
    branch: string;
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