import { describe, it, expect } from 'vitest';
import {
  TINDER_FILTER_SPEC,
  getDimensionsToClear,
  resolveActiveFilters,
  applyDimensionSwitch,
  buildActivePredicates,
  applyFilterPredicates,
  appendFilterParams,
} from '@/app/features/tinder/lib/filterAlgebra';
import type { FilterSpec, FilterState } from '@/app/features/tinder/lib/filterAlgebra';

describe('filterAlgebra', () => {
  describe('TINDER_FILTER_SPEC', () => {
    it('declares category and scanType as mutually exclusive', () => {
      const category = TINDER_FILTER_SPEC.dimensions.find(d => d.name === 'category');
      const scanType = TINDER_FILTER_SPEC.dimensions.find(d => d.name === 'scanType');
      expect(category?.exclusive).toContain('scanType');
      expect(scanType?.exclusive).toContain('category');
    });

    it('declares context as independent (no exclusions)', () => {
      const context = TINDER_FILTER_SPEC.dimensions.find(d => d.name === 'context');
      expect(context?.exclusive).toBeUndefined();
    });
  });

  describe('getDimensionsToClear', () => {
    it('returns exclusive dimensions + self when activating category', () => {
      const result = getDimensionsToClear(TINDER_FILTER_SPEC, 'category');
      expect(result).toContain('scanType');
      expect(result).toContain('category');
      expect(result).not.toContain('context');
    });

    it('returns exclusive dimensions + self when activating scanType', () => {
      const result = getDimensionsToClear(TINDER_FILTER_SPEC, 'scanType');
      expect(result).toContain('category');
      expect(result).toContain('scanType');
      expect(result).not.toContain('context');
    });

    it('returns only self for independent dimension (context)', () => {
      const result = getDimensionsToClear(TINDER_FILTER_SPEC, 'context');
      expect(result).toEqual(['context']);
    });

    it('returns empty array for unknown dimension', () => {
      const result = getDimensionsToClear(TINDER_FILTER_SPEC, 'unknown');
      expect(result).toEqual([]);
    });
  });

  describe('resolveActiveFilters', () => {
    it('suppresses scanType when category is active dimension', () => {
      const state: FilterState = {
        category: 'bug',
        scanType: 'overall',
        context: 'ctx-1',
      };
      const result = resolveActiveFilters(TINDER_FILTER_SPEC, 'category', state);
      expect(result.category).toBe('bug');
      expect(result.scanType).toBeNull();
      expect(result.context).toBe('ctx-1');
    });

    it('suppresses category when scanType is active dimension', () => {
      const state: FilterState = {
        category: 'bug',
        scanType: 'overall',
        context: null,
      };
      const result = resolveActiveFilters(TINDER_FILTER_SPEC, 'scanType', state);
      expect(result.category).toBeNull();
      expect(result.scanType).toBe('overall');
      expect(result.context).toBeNull();
    });

    it('preserves all filters for independent active dimension', () => {
      const state: FilterState = {
        category: 'bug',
        scanType: 'overall',
        context: 'ctx-1',
      };
      // context has no exclusions, so nothing is suppressed
      const result = resolveActiveFilters(TINDER_FILTER_SPEC, 'context', state);
      expect(result.category).toBe('bug');
      expect(result.scanType).toBe('overall');
      expect(result.context).toBe('ctx-1');
    });
  });

  describe('applyDimensionSwitch', () => {
    it('clears both category and scanType when switching to category', () => {
      const state: FilterState = {
        category: 'bug',
        scanType: 'overall',
        context: 'ctx-1',
      };
      const result = applyDimensionSwitch(TINDER_FILTER_SPEC, state, 'category');
      expect(result.category).toBeNull();
      expect(result.scanType).toBeNull();
      expect(result.context).toBe('ctx-1'); // independent — untouched
    });

    it('clears both when switching to scanType', () => {
      const state: FilterState = {
        category: 'feature',
        scanType: null,
        context: null,
      };
      const result = applyDimensionSwitch(TINDER_FILTER_SPEC, state, 'scanType');
      expect(result.category).toBeNull();
      expect(result.scanType).toBeNull();
    });

    it('only clears self for independent dimension', () => {
      const state: FilterState = {
        category: 'bug',
        scanType: null,
        context: 'ctx-1',
      };
      const result = applyDimensionSwitch(TINDER_FILTER_SPEC, state, 'context');
      expect(result.category).toBe('bug');
      expect(result.scanType).toBeNull();
      expect(result.context).toBeNull();
    });
  });

  describe('buildActivePredicates + applyFilterPredicates', () => {
    interface TestItem {
      category: string;
      scanType: string;
      contextId: string | null;
    }

    const items: TestItem[] = [
      { category: 'bug', scanType: 'overall', contextId: 'ctx-1' },
      { category: 'feature', scanType: 'zen_architect', contextId: null },
      { category: 'bug', scanType: 'zen_architect', contextId: 'ctx-1' },
      { category: 'feature', scanType: 'overall', contextId: 'ctx-2' },
    ];

    const matchers: Record<string, (value: string, item: TestItem) => boolean> = {
      category: (v, item) => item.category === v,
      scanType: (v, item) => item.scanType === v,
      context: (v, item) => v === 'unassigned' ? !item.contextId : item.contextId === v,
    };

    it('filters by category when category is active dimension', () => {
      const state: FilterState = { category: 'bug', scanType: null, context: null };
      const predicates = buildActivePredicates(TINDER_FILTER_SPEC, 'category', state, matchers);
      const result = applyFilterPredicates(items, predicates);
      expect(result).toHaveLength(2);
      expect(result.every(i => i.category === 'bug')).toBe(true);
    });

    it('filters by scanType when scanType is active dimension', () => {
      const state: FilterState = { category: null, scanType: 'zen_architect', context: null };
      const predicates = buildActivePredicates(TINDER_FILTER_SPEC, 'scanType', state, matchers);
      const result = applyFilterPredicates(items, predicates);
      expect(result).toHaveLength(2);
      expect(result.every(i => i.scanType === 'zen_architect')).toBe(true);
    });

    it('combines category + context (AND logic)', () => {
      const state: FilterState = { category: 'bug', scanType: null, context: 'ctx-1' };
      const predicates = buildActivePredicates(TINDER_FILTER_SPEC, 'category', state, matchers);
      const result = applyFilterPredicates(items, predicates);
      expect(result).toHaveLength(2); // both bugs have ctx-1
    });

    it('suppresses scanType even if it has a value when category is active', () => {
      const state: FilterState = { category: 'bug', scanType: 'overall', context: null };
      const predicates = buildActivePredicates(TINDER_FILTER_SPEC, 'category', state, matchers);
      const result = applyFilterPredicates(items, predicates);
      // scanType 'overall' should be suppressed, so both bugs match
      expect(result).toHaveLength(2);
    });

    it('returns all items when no filters are set', () => {
      const state: FilterState = { category: null, scanType: null, context: null };
      const predicates = buildActivePredicates(TINDER_FILTER_SPEC, 'category', state, matchers);
      const result = applyFilterPredicates(items, predicates);
      expect(result).toHaveLength(4);
    });

    it('handles unassigned context filter', () => {
      const state: FilterState = { category: null, scanType: null, context: 'unassigned' };
      const predicates = buildActivePredicates(TINDER_FILTER_SPEC, 'category', state, matchers);
      const result = applyFilterPredicates(items, predicates);
      expect(result).toHaveLength(1);
      expect(result[0].contextId).toBeNull();
    });
  });

  describe('appendFilterParams', () => {
    it('appends only active dimension params', () => {
      const params = new URLSearchParams();
      const state: FilterState = { category: 'bug', scanType: 'overall', context: 'ctx-1' };
      appendFilterParams(params, TINDER_FILTER_SPEC, 'category', state);
      expect(params.get('category')).toBe('bug');
      expect(params.get('scanType')).toBeNull(); // suppressed
      expect(params.get('context')).toBe('ctx-1'); // independent
    });

    it('uses custom param names when provided', () => {
      const params = new URLSearchParams();
      const state: FilterState = { category: 'bug', scanType: null, context: 'ctx-1' };
      appendFilterParams(params, TINDER_FILTER_SPEC, 'category', state, {
        context: 'contextId',
      });
      expect(params.get('category')).toBe('bug');
      expect(params.get('contextId')).toBe('ctx-1');
      expect(params.get('context')).toBeNull();
    });

    it('skips null values', () => {
      const params = new URLSearchParams();
      const state: FilterState = { category: null, scanType: null, context: null };
      appendFilterParams(params, TINDER_FILTER_SPEC, 'category', state);
      expect(params.toString()).toBe('');
    });
  });

  describe('extensibility — custom spec', () => {
    it('supports adding a new independent dimension without changing logic', () => {
      const extendedSpec: FilterSpec = {
        dimensions: [
          { name: 'category', exclusive: ['scanType'] },
          { name: 'scanType', exclusive: ['category'] },
          { name: 'context' },
          { name: 'priority' }, // new independent dimension
        ],
      };

      const state: FilterState = {
        category: 'bug',
        scanType: null,
        context: 'ctx-1',
        priority: 'high',
      };

      const result = resolveActiveFilters(extendedSpec, 'category', state);
      expect(result.category).toBe('bug');
      expect(result.scanType).toBeNull();
      expect(result.context).toBe('ctx-1');
      expect(result.priority).toBe('high');
    });
  });
});
