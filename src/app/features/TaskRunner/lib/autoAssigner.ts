/**
 * Auto-Assignment Logic
 *
 * Distributes backlog tasks to CLI sessions based on configurable rules.
 * Optionally consolidates same-context requirements into phased tasks.
 * Pure function — no side effects; returns assignments to be executed by caller.
 */

import type { ProjectRequirement } from './types';
import { createQueuedStatus } from './types';
import type { QueuedTask } from '@/components/cli/types';
import { requirementToQueuedTask } from '@/components/cli/types';
import type { CLISessionId, CLISessionState } from '@/components/cli/store/cliSessionStore';
import type { AutoAssignConfig } from '@/lib/autoAssignConfig';
import type { DbIdea } from '@/app/db';
import type { CLIProvider, CLIModel } from '@/lib/claude-terminal/types';
import type { ContextInfo } from '../hooks/useTaskColumnData';
import { SESSION_IDS } from './taskRunnerConfig';

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
  /** Context info map (context_id → ContextInfo) — needed for consolidation */
  contextsMap?: Record<string, ContextInfo>;
}

export interface SessionAssignment {
  sessionId: CLISessionId;
  tasks: QueuedTask[];
  providerOverride?: CLIProvider;
  modelOverride?: CLIModel | null;
}

// ---------------------------------------------------------------------------
// Internal: intermediate representation for pre-assignment processing
// ---------------------------------------------------------------------------

interface TaskItem {
  type: 'single' | 'consolidated';
  /** Lead requirement (used for project info, gemini check fallback) */
  primaryReq: ProjectRequirement;
  /** All constituent requirements */
  allReqs: ProjectRequirement[];
  /** Pre-built direct prompt (only for consolidated) */
  directPrompt?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSessionFree(session: CLISessionState): boolean {
  return !session.isRunning && session.queue.length === 0;
}

function chunk<T>(arr: T[], maxSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += maxSize) {
    chunks.push(arr.slice(i, i + maxSize));
  }
  return chunks;
}

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

// ---------------------------------------------------------------------------
// Context-based consolidation
// ---------------------------------------------------------------------------

/**
 * Build a phased directPrompt that instructs the CLI to execute multiple
 * requirement files sequentially within a single session turn.
 */
function buildConsolidatedPrompt(
  reqs: ProjectRequirement[],
  context: ContextInfo | null,
): string {
  const contextLabel = context
    ? `${context.groupName ? `${context.groupName} — ` : ''}${context.name}`
    : 'Shared Context';

  const phases = reqs.map((req, i) =>
    [
      `### Phase ${i + 1}: ${req.requirementName}`,
      `Read and fully execute the requirement defined in: .claude/commands/${req.requirementName}`,
      'Complete all tasks described in this requirement before proceeding to the next phase.',
    ].join('\n')
  ).join('\n\n---\n\n');

  return [
    `## Consolidated Task — ${contextLabel}`,
    '',
    'You are executing a multi-phase consolidated task. All phases target the same code context, so changes from one phase may affect subsequent phases.',
    '',
    phases,
    '',
    '## Instructions',
    '- Execute each phase completely before starting the next.',
    '- All phases share the same code context — consider cross-cutting concerns.',
    '- Report completion of each phase before moving on.',
    '- Do not skip any phase.',
  ].join('\n');
}

/**
 * Group requirements by context_id and produce TaskItems.
 *
 * - Single-requirement contexts → pass through as `single` TaskItem
 * - Multi-requirement contexts  → consolidate into one `consolidated` TaskItem
 *   with a phased directPrompt
 */
