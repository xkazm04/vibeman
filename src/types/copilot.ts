export interface CopilotTask {
  id?: string;
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'refactor' | 'test' | 'docs';
  priority: 'low' | 'medium' | 'high' | 'critical';
  technicalDetails?: string;
  acceptanceCriteria?: string[];
  milestone?: number;
  labels?: string[];
  repo_owner?: string;
  repo_url?: string;
} 