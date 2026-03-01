/**
 * Test scenarios and mock data for Tinder feature testing harness
 *
 * This module provides deterministic mock ideas and preset test scenarios
 * for development and testing without requiring real API calls.
 *
 * Enable test mode via:
 * - URL param: ?testMode=true
 * - URL param: ?testMode=true&scenario=all_rejected
 */

import { DbIdea } from '@/app/db';

// ===== Configuration =====

export const TEST_MODE_PARAM = 'testMode';
export const SCENARIO_PARAM = 'scenario';
export const REPLAY_PARAM = 'replay';

// ===== Types =====

export type TestScenarioId =
  | 'default'           // Standard mix of 100+ ideas
  | 'all_rejected'      // All swipes result in rejection
  | 'batch_boundary'    // Edge cases at batch loading boundaries
  | 'api_failure'       // Simulated API failures
  | 'rapid_fire'        // Fast succession swipes
  | 'empty_state'       // No ideas available
  | 'single_idea'       // Only one idea
  | 'effort_impact_matrix'; // All effort/impact combinations

export interface TestScenario {
  id: TestScenarioId;
  name: string;
  description: string;
  ideaCount: number;
  generateIdeas: (seed?: number) => MockIdea[];
  apiConfig?: {
    failureRate: number;      // 0-1, probability of API failure
    delayMs: number;          // Simulated delay
    failOnAccept: boolean;    // Fail accept calls specifically
    failOnReject: boolean;    // Fail reject calls specifically
  };
}

export interface MockIdea extends Omit<DbIdea, 'scan_id' | 'created_at' | 'updated_at'> {
  scan_id: string;
  created_at: string;
  updated_at: string;
}

export interface SwipeAction {
  timestamp: number;
  ideaId: string;
  action: 'accept' | 'reject' | 'delete';
  duration: number; // Time spent viewing before action
}

export interface ReplaySession {
  id: string;
  scenarioId: TestScenarioId;
  startedAt: string;
  actions: SwipeAction[];
}

// ===== Deterministic Random Number Generator =====

