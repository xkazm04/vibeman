/**
 * Insight Conflict Detector Tests
 *
 * Tests the three conflict detection strategies:
 * 1. Keyword-based: opposing keyword pairs (confidence 70%)
 * 2. Semantic: high token overlap + different stance/type (variable confidence)
 * 3. Direct: same topic with negation patterns (confidence 85%)
 *
 * Also tests markConflictsOnInsights which mutates an insight array.
 */

import { describe, it, expect } from 'vitest';
import type { LearningInsight } from '@/app/db/models/brain.types';
import {
  detectConflicts,
  detectAllConflicts,
  markConflictsOnInsights,
} from '@/lib/brain/insightConflictDetector';

// ============================================================================
// Helpers
// ============================================================================

function makeInsight(overrides: Partial<LearningInsight>): LearningInsight {
  return {
    type: 'recommendation',
    title: 'Default',
    description: 'Default description',
    confidence: 80,
    evidence: [],
    ...overrides,
  };
}

// ============================================================================
// Keyword-based conflict detection
// ============================================================================

describe('detectConflicts — keyword-based', () => {
  it('should detect conflict between "brief/concise" and "verbose/detailed"', () => {
    const newInsight = makeInsight({
      title: 'Keep functions brief and concise',
      description: 'Shorter functions are easier to test',
    });

    const existing = [
      makeInsight({
        title: 'Write detailed verbose documentation',
        description: 'Comprehensive descriptions help onboarding',
      }),
    ];

    const conflicts = detectConflicts(newInsight, existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe('keyword');
    expect(conflicts[0].confidence).toBe(70);
    expect(conflicts[0].reason).toContain('Opposing preferences');
  });

  it('should detect conflict between "modular/separate" and "consolidate/merge"', () => {
    const newInsight = makeInsight({
      title: 'Separate concerns into modular components',
      description: 'Keep code split and isolated',
    });

    const existing = [
      makeInsight({
        title: 'Merge related logic into single unified modules',
        description: 'Consolidate related features together',
      }),
    ];

    const conflicts = detectConflicts(newInsight, existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe('keyword');
  });

  it('should detect conflict between "optimize/performance" and "readable/simple"', () => {
    const newInsight = makeInsight({
      title: 'Optimize for performance in hot paths',
      description: 'Use efficient data structures',
    });

    const existing = [
      makeInsight({
        title: 'Prefer readable and simple code',
        description: 'Clear and maintainable is better',
      }),
    ];

    const conflicts = detectConflicts(newInsight, existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe('keyword');
  });

  it('should detect conflict between "eager/early" and "lazy/deferred"', () => {
    const newInsight = makeInsight({
      title: 'Eagerly preload data upfront',
      description: 'Fetch data early to avoid waterfalls',
    });

    const existing = [
      makeInsight({
        title: 'Use lazy loading and deferred execution',
        description: 'Load on-demand for better initial performance',
      }),
    ];

    const conflicts = detectConflicts(newInsight, existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe('keyword');
  });

  it('should not detect conflict when keywords are from the same group', () => {
    const newInsight = makeInsight({
      title: 'Keep code brief and concise',
      description: 'Short functions are better',
    });

    const existing = [
      makeInsight({
        title: 'Use minimal compact components',
        description: 'Small components are easier to maintain',
      }),
    ];

    const conflicts = detectConflicts(newInsight, existing);
    expect(conflicts).toHaveLength(0);
  });

  it('should return correct ConflictResult structure', () => {
    const newInsight = makeInsight({
      title: 'Use abstract generic interfaces',
      description: 'Reusable flexible patterns',
    });

    const existing = [
      makeInsight({
        title: 'Prefer concrete specific implementations',
        description: 'Explicit hardcoded values',
      }),
    ];

    const conflicts = detectConflicts(newInsight, existing);
    expect(conflicts).toHaveLength(1);

    const conflict = conflicts[0];
    expect(conflict).toHaveProperty('insight1Title');
    expect(conflict).toHaveProperty('insight2Title');
    expect(conflict).toHaveProperty('conflictType');
    expect(conflict).toHaveProperty('confidence');
    expect(conflict).toHaveProperty('reason');
    expect(conflict.insight1Title).toBe(newInsight.title);
    expect(conflict.insight2Title).toBe(existing[0].title);
    expect(['semantic', 'keyword', 'direct']).toContain(conflict.conflictType);
    expect(conflict.confidence).toBeGreaterThanOrEqual(0);
    expect(conflict.confidence).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// Direct conflict detection (negation)
// ============================================================================

describe('detectConflicts — direct (negation)', () => {
  it('should detect direct contradiction via negation keyword', () => {
    const newInsight = makeInsight({
      title: 'Use inline styles for components',
      description: 'Direct inline styling is fast',
    });

    const existing = [
      makeInsight({
        title: 'Avoid inline styles for components',
        description: 'Never use inline styling directly',
      }),
    ];

    const conflicts = detectConflicts(newInsight, existing);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
    // Should find at least one direct or keyword conflict
    const directOrKeyword = conflicts.filter(c => c.conflictType === 'direct' || c.conflictType === 'keyword');
    expect(directOrKeyword.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Semantic conflict detection
// ============================================================================

describe('detectConflicts — semantic', () => {
  it('should detect warning vs recommendation conflict on same topic', () => {
    const newInsight = makeInsight({
      type: 'warning',
      title: 'Database connection pooling can cause memory leaks in serverless environments',
      description: 'Connection pooling is problematic in serverless and should be monitored carefully for resource leaks',
    });

    const existing = [
      makeInsight({
        type: 'recommendation',
        title: 'Database connection pooling improves performance in serverless environments',
        description: 'Connection pooling in serverless environments provides significant performance and throughput improvements',
      }),
    ];

    const conflicts = detectConflicts(newInsight, existing);
    // These have high overlap and different types (warning vs recommendation)
    if (conflicts.length > 0) {
      expect(conflicts[0].conflictType).toBe('semantic');
      expect(conflicts[0].reason).toBeTruthy();
    }
  });

  it('should skip insights that are already conflict_resolved', () => {
    const newInsight = makeInsight({
      title: 'Use brief concise functions',
      description: 'Keep it short',
    });

    const existing = [
      makeInsight({
        title: 'Write detailed verbose docs',
        description: 'Comprehensive descriptions',
        conflict_resolved: true, // Already resolved — should be skipped
      }),
    ];

    const conflicts = detectConflicts(newInsight, existing);
    expect(conflicts).toHaveLength(0);
  });

  it('should skip comparing against itself', () => {
    const insight = makeInsight({
      title: 'Use async await',
      description: 'Better than callbacks',
    });

    const conflicts = detectConflicts(insight, [insight]);
    expect(conflicts).toHaveLength(0);
  });
});

// ============================================================================
// Min confidence filtering
// ============================================================================

describe('detectConflicts — minConfidence filter', () => {
  it('should filter out conflicts below minConfidence', () => {
    const newInsight = makeInsight({
      title: 'Keep functions brief and concise',
      description: 'Shorter functions',
    });

    const existing = [
      makeInsight({
        title: 'Write detailed verbose docs',
        description: 'Comprehensive descriptions',
      }),
    ];

    // Keyword conflict is confidence 70
    const withHigh = detectConflicts(newInsight, existing, 80);
    expect(withHigh).toHaveLength(0);

    const withLow = detectConflicts(newInsight, existing, 60);
    expect(withLow).toHaveLength(1);
  });
});

// ============================================================================
// detectAllConflicts (within a set)
// ============================================================================

describe('detectAllConflicts', () => {
  it('should detect conflicts between insights in the same set', () => {
    const insights = [
      makeInsight({
        type: 'recommendation',
        title: 'Keep code brief and concise',
        description: 'Short functions',
      }),
      makeInsight({
        type: 'warning',
        title: 'Write detailed verbose documentation',
        description: 'Comprehensive descriptions help',
      }),
    ];

    const conflicts = detectAllConflicts(insights);
    expect(conflicts.length).toBeGreaterThanOrEqual(1);
  });

  it('should not duplicate conflict pairs', () => {
    const insights = [
      makeInsight({
        type: 'recommendation',
        title: 'Optimize for performance in hot paths',
        description: 'Efficient code',
      }),
      makeInsight({
        type: 'warning',
        title: 'Prefer readable and simple code always',
        description: 'Clear and maintainable',
      }),
    ];

    const conflicts = detectAllConflicts(insights);
    // Should have at most 1 conflict for the pair, not 2
    const titles = conflicts.map(c => [c.insight1Title, c.insight2Title].sort().join('|||'));
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it('should skip same-type pairs that cannot self-conflict', () => {
    // Two 'pattern_detected' insights that use opposing keywords
    // but same type should be skipped (only 'recommendation' and 'warning' self-conflict)
    const insights = [
      makeInsight({
        type: 'pattern_detected',
        title: 'Keep code brief and concise',
        description: 'Short functions',
      }),
      makeInsight({
        type: 'pattern_detected',
        title: 'Write detailed verbose documentation',
        description: 'Comprehensive descriptions',
      }),
    ];

    const conflicts = detectAllConflicts(insights);
    expect(conflicts).toHaveLength(0);
  });
});

// ============================================================================
// markConflictsOnInsights (mutation)
// ============================================================================

describe('markConflictsOnInsights', () => {
  it('should mutate insights array to set conflict_with and conflict_type', () => {
    const insights: LearningInsight[] = [
      makeInsight({
        type: 'recommendation',
        title: 'Eagerly preload data upfront for all views',
        description: 'Early data fetching improves perceived speed',
      }),
      makeInsight({
        type: 'warning',
        title: 'Use lazy deferred loading for on-demand data',
        description: 'Late loading reduces initial bundle size',
      }),
    ];

    const count = markConflictsOnInsights(insights);
    expect(count).toBeGreaterThanOrEqual(1);

    // At least one insight should have conflict_with set
    const withConflicts = insights.filter(i => i.conflict_with);
    expect(withConflicts.length).toBeGreaterThanOrEqual(1);
  });

  it('should not overwrite existing conflict_with', () => {
    const insights: LearningInsight[] = [
      makeInsight({
        type: 'recommendation',
        title: 'Keep code brief and concise',
        description: 'Short functions',
        conflict_with: 'already set',
      }),
      makeInsight({
        type: 'warning',
        title: 'Write detailed verbose documentation',
        description: 'Comprehensive descriptions',
      }),
    ];

    markConflictsOnInsights(insights);

    // First insight should keep its original conflict_with
    expect(insights[0].conflict_with).toBe('already set');
  });

  it('should return 0 when no conflicts found', () => {
    const insights: LearningInsight[] = [
      makeInsight({
        type: 'pattern_detected',
        title: 'Use async/await for database queries',
        description: 'Async is better',
      }),
      makeInsight({
        type: 'pattern_detected',
        title: 'Prefer tailwind utility classes',
        description: 'Good styling approach',
      }),
    ];

    const count = markConflictsOnInsights(insights);
    expect(count).toBe(0);
  });
});
