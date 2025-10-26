import type { Requirement } from '@/app/Claude/lib/requirementApi';

export interface ProjectRequirement {
  projectId: string;
  projectName: string;
  projectPath: string;
  requirementName: string;
  status: Requirement['status'];
  taskId?: string;
}

export interface TaskRunnerState {
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  isLoading: boolean;
  isRunning: boolean;
  processedCount: number;
  error?: string;
}

export interface TaskRunnerActions {
  setRequirements: React.Dispatch<React.SetStateAction<ProjectRequirement[]>>;
  setSelectedRequirements: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  setProcessedCount: React.Dispatch<React.SetStateAction<number>>;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
}