class SeededRandom {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ===== Mock Data Templates =====

const CATEGORIES = [
  'feature',
  'bug_fix',
  'performance',
  'refactor',
  'security',
  'documentation',
  'testing',
  'maintenance',
  'ui_ux',
  'accessibility',
];

const SCAN_TYPES = [
  'code_quality',
  'security_scan',
  'performance_audit',
  'accessibility_check',
  'dependency_review',
  'test_coverage',
  'documentation_gap',
  'tech_debt',
];

const TITLE_TEMPLATES = [
  'Add {feature} to {component}',
  'Fix {issue} in {module}',
  'Optimize {operation} performance',
  'Refactor {component} for maintainability',
  'Improve {aspect} handling',
  'Update {dependency} integration',
  'Enhance {feature} UX',
  'Add tests for {component}',
  'Document {feature} API',
  'Secure {operation} endpoint',
];

const FEATURES = ['caching', 'validation', 'logging', 'pagination', 'filtering', 'sorting', 'authentication', 'error handling'];
const COMPONENTS = ['UserService', 'DataGrid', 'FormBuilder', 'APIClient', 'StateManager', 'EventBus', 'Router', 'Cache'];
const ISSUES = ['memory leak', 'race condition', 'null reference', 'timeout', 'incorrect state', 'missing validation'];
const MODULES = ['auth', 'dashboard', 'settings', 'reports', 'notifications', 'search', 'profile', 'admin'];
const OPERATIONS = ['database query', 'API call', 'file upload', 'image processing', 'data export', 'batch processing'];
const ASPECTS = ['error', 'loading state', 'empty state', 'input', 'form', 'navigation'];
const DEPENDENCIES = ['React', 'TypeScript', 'GraphQL', 'REST API', 'WebSocket', 'IndexedDB'];

const DESCRIPTIONS = [
  'This improvement will enhance the overall user experience by streamlining the workflow.',
  'Addresses a critical issue that has been affecting system stability.',
  'Optimizes resource usage and reduces latency for better performance.',
  'Improves code organization and makes future maintenance easier.',
  'Strengthens security posture and protects against common vulnerabilities.',
  'Enhances accessibility compliance and improves usability for all users.',
  'Adds comprehensive test coverage to prevent regressions.',
  'Updates documentation to reflect current implementation.',
];

const REASONINGS = [
  'Based on analysis of recent error logs and user feedback.',
  'Identified through automated code quality scanning.',
  'Discovered during security audit review.',
  'Suggested by performance profiling data.',
  'Recommended based on industry best practices.',
  'Required to meet accessibility compliance standards.',
  'Needed to support upcoming feature development.',
  'Part of ongoing technical debt reduction efforts.',
];

// ===== Mock Idea Generation =====

function generateTitle(rng: SeededRandom): string {
  const template = rng.pick(TITLE_TEMPLATES);
  return template
    .replace('{feature}', rng.pick(FEATURES))
    .replace('{component}', rng.pick(COMPONENTS))
    .replace('{issue}', rng.pick(ISSUES))
    .replace('{module}', rng.pick(MODULES))
    .replace('{operation}', rng.pick(OPERATIONS))
    .replace('{aspect}', rng.pick(ASPECTS))
    .replace('{dependency}', rng.pick(DEPENDENCIES));
}

function generateMockIdea(index: number, rng: SeededRandom, projectId: string = 'test-project'): MockIdea {
  const now = new Date();
  const createdAt = new Date(now.getTime() - rng.nextInt(0, 7 * 24 * 60 * 60 * 1000));

  return {
    id: `test-idea-${index.toString().padStart(4, '0')}`,
    scan_id: `test-scan-${Math.floor(index / 10)}`,
    project_id: projectId,
    context_id: rng.next() > 0.3 ? `test-context-${rng.nextInt(1, 10)}` : null,
    scan_type: rng.pick(SCAN_TYPES),
    category: rng.pick(CATEGORIES),
    title: generateTitle(rng),
    description: rng.pick(DESCRIPTIONS),
    reasoning: rng.pick(REASONINGS),
    status: 'pending',
    user_feedback: null,
    user_pattern: 0,
    effort: rng.nextInt(1, 10),
    impact: rng.nextInt(1, 10),
    risk: rng.nextInt(1, 10),
    requirement_id: null,
    goal_id: rng.next() > 0.7 ? `test-goal-${rng.nextInt(1, 5)}` : null,
    created_at: createdAt.toISOString(),
    updated_at: createdAt.toISOString(),
    implemented_at: null,
  };
}

// ===== Preset Test Scenarios =====

export const TEST_SCENARIOS: Record<TestScenarioId, TestScenario> = {
  default: {
    id: 'default',
    name: 'Default (100+ ideas)',
    description: 'Standard mix of 100+ ideas with varying effort/impact combinations',
    ideaCount: 120,
    generateIdeas: (seed = 42) => {
      const rng = new SeededRandom(seed);
      return Array.from({ length: 120 }, (_, i) => generateMockIdea(i, rng));
    },
  },

  all_rejected: {
    id: 'all_rejected',
    name: 'All Rejected',
    description: 'Scenario where user rejects all ideas (for testing rejection flow)',
    ideaCount: 50,
    generateIdeas: (seed = 123) => {
      const rng = new SeededRandom(seed);
      return Array.from({ length: 50 }, (_, i) => ({
        ...generateMockIdea(i, rng),
        // Low-value ideas that would typically be rejected
        effort: 9 as const,
        impact: 1 as const,
        category: 'documentation',
      }));
    },
  },

  batch_boundary: {
    id: 'batch_boundary',
    name: 'Batch Boundary',
    description: 'Tests edge cases at batch loading boundaries (20, 40, 60 items)',
    ideaCount: 65,
    generateIdeas: (seed = 456) => {
      const rng = new SeededRandom(seed);
      const ideas = Array.from({ length: 65 }, (_, i) => {
        const idea = generateMockIdea(i, rng);
        // Mark ideas at batch boundaries for easy identification
        if (i === 19 || i === 39 || i === 59) {
          idea.title = `[BATCH BOUNDARY ${Math.floor(i / 20) + 1}] ${idea.title}`;
        }
        return idea;
      });
      return ideas;
    },
  },

  api_failure: {
    id: 'api_failure',
    name: 'API Failures',
    description: 'Simulates random API failures for error handling testing',
    ideaCount: 30,
    generateIdeas: (seed = 789) => {
      const rng = new SeededRandom(seed);
      return Array.from({ length: 30 }, (_, i) => generateMockIdea(i, rng));
    },
    apiConfig: {
      failureRate: 0.3,
      delayMs: 500,
      failOnAccept: true,
      failOnReject: true,
    },
  },

  rapid_fire: {
    id: 'rapid_fire',
    name: 'Rapid Fire',
    description: 'Quick succession swipes to test animation and state handling',
    ideaCount: 100,
    generateIdeas: (seed = 1000) => {
      const rng = new SeededRandom(seed);
      return Array.from({ length: 100 }, (_, i) => ({
        ...generateMockIdea(i, rng),
        // Short titles for faster reading
        title: `Quick idea #${i + 1}`,
        description: 'Fast evaluation item',
        reasoning: null,
      }));
    },
  },

  empty_state: {
    id: 'empty_state',
    name: 'Empty State',
    description: 'No ideas available - tests empty state UI',
    ideaCount: 0,
    generateIdeas: () => [],
  },

  single_idea: {
    id: 'single_idea',
    name: 'Single Idea',
    description: 'Only one idea - tests edge case with minimal data',
    ideaCount: 1,
    generateIdeas: (seed = 1) => {
      const rng = new SeededRandom(seed);
      return [generateMockIdea(0, rng)];
    },
  },

  effort_impact_matrix: {
    id: 'effort_impact_matrix',
    name: 'Effort/Impact Matrix',
    description: 'Key combinations of effort and impact on 1-10 scale',
    ideaCount: 25,
    generateIdeas: (seed = 999) => {
      const rng = new SeededRandom(seed);
      const ideas: MockIdea[] = [];
      let index = 0;
      const levels = [1, 3, 5, 7, 10];

      for (const effort of levels) {
        for (const impact of levels) {
          const idea = generateMockIdea(index++, rng);
          idea.effort = effort;
          idea.impact = impact;
          idea.title = `[E${effort}/I${impact}] ${idea.title}`;
          ideas.push(idea);
        }
      }

      return rng.shuffle(ideas);
    },
  },
};

// ===== Replay System =====

const REPLAY_STORAGE_KEY = 'tinder_replay_sessions';
const MAX_REPLAY_SESSIONS = 10;

export function createReplaySession(scenarioId: TestScenarioId): ReplaySession {
  return {
    id: `replay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    scenarioId,
    startedAt: new Date().toISOString(),
    actions: [],
  };
}

export function recordAction(
  session: ReplaySession,
  ideaId: string,
  action: 'accept' | 'reject' | 'delete',
  viewStartTime: number
): ReplaySession {
  return {
    ...session,
    actions: [
      ...session.actions,
      {
        timestamp: Date.now(),
        ideaId,
        action,
        duration: Date.now() - viewStartTime,
      },
    ],
  };
}

export function saveReplaySession(session: ReplaySession): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(REPLAY_STORAGE_KEY);
    let sessions: ReplaySession[] = stored ? JSON.parse(stored) : [];

    // Add new session and keep only last N sessions
    sessions = [session, ...sessions].slice(0, MAX_REPLAY_SESSIONS);

    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed to save replay session:', e);
  }
}

export function getReplaySessions(): ReplaySession[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(REPLAY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function getReplaySession(sessionId: string): ReplaySession | null {
  return getReplaySessions().find(s => s.id === sessionId) || null;
}

export function deleteReplaySession(sessionId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const sessions = getReplaySessions().filter(s => s.id !== sessionId);
    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore errors
  }
}

export function clearReplaySessions(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(REPLAY_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

// ===== URL Parameter Utilities =====

export function isTestModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(TEST_MODE_PARAM) === 'true';
}

export function getActiveScenario(): TestScenarioId {
  if (typeof window === 'undefined') return 'default';
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get(SCENARIO_PARAM);
  return (scenario && scenario in TEST_SCENARIOS)
    ? scenario as TestScenarioId
    : 'default';
}

export function getReplaySessionId(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(REPLAY_PARAM);
}

export function buildTestModeUrl(scenario: TestScenarioId = 'default', replayId?: string): string {
  const params = new URLSearchParams();
  params.set(TEST_MODE_PARAM, 'true');
  if (scenario !== 'default') {
    params.set(SCENARIO_PARAM, scenario);
  }
  if (replayId) {
    params.set(REPLAY_PARAM, replayId);
  }
  return `${window.location.pathname}?${params.toString()}`;
}

// ===== Simulated API Functions =====

export interface MockApiConfig {
  failureRate?: number;
  delayMs?: number;
  failOnAccept?: boolean;
  failOnReject?: boolean;
}

export function createMockApi(config: MockApiConfig = {}) {
  const {
    failureRate = 0,
    delayMs = 100,
    failOnAccept = false,
    failOnReject = false,
  } = config;

  const shouldFail = () => Math.random() < failureRate;
  const delay = () => new Promise(resolve => setTimeout(resolve, delayMs));

  return {
    async fetchIdeasBatch(
      ideas: MockIdea[],
      offset: number,
      limit: number
    ): Promise<{ ideas: MockIdea[]; hasMore: boolean; total: number }> {
      await delay();
      if (shouldFail()) {
        throw new Error('Simulated API failure: Failed to fetch ideas');
      }

      const batch = ideas.slice(offset, offset + limit);
      return {
        ideas: batch,
        hasMore: offset + limit < ideas.length,
        total: ideas.length,
      };
    },

    async acceptIdea(ideaId: string): Promise<{ success: boolean; requirementName?: string }> {
      await delay();
      if (failOnAccept && shouldFail()) {
        throw new Error('Simulated API failure: Failed to accept idea');
      }
      return {
        success: true,
        requirementName: `req-${ideaId}`,
      };
    },

    async rejectIdea(ideaId: string): Promise<{ success: boolean }> {
      await delay();
      if (failOnReject && shouldFail()) {
        throw new Error('Simulated API failure: Failed to reject idea');
      }
      return { success: true };
    },

    async deleteIdea(ideaId: string): Promise<{ success: boolean }> {
      await delay();
      if (shouldFail()) {
        throw new Error('Simulated API failure: Failed to delete idea');
      }
      return { success: true };
    },
  };
}

// ===== Test Mode State =====

export interface TestModeState {
  enabled: boolean;
  scenarioId: TestScenarioId;
  scenario: TestScenario;
  ideas: MockIdea[];
  replaySession: ReplaySession | null;
  isReplaying: boolean;
  replayIndex: number;
  viewStartTime: number;
  mockApi: ReturnType<typeof createMockApi>;
}

export function initializeTestMode(): TestModeState | null {
  if (!isTestModeEnabled()) return null;

  const scenarioId = getActiveScenario();
  const scenario = TEST_SCENARIOS[scenarioId];
  const ideas = scenario.generateIdeas();

  const replaySessionId = getReplaySessionId();
  const replaySession = replaySessionId
    ? getReplaySession(replaySessionId)
    : createReplaySession(scenarioId);

  return {
    enabled: true,
    scenarioId,
    scenario,
    ideas,
    replaySession,
    isReplaying: !!replaySessionId,
    replayIndex: 0,
    viewStartTime: Date.now(),
    mockApi: createMockApi(scenario.apiConfig),
  };
}

// ===== Export scenario list for UI =====

export function getScenarioList(): Array<{ id: TestScenarioId; name: string; description: string; ideaCount: number }> {
  return Object.values(TEST_SCENARIOS).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    ideaCount: s.ideaCount,
  }));
}
