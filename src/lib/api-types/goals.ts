/**
 * Typed API response interfaces for Goals endpoints.
 *
 * Shared between backend route handlers and frontend consumers
 * so both sides agree on the exact shape of every response.
 */

import type { DbGoal, DbGoalCandidate } from '@/app/db/models/types';
import type { GoalCandidate } from '@/lib/goalGenerator';

// ---------------------------------------------------------------------------
// /api/goals  (main CRUD)
// ---------------------------------------------------------------------------

/** GET /api/goals?id=xxx */
export interface GoalResponse {
  goal: DbGoal;
}

/** GET /api/goals?projectId=xxx */
export interface GoalsListResponse {
  goals: DbGoal[];
}

/** POST /api/goals  &  PUT /api/goals */
export interface GoalMutationResponse {
  goal: DbGoal;
}

/** DELETE /api/goals?id=xxx */
export interface GoalDeleteResponse {
  success: true;
}

// ---------------------------------------------------------------------------
// /api/goals/generate-candidates
// ---------------------------------------------------------------------------

export interface CandidateStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  tweaked: number;
  avgPriorityScore: number;
}

/** POST /api/goals/generate-candidates */
export interface GenerateCandidatesResponse {
  success: true;
  candidates: GoalCandidate[];
  candidateIds: string[];
  totalGenerated: number;
  metadata?: {
    scannedFiles?: number;
    scannedCommits?: number;
    tokensUsed?: number;
  };
}

/** GET /api/goals/generate-candidates?projectId=xxx */
export interface CandidatesListResponse {
  success: true;
  candidates: DbGoalCandidate[];
  stats: CandidateStats;
}

/** PUT /api/goals/generate-candidates  (accept action — includes created goal) */
export interface CandidateAcceptResponse {
  success: true;
  candidate: DbGoalCandidate | null;
  goal: DbGoal;
}

/** PUT /api/goals/generate-candidates  (reject / tweak / update actions) */
export interface CandidateUpdateResponse {
  success: true;
  candidate: DbGoalCandidate | null;
}

/** DELETE /api/goals/generate-candidates?deleteAll&projectId=xxx */
export interface CandidatesBulkDeleteResponse {
  success: true;
  deletedCount: number;
}

/** DELETE /api/goals/generate-candidates?candidateId=xxx */
export interface CandidateDeleteResponse {
  success: true;
}

// ---------------------------------------------------------------------------
// /api/goals/sync  (Supabase)
// ---------------------------------------------------------------------------

/** GET /api/goals/sync */
export interface SyncStatusResponse {
  configured: boolean;
  message: string;
}

/** POST /api/goals/sync */
export interface SyncResultResponse {
  success: boolean;
  goalsCount: number;
  errors: string[];
  configured: boolean;
}

// ---------------------------------------------------------------------------
// /api/goals/github-sync
// ---------------------------------------------------------------------------

export interface GitHubSyncConfigDetails {
  hasToken: boolean;
  hasProjectId: boolean;
  hasOwner: boolean;
  hasStatusField: boolean;
  hasStatusMapping: boolean;
}

/** GET /api/goals/github-sync */
export interface GitHubSyncStatusResponse {
  configured: boolean;
  details: GitHubSyncConfigDetails;
  message: string;
  requiredEnvVars: string[];
  optionalEnvVars: string[];
}

/** POST /api/goals/github-sync  (batch sync result) */
export interface GitHubBatchSyncResponse {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  configured: boolean;
}
