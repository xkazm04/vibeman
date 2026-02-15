/**
 * Directions API Client
 * Client-side functions for interacting with the Directions API
 */

import { DbDirection } from '@/app/db';
import { safeResponseJson, parseApiResponse, DirectionsResponseSchema, DirectionMutationSchema, AcceptDirectionResponseSchema, SuccessResponseSchema } from '@/lib/apiResponseGuard';

// In-flight direction accept tracking to prevent double-submission.
// Stores directionId → Promise so concurrent calls return the same result.
const inflightAccepts = new Map<string, Promise<AcceptDirectionResponse>>();

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
  const raw = await safeResponseJson(response, '/api/directions');
  return parseApiResponse(raw, DirectionsResponseSchema, '/api/directions') as unknown as DirectionsResponse;
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
  const raw = await safeResponseJson(response, '/api/directions POST');
  return parseApiResponse(raw, DirectionMutationSchema, '/api/directions POST') as unknown as { success: boolean; direction: DbDirection };
}

/**
 * Accept a direction (creates Claude Code requirement for implementation).
 *
 * Idempotent: concurrent calls for the same directionId coalesce into one request.
 * If the server returns 409 (already processed), returns the existing direction
 * instead of throwing.
 */
export async function acceptDirection(
  directionId: string,
  projectPath: string
): Promise<AcceptDirectionResponse> {
  // Deduplicate concurrent calls for the same direction
  const existing = inflightAccepts.get(directionId);
  if (existing) return existing;

  const promise = performAcceptDirection(directionId, projectPath);
  inflightAccepts.set(directionId, promise);

  try {
    return await promise;
  } finally {
    inflightAccepts.delete(directionId);
  }
}

async function performAcceptDirection(
  directionId: string,
  projectPath: string
): Promise<AcceptDirectionResponse> {
  const response = await fetch(`/api/directions/${directionId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectPath })
  });

  // 409 Conflict means direction was already accepted — treat as success
  if (response.status === 409) {
    const data = await response.json();
    return {
      success: true,
      direction: data.direction ?? { id: directionId, status: 'accepted' } as DbDirection,
      requirementName: data.requirementName ?? '',
      requirementPath: data.requirementPath ?? '',
    };
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to accept direction');
  }
  const raw = await safeResponseJson(response, '/api/directions/accept');
  return parseApiResponse(raw, AcceptDirectionResponseSchema, '/api/directions/accept') as unknown as AcceptDirectionResponse;
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
  const raw = await safeResponseJson(response, '/api/directions PUT');
  return parseApiResponse(raw, DirectionMutationSchema, '/api/directions PUT') as unknown as { success: boolean; direction: DbDirection };
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
  const raw = await safeResponseJson(response, '/api/directions DELETE');
  return parseApiResponse(raw, SuccessResponseSchema, '/api/directions DELETE');
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
  return safeResponseJson(response, '/api/directions/generate');
}
