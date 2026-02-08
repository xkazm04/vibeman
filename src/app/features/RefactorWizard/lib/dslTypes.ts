/**
 * DSL Types - Stub for backward compatibility
 */

export interface RefactorSpec {
  id: string;
  name: string;
  description?: string;
  operations: RefactorOperation[];
  created_at?: string;
  updated_at?: string;
}

export interface RefactorOperation {
  type: 'rename' | 'move' | 'extract' | 'inline' | 'replace';
  target: string;
  params: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  message?: string;
  filesModified?: string[];
  errors?: string[];
  duration?: number;
}
