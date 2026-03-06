/**
 * Auto-Assignment Logic
 *
 * Distributes backlog tasks to CLI sessions based on configurable rules.
 * Pure function — no side effects; returns assignments to be executed by caller.
 */

import type { ProjectRequirement } from './types';
import type { QueuedTask } from '@/components/cli/types';
import { requirementToQueuedTask } from '@/components/cli/types';
import type { CLISessionId, CLISessionState } from '@/components/cli/store/cliSessionStore';
import type { AutoAssignConfig } from '@/lib/autoAssignConfig';
import type { DbIdea } from '@/app/db';
import type { CLIProvider, CLIModel } from '@/lib/claude-terminal/types';

const SESSION_IDS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

export interface AutoAssignInput {
  /** Requirements to auto-assign (selected + idle only) */
  requirements: ProjectRequirement[];
  /** Lookup from requirement name → linked idea (for effort/risk checks) */
  ideasMap: Record<string, DbIdea | null>;
  /** Current session states */
  sessions: Record<CLISessionId, CLISessionState>;
  /** Auto-assign rules */
  config: AutoAssignConfig;
  /** Resolve requirement → stable task ID */
  getRequirementId: (req: ProjectRequirement) => string;
}

export interface SessionAssignment {
  sessionId: CLISessionId;
  tasks: QueuedTask[];
  providerOverride?: CLIProvider;
  modelOverride?: CLIModel | null;
}

/**
 * Check if a session is free (not running and no queued tasks).
 */
function isSessionFree(session: CLISessionState): boolean {
  return !session.isRunning && session.queue.length === 0;
}

/**
 * Split array into chunks of maxSize.
 */
function chunk<T>(arr: T[], maxSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += maxSize) {
    chunks.push(arr.slice(i, i + maxSize));
  }
  return chunks;
}

/**
 * Check if a requirement matches the gemini rule conditions.
 */
function matchesGeminiRule(
  req: ProjectRequirement,
  ideasMap: Record<string, DbIdea | null>,
  conditions: { effort: number; risk: number }
): boolean {
  const idea = ideasMap[req.requirementName];
  if (!idea) return false;
  return (
    idea.effort !== null &&
    idea.effort <= conditions.effort &&
    idea.risk !== null &&
    idea.risk <= conditions.risk
  );
}

/**
 * Auto-assign requirements to free CLI sessions.
 *
 * Algorithm:
 * 1. Partition requirements into gemini bucket (low effort+risk) and default bucket
 * 2. Get list of free sessions
 * 3. Chunk each bucket by maxTasksPerSession
 * 4. Assign chunks to free sessions (gemini bucket first, with provider override)
 * 5. Remaining tasks (no free sessions) are left unassigned
 */
export function autoAssignTasks(input: AutoAssignInput): SessionAssignment[] {
  const { requirements, ideasMap, sessions, config, getRequirementId } = input;

  if (requirements.length === 0) return [];

  // Get free sessions in order
  const freeSessions: CLISessionId[] = SESSION_IDS.filter(id => isSessionFree(sessions[id]));
  if (freeSessions.length === 0) return [];

  // Partition into buckets
  const geminiBucket: ProjectRequirement[] = [];
  const defaultBucket: ProjectRequirement[] = [];

  for (const req of requirements) {
    if (
      config.geminiRule.enabled &&
      config.geminiRule.conditions &&
      matchesGeminiRule(req, ideasMap, config.geminiRule.conditions)
    ) {
      geminiBucket.push(req);
    } else {
      defaultBucket.push(req);
    }
  }

  const assignments: SessionAssignment[] = [];
  let freeIndex = 0;

  // Assign gemini bucket
  if (geminiBucket.length > 0) {
    const chunks = chunk(geminiBucket, config.maxTasksPerSession);
    for (const ch of chunks) {
      if (freeIndex >= freeSessions.length) break;
      const sessionId = freeSessions[freeIndex++];
      assignments.push({
        sessionId,
        tasks: ch.map(req => requirementToQueuedTask(req, getRequirementId(req))),
        providerOverride: config.geminiRule.provider || undefined,
        modelOverride: config.geminiRule.model,
      });
    }
  }

  // Assign default bucket
  if (defaultBucket.length > 0 && config.defaultRule.enabled) {
    const chunks = chunk(defaultBucket, config.maxTasksPerSession);
    for (const ch of chunks) {
      if (freeIndex >= freeSessions.length) break;
      const sessionId = freeSessions[freeIndex++];
      assignments.push({
        sessionId,
        tasks: ch.map(req => requirementToQueuedTask(req, getRequirementId(req))),
        providerOverride: config.defaultRule.provider || undefined,
        modelOverride: config.defaultRule.model,
      });
    }
  }

  return assignments;
}
