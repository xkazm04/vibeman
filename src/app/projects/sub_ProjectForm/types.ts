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
  port: number;
  type: 'nextjs' | 'fastapi' | 'other';
  relatedProjectId?: string;
  git_repository?: string;
  git_branch?: string;
  run_script?: string;
}

export interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onTypeChange?: (type: 'nextjs' | 'fastapi' | 'other') => Promise<void>;
  loading: boolean;
  error: string;
  isEdit?: boolean;
}

export type ProjectType = 'nextjs' | 'fastapi' | 'other';
