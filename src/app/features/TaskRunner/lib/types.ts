import type { Requirement } from '@/app/Claude/lib/requirementApi';
import type { BatchId } from './batchStorage';

export interface ProjectRequirement {
  projectId: string;
  projectName: string;
  projectPath: string;
  requirementName: string;
  status: Requirement['status'];
  taskId?: string;
  batchId?: BatchId | null; // Track which batch this requirement belongs to (up to 4 batches)
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