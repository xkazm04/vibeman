/**
 * Onboarding Accelerator API Client
 * Functions for interacting with the onboarding accelerator API
 */

import type {
  AssignedWorkItem,
  LearningPathStatus,
  LearningModuleStatus,
  DifficultyLevel,
} from '@/app/db/models/onboarding-accelerator.types';

// Re-export types for consumers
export type { AssignedWorkItem, LearningPathStatus, LearningModuleStatus, DifficultyLevel };
import type {
  LearningPath,
  LearningModule,
  CodeWalkthrough,
  QuizQuestion,
} from '@/stores/onboardingAcceleratorStore';

const BASE_URL = '/api/onboarding-accelerator';

// ===== Learning Paths =====

export async function fetchLearningPaths(projectId: string): Promise<LearningPath[]> {
  const response = await fetch(`${BASE_URL}?projectId=${projectId}`);
  if (!response.ok) throw new Error('Failed to fetch learning paths');
  return response.json();
}

export async function fetchLearningPath(pathId: string): Promise<LearningPath & { modules: LearningModule[]; metrics: unknown[] }> {
  const response = await fetch(`${BASE_URL}?pathId=${pathId}`);
  if (!response.ok) throw new Error('Failed to fetch learning path');
  return response.json();
}

export async function createLearningPath(data: {
  projectId: string;
  developerName: string;
  assignedWork?: AssignedWorkItem[];
}): Promise<LearningPath> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create learning path');
  return response.json();
}

export async function updateLearningPath(
  pathId: string,
  updates: {
    developerName?: string;
    assignedWork?: AssignedWorkItem[];
    status?: LearningPathStatus;
  }
): Promise<LearningPath> {
  const response = await fetch(BASE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pathId, ...updates }),
  });
  if (!response.ok) throw new Error('Failed to update learning path');
  return response.json();
}

export async function deleteLearningPath(pathId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}?pathId=${pathId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete learning path');
}

// ===== Learning Modules =====

export async function fetchModules(pathId: string): Promise<LearningModule[]> {
  const response = await fetch(`${BASE_URL}/modules?pathId=${pathId}`);
  if (!response.ok) throw new Error('Failed to fetch modules');
  return response.json();
}

export async function fetchModule(moduleId: string): Promise<LearningModule & { walkthroughs: CodeWalkthrough[]; questions: QuizQuestion[] }> {
  const response = await fetch(`${BASE_URL}/modules?moduleId=${moduleId}`);
  if (!response.ok) throw new Error('Failed to fetch module');
  return response.json();
}

export async function createModule(data: {
  pathId: string;
  contextId?: string;
  title: string;
  description: string;
  orderIndex: number;
  difficulty?: DifficultyLevel;
  estimatedMinutes?: number;
  relevanceScore?: number;
  prerequisites?: string[];
  keyConcepts?: Array<{ name: string; description: string; importance: string }>;
  codeAreas?: string[];
}): Promise<LearningModule> {
  const response = await fetch(`${BASE_URL}/modules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create module');
  return response.json();
}

export async function updateModule(
  moduleId: string,
  updates: {
    action?: 'start' | 'complete' | 'skip';
    actualMinutes?: number;
    title?: string;
    description?: string;
    status?: LearningModuleStatus;
  }
): Promise<LearningModule> {
  const response = await fetch(`${BASE_URL}/modules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moduleId, ...updates }),
  });
  if (!response.ok) throw new Error('Failed to update module');
  return response.json();
}

export async function deleteModule(moduleId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/modules?moduleId=${moduleId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete module');
}

// ===== Code Walkthroughs =====

export async function fetchWalkthroughs(moduleId: string): Promise<CodeWalkthrough[]> {
  const response = await fetch(`${BASE_URL}/walkthroughs?moduleId=${moduleId}`);
  if (!response.ok) throw new Error('Failed to fetch walkthroughs');
  return response.json();
}

export async function markWalkthroughViewed(walkthroughId: string, pathId: string): Promise<CodeWalkthrough> {
  const response = await fetch(`${BASE_URL}/walkthroughs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walkthroughId, action: 'view', pathId }),
  });
  if (!response.ok) throw new Error('Failed to mark walkthrough as viewed');
  return response.json();
}

// ===== Quiz =====

export async function fetchQuizQuestions(moduleId: string): Promise<QuizQuestion[]> {
  const response = await fetch(`${BASE_URL}/quiz?moduleId=${moduleId}`);
  if (!response.ok) throw new Error('Failed to fetch quiz questions');
  return response.json();
}

export async function submitQuizAnswer(data: {
  questionId: string;
  pathId: string;
  answer: string;
  timeTakenSeconds: number;
}): Promise<{
  id: string;
  status: 'correct' | 'incorrect' | 'partial';
  points_earned: number;
  feedback: string;
  isCorrect: boolean;
  correctAnswer: string;
}> {
  const response = await fetch(`${BASE_URL}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submit', ...data }),
  });
  if (!response.ok) throw new Error('Failed to submit quiz answer');
  return response.json();
}

export async function fetchQuizStats(pathId: string): Promise<{
  stats: { total: number; correct: number; avgScore: number; avgTime: number };
}> {
  const response = await fetch(`${BASE_URL}/quiz?pathId=${pathId}`);
  if (!response.ok) throw new Error('Failed to fetch quiz stats');
  return response.json();
}

// ===== Learning Path Generation =====

export async function generateLearningPath(data: {
  pathId: string;
  projectId: string;
  assignedWork: AssignedWorkItem[];
  includeWalkthroughs?: boolean;
  includeQuizzes?: boolean;
}): Promise<{
  path: LearningPath;
  modules: LearningModule[];
  summary: {
    totalModules: number;
    estimatedHours: number;
    contextsIncluded: number;
    workItemsIncluded: number;
  };
}> {
  const response = await fetch(`${BASE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate learning path');
  }
  return response.json();
}
