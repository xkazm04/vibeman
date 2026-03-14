/**
 * Goal Analyzer Integration Tests
 *
 * Tests the 7 phase requirements for the goal analyzer pipeline:
 * GOAL-02, GOAL-03, BACK-01, BACK-02, BACK-03, BRAIN-01, BRAIN-02
 *
 * Mocks: fetch (LLM proxy), getBehavioralContext (Brain), discoverRelevantFiles (file discovery)
 * Real: executeGoalAnalysis logic, response parsing, validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// Mock setup
// ============================================================================

// Track the prompt sent to the LLM for Brain-related assertions
let capturedPrompt = '';

// Mock fetch globally to intercept /api/ai/chat calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Brain context mock data
let mockBrainContext: {
  hasData: boolean;
  topInsights: Array<{ title: string; description: string; confidence: number }>;
  patterns: { preferredContexts: string[]; revertedCount: number };
} = {
  hasData: false,
  topInsights: [],
  patterns: { preferredContexts: [], revertedCount: 0 },
};

// Mock Brain behavioral context
vi.mock('@/lib/brain/behavioralContext', () => ({
  getBehavioralContext: (_projectId: string) => mockBrainContext,
}));

// Mock file discovery
vi.mock(
  '@/app/features/Manager/lib/conductor/stages/fileDiscovery',
  () => ({
    discoverRelevantFiles: () => ({
      files: [
        { path: 'src/api/routes.ts', content: 'export function handler() {}' },
        { path: 'src/lib/parser.ts', content: 'export function parse() {}' },
      ],
      fileTree: 'src/\n  api/\n    routes.ts\n  lib/\n    parser.ts',
    }),
  })
);

// Mock context DB for domain assignment
vi.mock('@/app/db', () => ({
  contextDb: {
    getContextsByProjectId: () => [
      { id: 'ctx-api', name: 'API Layer' },
      { id: 'ctx-lib', name: 'Libraries' },
    ],
  },
}));

// ============================================================================
// Standard mock LLM response
// ============================================================================

const MOCK_LLM_RESPONSE = {
  gaps: [
    {
      type: 'missing_feature',
      title: 'Missing auth middleware',
      description: 'No auth check on API routes',
      affectedFiles: ['src/api/routes.ts'],
      severity: 'high',
    },
    {
      type: 'missing_tests',
      title: 'No unit tests for parser',
      description: 'Parser module has zero test coverage',
      affectedFiles: ['src/lib/parser.ts'],
      severity: 'medium',
    },
    {
      type: 'tech_debt',
      title: 'Hardcoded config values',
      description: 'Config values scattered across files',
      affectedFiles: ['src/api/routes.ts'],
      severity: 'low',
    },
    {
      type: 'missing_docs',
      title: 'No API documentation',
      description: 'Public API endpoints lack documentation',
      affectedFiles: ['src/api/routes.ts'],
      severity: 'medium',
    },
  ],
  backlogItems: [
    {
      title: 'Add auth middleware',
      description: 'Implement JWT auth middleware for API routes',
      reasoning: 'Security gap identified by architecture review',
      effort: 5,
      impact: 9,
      risk: 3,
      category: 'feature',
      contextId: 'ctx-api',
      source: 'structural_analysis',
      sourceScanType: 'zen_architect',
      relevanceScore: 0.95,
    },
    {
      title: 'Refactor error handling',
      description: 'Centralize error handling across API layer',
      reasoning: 'Architect perspective: reduces code duplication',
      effort: 3,
      impact: 6,
      risk: 2,
      category: 'improvement',
      contextId: null,
      source: 'creative_suggestion',
      sourceScanType: 'zen_architect',
      relevanceScore: 0.7,
    },
    {
      title: 'Add parser edge case tests',
      description: 'Cover null input and malformed data paths',
      reasoning: 'Bug hunter perspective: untested failure modes',
      effort: 2,
      impact: 7,
      risk: 1,
      category: 'testing',
      contextId: 'ctx-lib',
      source: 'structural_analysis',
      sourceScanType: 'bug_hunter',
      relevanceScore: 0.85,
    },
  ],
};

// ============================================================================
// Helpers
// ============================================================================

function setupMockFetch(response = MOCK_LLM_RESPONSE) {
  mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
    // Capture the prompt for Brain assertions
    if (options?.body) {
      const body = JSON.parse(options.body as string);
      capturedPrompt = body.messages?.[0]?.content || '';
    }
    return {
      ok: true,
      text: async () => JSON.stringify(response),
    };
  });
}

function createTestInput() {
  return {
    runId: 'test-run-001',
    projectId: 'test-project-001',
    projectPath: '/tmp/test-project',
    goal: {
      id: 'goal-001',
      title: 'Add authentication system',
      description: 'Implement JWT-based authentication with login, signup, and protected routes',
      target_paths: null,
      use_brain: true,
    },
    config: {
      scanTypes: ['zen_architect', 'bug_hunter', 'ui_perfectionist'] as const,
      contextStrategy: 'balanced' as const,
      batchStrategy: 'domain-first' as const,
      maxCyclesPerRun: 3,
      healingEnabled: false,
      scanModel: 'sonnet',
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

// Import after mocks are set up
import { executeGoalAnalysis } from '@/app/features/Manager/lib/conductor/stages/goalAnalyzer';

describe('Goal Analyzer Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPrompt = '';
    mockBrainContext = {
      hasData: false,
      topInsights: [],
      patterns: { preferredContexts: [], revertedCount: 0 },
    };
  });

  // ---- GOAL-02 ----
  it('GOAL-02: analyzes codebase relative to goal', async () => {
    setupMockFetch();
    const input = createTestInput();

    const result = await executeGoalAnalysis(input);

    // Verify it returns a GoalAnalyzerOutput with non-empty gapReport
    expect(result).toBeDefined();
    expect(result.gapReport).toBeDefined();
    expect(result.gapReport.goalId).toBe('goal-001');
    expect(result.gapReport.analyzedFiles).toHaveLength(2);
    expect(result.gapReport.analyzedAt).toBeTruthy();

    // Verify the LLM was called
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/chat'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  // ---- GOAL-03 ----
  it('GOAL-03: gap report has categorized gaps', async () => {
    setupMockFetch();
    const input = createTestInput();

    const result = await executeGoalAnalysis(input);

    // Verify gaps contain items with valid type values
    expect(result.gapReport.gaps.length).toBeGreaterThan(0);

    const validTypes = new Set(['missing_feature', 'tech_debt', 'missing_tests', 'missing_docs']);
    for (const gap of result.gapReport.gaps) {
      expect(validTypes.has(gap.type)).toBe(true);
      expect(gap.title).toBeTruthy();
      expect(gap.description).toBeTruthy();
    }

    // Verify we got multiple gap types
    const gapTypes = new Set(result.gapReport.gaps.map(g => g.type));
    expect(gapTypes.size).toBeGreaterThanOrEqual(2);
  });

  // ---- BACK-01 ----
  it('BACK-01: generates prioritized backlog items from gap analysis', async () => {
    setupMockFetch();
    const input = createTestInput();

    const result = await executeGoalAnalysis(input);

    // Verify backlogItems is an array with items that have priority fields
    expect(result.backlogItems.length).toBeGreaterThan(0);

    for (const item of result.backlogItems) {
      expect(typeof item.effort).toBe('number');
      expect(typeof item.impact).toBe('number');
      expect(typeof item.risk).toBe('number');
      expect(item.effort).toBeGreaterThanOrEqual(1);
      expect(item.effort).toBeLessThanOrEqual(10);
      expect(item.impact).toBeGreaterThanOrEqual(1);
      expect(item.impact).toBeLessThanOrEqual(10);
      expect(item.risk).toBeGreaterThanOrEqual(1);
      expect(item.risk).toBeLessThanOrEqual(10);
    }
  });

  // ---- BACK-02 ----
  it('BACK-02: scan type perspectives produce creative suggestions', async () => {
    setupMockFetch();
    const input = createTestInput();

    const result = await executeGoalAnalysis(input);

    // Verify at least one backlog item has source 'creative_suggestion' with a valid sourceScanType
    const creativeSuggestions = result.backlogItems.filter(
      item => item.source === 'creative_suggestion'
    );
    expect(creativeSuggestions.length).toBeGreaterThan(0);

    for (const item of creativeSuggestions) {
      expect(item.sourceScanType).toBeDefined();
      expect(['zen_architect', 'bug_hunter', 'ui_perfectionist']).toContain(
        item.sourceScanType
      );
    }

    // Verify structural_analysis items also exist
    const structuralItems = result.backlogItems.filter(
      item => item.source === 'structural_analysis'
    );
    expect(structuralItems.length).toBeGreaterThan(0);
  });

  // ---- BACK-03 ----
  it('BACK-03: items include rationale, effort, and domain', async () => {
    setupMockFetch();
    const input = createTestInput();

    const result = await executeGoalAnalysis(input);

    for (const item of result.backlogItems) {
      // Reasoning (rationale) must be non-empty
      expect(item.reasoning).toBeTruthy();
      expect(item.reasoning.length).toBeGreaterThan(0);

      // Effort must be a number between 1-10
      expect(item.effort).toBeGreaterThanOrEqual(1);
      expect(item.effort).toBeLessThanOrEqual(10);

      // contextId must be string or null
      expect(
        item.contextId === null || typeof item.contextId === 'string'
      ).toBe(true);
    }

    // Verify contextId is present as a field (string or null) on all items
    for (const item of result.backlogItems) {
      expect('contextId' in item).toBe(true);
    }
  });

  // ---- BRAIN-01 ----
  it('BRAIN-01: brain patterns included in analysis prompt when available', async () => {
    setupMockFetch();

    // Set up Brain with data
    mockBrainContext = {
      hasData: true,
      topInsights: [
        {
          title: 'API patterns stable',
          description: 'REST endpoints follow consistent naming',
          confidence: 85,
        },
        {
          title: 'Test coverage gap',
          description: 'Integration tests missing for auth flows',
          confidence: 72,
        },
      ],
      patterns: {
        preferredContexts: ['API Layer', 'Auth'],
        revertedCount: 2,
      },
    };

    const input = createTestInput();
    input.goal.use_brain = true;

    await executeGoalAnalysis(input);

    // Verify the prompt contains Brain-related text
    expect(capturedPrompt).toContain('Project Intelligence');
    expect(capturedPrompt).toContain('This project has learned');
    expect(capturedPrompt).toContain('API patterns stable');
    expect(capturedPrompt).toContain('Preferred areas');
    expect(capturedPrompt).toContain('Caution');
    expect(capturedPrompt).toContain('reverts');
  });

  // ---- BRAIN-02 ----
  it('BRAIN-02: analysis proceeds without Brain when no data', async () => {
    setupMockFetch();

    // Set Brain to no data
    mockBrainContext = {
      hasData: false,
      topInsights: [],
      patterns: { preferredContexts: [], revertedCount: 0 },
    };

    const input = createTestInput();
    input.goal.use_brain = true;

    const result = await executeGoalAnalysis(input);

    // Verify it returns valid output without crashing
    expect(result).toBeDefined();
    expect(result.gapReport).toBeDefined();
    expect(result.gapReport.gaps.length).toBeGreaterThan(0);
    expect(result.backlogItems.length).toBeGreaterThan(0);

    // Verify the prompt does NOT contain Brain section text
    expect(capturedPrompt).not.toContain('Project Intelligence');
    expect(capturedPrompt).not.toContain('This project has learned');
  });
});
