import { ProjectType as GlobalProjectType } from '@/types';

export interface Directory {
  name: string;
  path: string;
}

export interface DirectoriesResponse {
  success: boolean;
  currentAppPath: string;
  parentPath: string;
  directories: Directory[];
  error?: string;
}

export interface ProjectFormData {
  id?: string;
  name: string;
  path: string;
  port?: number | null; // Optional - not needed for all project types
  workspaceId?: string | null; // Workspace this project belongs to
  type: GlobalProjectType;
  relatedProjectId?: string;
  git_repository?: string;
  git_branch?: string;
  run_script?: string;
}

export interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onTypeChange?: (type: GlobalProjectType) => Promise<void>;
  loading: boolean;
  error: string;
  isEdit?: boolean;
  // Workspace context for new projects
  workspaceId?: string | null;
  workspaceBasePath?: string | null;
}

// Re-export GlobalProjectType as ProjectType for backward compatibility
export type ProjectType = GlobalProjectType;
