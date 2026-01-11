/**
 * Questions API Client
 * Client-side functions for interacting with the Questions API
 */

import { DbQuestion } from '@/app/db';

export interface ContextMapEntry {
  id: string;
  title: string;
  summary: string;
  filepaths: {
    ui?: string[];
    lib?: string[];
    api?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface ContextMap {
  version: string;
  generated: string;
  description: string;
  contexts: ContextMapEntry[];
}

export interface QuestionsResponse {
  success: boolean;
  questions: DbQuestion[];
  grouped: {
    contextMapId: string;
    contextMapTitle: string;
    questions: DbQuestion[];
  }[];
  counts: {
    pending: number;
    answered: number;
    total: number;
  };
}

export interface ContextMapResponse {
  success: boolean;
  exists: boolean;
  contextMap?: ContextMap;
  contextMapPath?: string;
  entryCount?: number;
  error?: string;
  message?: string;
}

export interface GenerateQuestionsResponse {
  success: boolean;
  requirementName: string;
  requirementPath: string;
  contextCount: number;
  expectedQuestions: number;
}

export interface ContextMapSetupResponse {
  success: boolean;
  skillPath: string;
  requirementPath: string;
  message: string;
}

/**
 * Fetch context map from a project
 */
export async function fetchContextMap(projectPath: string): Promise<ContextMapResponse> {
  const response = await fetch(`/api/context-map?projectPath=${encodeURIComponent(projectPath)}`);
  return response.json();
}

/**
 * Fetch all questions for a project
 */
export async function fetchQuestions(
  projectId: string,
  options?: { status?: 'pending' | 'answered'; contextMapId?: string }
): Promise<QuestionsResponse> {
  const params = new URLSearchParams({ projectId });
  if (options?.status) params.append('status', options.status);
  if (options?.contextMapId) params.append('contextMapId', options.contextMapId);

  const response = await fetch(`/api/questions?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch questions');
  }
  return response.json();
}

/**
 * Create a new question (typically called by Claude Code)
 */
export async function createQuestion(data: {
  project_id: string;
  context_map_id: string;
  context_map_title: string;
  question: string;
}): Promise<{ success: boolean; question: DbQuestion }> {
  const response = await fetch('/api/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create question');
  }
  return response.json();
}

/**
 * Answer a question (updates answer, marks as answered, auto-creates goal)
 */
export async function answerQuestion(
  questionId: string,
  answer: string
): Promise<{ success: boolean; question: DbQuestion; goal?: unknown; goalCreated: boolean }> {
  const response = await fetch(`/api/questions/${questionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to answer question');
  }
  return response.json();
}

/**
 * Delete a question
 */
export async function deleteQuestion(questionId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/questions/${questionId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete question');
  }
  return response.json();
}

/**
 * Generate Claude Code requirement for question generation
 */
export async function generateQuestionRequirement(data: {
  projectId: string;
  projectName: string;
  projectPath: string;
  selectedContexts: ContextMapEntry[];
  questionsPerContext?: number;
}): Promise<GenerateQuestionsResponse> {
  const response = await fetch('/api/questions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate requirement');
  }
  return response.json();
}

/**
 * Setup context map generator in target project
 * Copies the skill file and creates a requirement file
 */
export async function setupContextMapGenerator(projectPath: string): Promise<ContextMapSetupResponse> {
  const response = await fetch('/api/context-map/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to setup context map generator');
  }
  return response.json();
}
