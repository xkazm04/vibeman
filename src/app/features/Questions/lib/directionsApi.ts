/**
 * Directions API Client
 * Client-side functions for interacting with the Directions API
 */

import { DbDirection } from '@/app/db';

// Interrogative engine preset for directions. Provides the same accept/reject/generate
// pattern as the functions below but through a unified engine interface.
export { createDirectionsEngine } from '@/lib/interrogative-engine';

export interface DirectionsResponse {
  success: boolean;
  directions: DbDirection[];
  grouped: {
    contextMapId: string;
    contextMapTitle: string;
    directions: DbDirection[];
  }[];
  counts: {
    pending: number;
    accepted: number;
    rejected: number;
    total: number;
  };
}

export interface GenerateDirectionsResponse {
  success: boolean;
  requirementName: string;
  requirementPath: string;
  contextCount: number;
  expectedDirections: number;
}

export interface AcceptDirectionResponse {
  success: boolean;
  direction: DbDirection;
  requirementName: string;
  requirementPath: string;
}

export interface AnsweredQuestionInput {
  id: string;
  question: string;
  answer: string;
}

/**
 * Fetch all directions for a project
 */
export async function fetchDirections(
  projectId: string,
  options?: { status?: 'pending' | 'accepted' | 'rejected'; contextMapId?: string }
): Promise<DirectionsResponse> {
  const params = new URLSearchParams({ projectId });
  if (options?.status) params.append('status', options.status);
  if (options?.contextMapId) params.append('contextMapId', options.contextMapId);

  const response = await fetch(`/api/directions?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch directions');
  }
  return response.json();
}

/**
 * Create a new direction (typically called by Claude Code)
 */
export async function createDirection(data: {
  project_id: string;
  context_map_id: string;
  context_map_title: string;
  direction: string;
  summary: string;
}): Promise<{ success: boolean; direction: DbDirection }> {
  const response = await fetch('/api/directions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create direction');
  }
  return response.json();
}

/**
 * Accept a direction (creates Claude Code requirement for implementation)
 */
export async function acceptDirection(
  directionId: string,
  projectPath: string
): Promise<AcceptDirectionResponse> {
  const response = await fetch(`/api/directions/${directionId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to accept direction');
  }
  return response.json();
}

/**
 * Reject a direction
 */
export async function rejectDirection(
  directionId: string
): Promise<{ success: boolean; direction: DbDirection }> {
  const response = await fetch(`/api/directions/${directionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'rejected' })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reject direction');
  }
  return response.json();
}

/**
 * Delete a direction
 */
export async function deleteDirection(
  directionId: string
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/directions/${directionId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete direction');
  }
  return response.json();
}

/**
 * Generate Claude Code requirement for direction generation
 * @param data.selectedContextIds - SQLite context IDs to generate directions for
 * @param data.userContext - Optional user-provided focus area or dilemma
 * @param data.answeredQuestions - Optional selected answered questions to include as context
 * @param data.brainstormAll - When true, generates directions with holistic view of entire project
 */
export async function generateDirectionRequirement(data: {
  projectId: string;
  projectName: string;
  projectPath: string;
  selectedContextIds: string[]; // SQLite context IDs
  directionsPerContext?: number;
  userContext?: string;
  answeredQuestions?: AnsweredQuestionInput[];
  brainstormAll?: boolean;
}): Promise<GenerateDirectionsResponse> {
  const response = await fetch('/api/directions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate direction requirement');
  }
  return response.json();
}
