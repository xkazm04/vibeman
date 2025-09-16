// Types for context generation
export interface ContextMetadata {
  name: string;
  description?: string;
  filePaths: string[];
}

export interface ParsedContext {
  filename: string;
  content: string;
  metadata: ContextMetadata;
}

export interface GenerationResult {
  success: boolean;
  contexts: Array<{ filename: string; content: string }>;
  error?: string;
}

export interface ProjectAnalysis {
  structure?: any;
  stats?: {
    technologies?: string[];
  };
  codebase?: {
    mainFiles?: Array<{
      path: string;
      type?: string;
      content?: string;
    }>;
  };
  projectId?: string;
}