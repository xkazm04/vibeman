export interface DevelopmentRequirement {
    id: string;
    projectPath: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    files: string[];
    estimatedComplexity: number;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface ClaudeTask {
    requirementId: string;
    projectPath: string;
    prompt: string;
    context: string[];
    outputPath: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    createdAt: Date;
  }