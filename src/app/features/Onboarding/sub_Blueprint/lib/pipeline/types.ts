/**
 * Pipeline Types
 * Defines types for the reusable Claude Code pipeline system
 */

export interface PipelineConfig {
  projectPath: string;
  projectId: string;
  requirementName: string;
  requirementContent: string;
  /** Optional callback for progress updates (0-100) */
  onProgress?: (progress: number, message?: string) => void;
  /** Optional callback for completion */
  onComplete?: (result: PipelineResult) => void;
  /** Optional callback for errors */
  onError?: (error: Error) => void;
}

export interface PipelineResult {
  success: boolean;
  taskId?: string;
  requirementPath?: string;
  error?: string;
  data?: any;
}

export interface PipelineStep {
  name: string;
  weight: number; // Weight for progress calculation (0-100)
  execute: (config: PipelineConfig, context: PipelineContext) => Promise<void>;
}

export interface PipelineContext {
  taskId?: string;
  requirementPath?: string;
  data: Record<string, any>;
  updateProgress: (progress: number, message?: string) => void;
}
