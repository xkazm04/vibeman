/**
 * Interrogative Engine Presets
 *
 * Factory functions that create InterrogativeEngine instances pre-configured
 * for each feature that uses the interrogative development pattern.
 *
 * Each preset maps domain-specific concepts to the generic engine:
 * - Questions: generate → answer → inform direction generation
 * - Directions: generate → accept/reject → create requirement
 * - DecisionQueue: enqueue → accept/reject → execute callback
 * - Ideas/Tinder: evaluate → accept/reject → create requirement
 */

import { InterrogativeEngine } from './InterrogativeEngine';
import { InMemoryItemPersistence, ApiItemPersistence } from './persistence';
import type {
  InterrogativeItem,
  DecisionStrategy,
  InterrogativeHooks,
  AcceptResult,
  AnswerResult,
} from './types';

// ============================================================================
// 1. QUESTIONS ENGINE
// ============================================================================

export interface QuestionItem extends InterrogativeItem {
  status: 'pending' | 'answered';
  projectId: string;
  contextMapId: string;
  contextMapTitle: string;
  question: string;
  answer: string | null;
  goalId: string | null;
}

export interface QuestionGenConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  selectedContextIds: string[];
  questionsPerContext?: number;
}

export function createQuestionsEngine(
  projectId: string,
  hooks?: InterrogativeHooks<QuestionItem>
): InterrogativeEngine<QuestionItem, QuestionGenConfig> {
  return new InterrogativeEngine({
    name: 'questions',
    persistence: new ApiItemPersistence<QuestionItem>({
      baseUrl: '/api/questions',
      queryParams: { projectId },
      parseList: (data) => {
        const d = data as { questions?: QuestionItem[] };
        return d.questions ?? [];
      },
    }),
    decision: {
      onAccept: async () => ({ success: true }), // Questions don't have accept
      onAnswer: async (item, answer): Promise<AnswerResult> => {
        const response = await fetch(`/api/questions/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer }),
        });
        const data = await response.json();
        return {
          success: data.success,
          sideEffectId: data.goalCreated ? data.question?.goal_id : undefined,
        };
      },
    },
    generation: {
      generate: async (config) => {
        const response = await fetch('/api/questions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: config.projectId,
            projectName: config.projectName,
            projectPath: config.projectPath,
            selectedContextIds: config.selectedContextIds,
            questionsPerContext: config.questionsPerContext ?? 3,
          }),
        });
        // Generation creates a requirement file; items arrive asynchronously
        // via Claude Code execution, not returned directly
        if (!response.ok) return [];
        return [];
      },
    },
    hooks,
  });
}

// ============================================================================
// 2. DIRECTIONS ENGINE
// ============================================================================

export interface DirectionItem extends InterrogativeItem {
  status: 'pending' | 'processing' | 'accepted' | 'rejected';
  projectId: string;
  contextMapId: string;
  contextMapTitle: string;
  direction: string;
  summary: string;
  requirementId: string | null;
  requirementPath: string | null;
  pairId: string | null;
  pairLabel: 'A' | 'B' | null;
  problemStatement: string | null;
}

export interface DirectionGenConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  selectedContextIds: string[];
  directionsPerContext?: number;
  userContext?: string;
  answeredQuestions?: Array<{ question: string; answer: string }>;
  brainstormAll?: boolean;
}

export function createDirectionsEngine(
  projectId: string,
  projectPath: string,
  hooks?: InterrogativeHooks<DirectionItem>
): InterrogativeEngine<DirectionItem, DirectionGenConfig> {
  return new InterrogativeEngine({
    name: 'directions',
    persistence: new ApiItemPersistence<DirectionItem>({
      baseUrl: '/api/directions',
      queryParams: { projectId },
      parseList: (data) => {
        const d = data as { directions?: DirectionItem[] };
        return d.directions ?? [];
      },
    }),
    decision: {
      onAccept: async (item): Promise<AcceptResult> => {
        const response = await fetch(`/api/directions/${item.id}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath }),
        });
        const data = await response.json();
        return {
          success: data.success,
          actionId: data.requirementName,
          actionPath: data.requirementPath,
        };
      },
      onReject: async (item) => {
        await fetch(`/api/directions/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' }),
        });
      },
    },
    generation: {
      generate: async (config) => {
        const response = await fetch('/api/directions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        // Like questions, directions arrive asynchronously
        if (!response.ok) return [];
        return [];
      },
    },
    hooks,
  });
}

// ============================================================================
// 3. DECISION QUEUE ENGINE
// ============================================================================

export interface DecisionQueueItem extends InterrogativeItem {
  status: 'pending' | 'accepted' | 'rejected';
  type: string;
  title: string;
  description: string;
  count: number;
  severity?: 'info' | 'warning' | 'error';
  projectId: string;
  data?: Record<string, unknown>;
  onAcceptFn: () => Promise<void>;
  onRejectFn?: () => Promise<void>;
}

/**
 * Engine for sequential decision processing (Blueprint scans, etc.).
 * Uses in-memory persistence since decisions are transient.
 */
export function createDecisionQueueEngine(
  hooks?: InterrogativeHooks<DecisionQueueItem>
): InterrogativeEngine<DecisionQueueItem> {
  return new InterrogativeEngine({
    name: 'decision-queue',
    persistence: new InMemoryItemPersistence<DecisionQueueItem>(),
    decision: {
      onAccept: async (item): Promise<AcceptResult> => {
        await item.onAcceptFn();
        return { success: true };
      },
      onReject: async (item) => {
        await item.onRejectFn?.();
      },
    },
    hooks,
  });
}

// ============================================================================
// 4. TINDER / IDEAS ENGINE
// ============================================================================

export interface TinderItem extends InterrogativeItem {
  status: 'pending' | 'accepted' | 'rejected';
  projectId: string;
  category: string;
  title: string;
  description: string;
  effort: number;
  impact: number;
  requirementName?: string;
}

export function createTinderEngine(
  projectId: string,
  hooks?: InterrogativeHooks<TinderItem>
): InterrogativeEngine<TinderItem> {
  return new InterrogativeEngine({
    name: 'tinder',
    persistence: new ApiItemPersistence<TinderItem>({
      baseUrl: '/api/ideas/tinder',
      queryParams: { projectId },
      parseList: (data) => {
        const d = data as { items?: TinderItem[] };
        return d.items ?? [];
      },
    }),
    decision: {
      onAccept: async (item): Promise<AcceptResult> => {
        const response = await fetch(`/api/ideas/tinder/${item.id}/accept`, {
          method: 'POST',
        });
        const data = await response.json();
        return {
          success: data.success,
          actionId: data.requirementName,
          actionPath: data.requirementPath,
        };
      },
      onReject: async (item) => {
        await fetch(`/api/ideas/tinder/${item.id}/reject`, {
          method: 'POST',
        });
      },
    },
    hooks,
  });
}

// ============================================================================
// 5. BACKLOG PROPOSALS ENGINE
// ============================================================================

export interface ProposalItem extends InterrogativeItem {
  status: 'pending' | 'accepted' | 'rejected';
  projectId: string;
  title: string;
  description: string;
  source: string;
}

export function createProposalEngine(
  hooks?: InterrogativeHooks<ProposalItem>
): InterrogativeEngine<ProposalItem> {
  return new InterrogativeEngine({
    name: 'proposals',
    persistence: new InMemoryItemPersistence<ProposalItem>(),
    decision: {
      onAccept: async (): Promise<AcceptResult> => ({ success: true }),
      onReject: async () => {},
    },
    hooks,
  });
}
