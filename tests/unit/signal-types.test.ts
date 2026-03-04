/**
 * Tests for canonical signal type enum
 */

import { describe, it, expect } from 'vitest';
import {
  SignalType,
  SIGNAL_METADATA,
  getAllSignalTypes,
  getVisualizableSignalTypes,
  canVisualizeSignal,
  getSignalMetadata,
  isValidSignalType,
} from '@/types/signals';

describe('Canonical Signal Types', () => {
  describe('SignalType enum', () => {
    it('should define all 7 signal types', () => {
      const types = Object.values(SignalType);
      expect(types).toHaveLength(7);
      expect(types).toContain('git_activity');
      expect(types).toContain('api_focus');
      expect(types).toContain('context_focus');
      expect(types).toContain('implementation');
      expect(types).toContain('cross_task_analysis');
      expect(types).toContain('cross_task_selection');
      expect(types).toContain('cli_memory');
    });
  });

  describe('SIGNAL_METADATA', () => {
    it('should have metadata for all signal types', () => {
      const types = Object.values(SignalType);
      types.forEach((type) => {
        const metadata = SIGNAL_METADATA[type];
        expect(metadata).toBeDefined();
        expect(metadata.displayName).toBeTruthy();
        expect(metadata.shortLabel).toBeTruthy();
        expect(metadata.color).toBeTruthy();
        expect(typeof metadata.canVisualize).toBe('boolean');
        expect(metadata.description).toBeTruthy();
      });
    });

    it('should mark correct signal types as visualizable', () => {
      expect(SIGNAL_METADATA[SignalType.GIT_ACTIVITY].canVisualize).toBe(true);
      expect(SIGNAL_METADATA[SignalType.API_FOCUS].canVisualize).toBe(true);
      expect(SIGNAL_METADATA[SignalType.CONTEXT_FOCUS].canVisualize).toBe(true);
      expect(SIGNAL_METADATA[SignalType.IMPLEMENTATION].canVisualize).toBe(true);
      expect(SIGNAL_METADATA[SignalType.CROSS_TASK_ANALYSIS].canVisualize).toBe(false);
      expect(SIGNAL_METADATA[SignalType.CROSS_TASK_SELECTION].canVisualize).toBe(false);
      expect(SIGNAL_METADATA[SignalType.CLI_MEMORY].canVisualize).toBe(false);
    });

    it('should have valid color hex codes', () => {
      const types = Object.values(SignalType);
      types.forEach((type) => {
        const color = SIGNAL_METADATA[type].color;
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('getAllSignalTypes', () => {
    it('should return all 7 signal types', () => {
      const types = getAllSignalTypes();
      expect(types).toHaveLength(7);
      expect(types).toEqual([
        'git_activity',
        'api_focus',
        'context_focus',
        'implementation',
        'cross_task_analysis',
        'cross_task_selection',
        'cli_memory',
      ]);
    });
  });

  describe('getVisualizableSignalTypes', () => {
    it('should return only visualizable signal types', () => {
      const types = getVisualizableSignalTypes();
      expect(types).toHaveLength(4);
      expect(types).toContain('git_activity');
      expect(types).toContain('api_focus');
      expect(types).toContain('context_focus');
      expect(types).toContain('implementation');
      expect(types).not.toContain('cross_task_analysis');
      expect(types).not.toContain('cross_task_selection');
      expect(types).not.toContain('cli_memory');
    });
  });

  describe('canVisualizeSignal', () => {
    it('should return true for visualizable types', () => {
      expect(canVisualizeSignal('git_activity')).toBe(true);
      expect(canVisualizeSignal('api_focus')).toBe(true);
      expect(canVisualizeSignal('context_focus')).toBe(true);
      expect(canVisualizeSignal('implementation')).toBe(true);
    });

    it('should return false for non-visualizable types', () => {
      expect(canVisualizeSignal('cross_task_analysis')).toBe(false);
      expect(canVisualizeSignal('cross_task_selection')).toBe(false);
      expect(canVisualizeSignal('cli_memory')).toBe(false);
    });
  });

  describe('getSignalMetadata', () => {
    it('should return metadata for valid signal types', () => {
      const metadata = getSignalMetadata('git_activity');
      expect(metadata).toBeDefined();
      expect(metadata?.displayName).toBe('Git Activity');
      expect(metadata?.shortLabel).toBe('Git');
      expect(metadata?.canVisualize).toBe(true);
    });

    it('should return undefined for invalid signal types', () => {
      const metadata = getSignalMetadata('invalid_type' as any);
      expect(metadata).toBeUndefined();
    });
  });

  describe('isValidSignalType', () => {
    it('should return true for valid signal types', () => {
      expect(isValidSignalType('git_activity')).toBe(true);
      expect(isValidSignalType('api_focus')).toBe(true);
      expect(isValidSignalType('cli_memory')).toBe(true);
    });

    it('should return false for invalid signal types', () => {
      expect(isValidSignalType('invalid_type')).toBe(false);
      expect(isValidSignalType('')).toBe(false);
      expect(isValidSignalType(null)).toBe(false);
      expect(isValidSignalType(undefined)).toBe(false);
      expect(isValidSignalType(123)).toBe(false);
      expect(isValidSignalType({})).toBe(false);
    });
  });

  describe('Consistency across layers', () => {
    it('should have matching types in canvas constants', async () => {
      const { LANE_TYPES } = await import('@/app/features/Brain/sub_MemoryCanvas/lib/constants');
      const visualizable = getVisualizableSignalTypes();
      expect(LANE_TYPES).toEqual(visualizable);
    });

    it('should have color for every visualizable type', async () => {
      const { COLORS } = await import('@/app/features/Brain/sub_MemoryCanvas/lib/constants');
      const visualizable = getVisualizableSignalTypes();
      visualizable.forEach((type) => {
        expect(COLORS[type]).toBeTruthy();
        expect(COLORS[type]).toBe(SIGNAL_METADATA[type].color);
      });
    });

    it('should have label for every visualizable type', async () => {
      const { LABELS } = await import('@/app/features/Brain/sub_MemoryCanvas/lib/constants');
      const visualizable = getVisualizableSignalTypes();
      visualizable.forEach((type) => {
        expect(LABELS[type]).toBeTruthy();
        expect(LABELS[type]).toBe(SIGNAL_METADATA[type].shortLabel);
      });
    });
  });
});