function consolidateByContext(
  requirements: ProjectRequirement[],
  ideasMap: Record<string, DbIdea | null>,
  contextsMap: Record<string, ContextInfo>,
  getRequirementId: (req: ProjectRequirement) => string,
): TaskItem[] {
  // Group by context_id
  const byContext = new Map<string, { context: ContextInfo | null; reqs: ProjectRequirement[] }>();

  for (const req of requirements) {
    const idea = ideasMap[req.requirementName];
    const contextId = idea?.context_id || '__no_context__';

    if (!byContext.has(contextId)) {
      const context = contextId !== '__no_context__' ? (contextsMap[contextId] ?? null) : null;
      byContext.set(contextId, { context, reqs: [] });
    }
    byContext.get(contextId)!.reqs.push(req);
  }

  const items: TaskItem[] = [];

  for (const [, { context, reqs }] of byContext) {
    if (reqs.length === 1) {
      items.push({ type: 'single', primaryReq: reqs[0], allReqs: [reqs[0]] });
    } else {
      items.push({
        type: 'consolidated',
        primaryReq: reqs[0],
        allReqs: reqs,
        directPrompt: buildConsolidatedPrompt(reqs, context),
      });
    }
  }

  return items;
}

/**
 * Convert a TaskItem into a QueuedTask, handling consolidation metadata.
 */
function taskItemToQueuedTask(
  item: TaskItem,
  getRequirementId: (req: ProjectRequirement) => string,
): QueuedTask {
  if (item.type === 'single') {
    return requirementToQueuedTask(item.primaryReq, getRequirementId(item.primaryReq));
  }

  // Consolidated: use lead requirement as base, inject directPrompt + metadata
  const leadId = getRequirementId(item.primaryReq);
  const allIds = item.allReqs.map(r => getRequirementId(r));
  const otherIds = allIds.filter(id => id !== leadId);

  return {
    id: leadId,
    projectId: item.primaryReq.projectId,
    projectPath: item.primaryReq.projectPath,
    projectName: item.primaryReq.projectName,
    requirementName: item.primaryReq.requirementName,
    status: createQueuedStatus(),
    addedAt: Date.now(),
    directPrompt: item.directPrompt,
    consolidatedFrom: otherIds,
    consolidatedRequirementNames: item.allReqs.slice(1).map(r => r.requirementName),
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Auto-assign requirements to free CLI sessions.
 *
 * Algorithm:
 * 1. If consolidateBeforeAssign is enabled, group requirements by context_id
 *    and merge multi-requirement groups into phased consolidated tasks
 * 2. Partition task items into gemini bucket (low effort+risk) and default bucket
 * 3. Chunk each bucket by maxTasksPerSession
 * 4. Assign chunks to free sessions (gemini bucket first, with provider override)
 * 5. Remaining tasks (no free sessions) are left unassigned
 */
export function autoAssignTasks(input: AutoAssignInput): SessionAssignment[] {
  const { requirements, ideasMap, sessions, config, getRequirementId, contextsMap } = input;

  if (requirements.length === 0) return [];

  // Get free sessions in order
  const freeSessions: CLISessionId[] = SESSION_IDS.filter(id => isSessionFree(sessions[id]));
  if (freeSessions.length === 0) return [];

  // Step 1: Consolidate by context if enabled
  let taskItems: TaskItem[];
  if (config.consolidateBeforeAssign && contextsMap && Object.keys(contextsMap).length > 0) {
    taskItems = consolidateByContext(requirements, ideasMap, contextsMap, getRequirementId);
  } else {
    taskItems = requirements.map(req => ({
      type: 'single' as const,
      primaryReq: req,
      allReqs: [req],
    }));
  }

  // Step 2: Partition into gemini / default buckets
  const geminiBucket: TaskItem[] = [];
  const defaultBucket: TaskItem[] = [];

  for (const item of taskItems) {
    if (
      config.geminiRule.enabled &&
      config.geminiRule.conditions
    ) {
      // For consolidated items, ALL constituent reqs must match (conservative)
      const allMatch = item.allReqs.every(req =>
        matchesGeminiRule(req, ideasMap, config.geminiRule.conditions!)
      );
      if (allMatch) {
        geminiBucket.push(item);
        continue;
      }
    }
    defaultBucket.push(item);
  }

  // Step 3: Chunk and assign
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
        tasks: ch.map(item => taskItemToQueuedTask(item, getRequirementId)),
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
        tasks: ch.map(item => taskItemToQueuedTask(item, getRequirementId)),
        providerOverride: config.defaultRule.provider || undefined,
        modelOverride: config.defaultRule.model,
      });
    }
  }

  return assignments;
}
