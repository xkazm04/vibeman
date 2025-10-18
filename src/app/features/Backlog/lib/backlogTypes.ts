// Core backlog types and interfaces

export interface Context {
  id: string;
  name: string;
  description?: string;
  filePaths: string[];
  contextFilePath?: string;
}

export interface ImpactedFile {
  filepath: string;
  type: 'create' | 'update';
}

export interface BacklogTask {
  id: string;
  title: string;
  description: string;
  steps: string[];
  impacted_files: ImpactedFile[];
  project_id: string;
}

export interface GeneratedCode {
  filepath: string;
  action: 'create' | 'update';
  content: string;
  originalContent?: string;
}

export interface GenerateBacklogTaskParams {
  projectId: string;
  projectName: string;
  projectPath: string;
  taskRequest: string;
  mode: 'context' | 'individual';
  selectedContexts: Context[];
  selectedFilePaths: string[];
}

export interface BacklogTaskResponse {
  success: boolean;
  taskId?: string;
  error?: string;
}

export interface CodingTaskResponse {
  success: boolean;
  generatedFiles?: GeneratedCode[];
  error?: string;
}

export interface TaskData {
  title: string;
  description: string;
  steps: string[];
  type: 'feature' | 'optimization';
  impactedFiles?: ImpactedFile[];
}

export type BacklogStatus = 'pending' | 'in_progress' | 'accepted' | 'rejected';
export type BacklogType = 'feature' | 'optimization';
