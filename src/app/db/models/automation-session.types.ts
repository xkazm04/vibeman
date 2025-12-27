/**
 * Automation Session Database Types
 * Types for the automation_sessions table
 */

import type { AutomationSessionPhase } from '@/lib/standupAutomation/types';

// Database row type
export interface DbAutomationSession {
  id: string;
  project_id: string;
  project_path: string;
  phase: AutomationSessionPhase;
  task_id: string | null;
  claude_session_id: string | null;
  config: string;          // JSON-serialized StandupAutomationConfig
  result: string | null;   // JSON-serialized AutomationCycleResult
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Create input type
export interface CreateAutomationSession {
  projectId: string;
  projectPath: string;
  config: Record<string, unknown>;
}

// Update types
export interface UpdateAutomationSessionPhase {
  id: string;
  phase: AutomationSessionPhase;
}

export interface UpdateAutomationSessionTaskId {
  id: string;
  taskId: string;
}

export interface UpdateAutomationSessionClaudeId {
  id: string;
  claudeSessionId: string;
}

export interface CompleteAutomationSession {
  id: string;
  result: Record<string, unknown>;
}

export interface FailAutomationSession {
  id: string;
  errorMessage: string;
}
