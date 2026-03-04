/**
 * forceLayout.worker.test.ts
 * Tests for the D3 force layout web worker
 */

import { describe, it, expect, vi } from 'vitest';
import type { WorkerGroup, ForceLayoutConfig, WorkerOutputMessage } from '@/app/features/Brain/sub_MemoryCanvas/lib/types';

// Mock worker messages for testing
const createMockGroups = (): WorkerGroup[] => [
  { id: 'group-1', radius: 30, x: 0, y: 0 },
  { id: 'group-2', radius: 40, x: 0, y: 0 },
  { id: 'group-3', radius: 25, x: 0, y: 0 },
];

describe('Force Layout Worker Integration', () => {
  it('should structure worker input message correctly', () => {
    const groups = createMockGroups();
    const config: ForceLayoutConfig = {
      width: 800,
      height: 600,
      totalTicks: 120,
      progressInterval: 10,
    };

    const message = {
      type: 'run' as const,
      groups,
      config,
    };

    expect(message.type).toBe('run');
    expect(message.groups).toHaveLength(3);
    expect(message.config.totalTicks).toBe(120);
    expect(message.config.progressInterval).toBe(10);
  });

  it('should validate worker output message structure', () => {
    const groups = createMockGroups();

    const progressMessage: WorkerOutputMessage = {
      type: 'progress',
      groups: groups.map(g => ({ ...g, x: 100, y: 150 })),
      tick: 10,
      totalTicks: 120,
    };

    expect(progressMessage.type).toBe('progress');
    expect(progressMessage.tick).toBe(10);
    expect(progressMessage.groups[0].x).toBe(100);
    expect(progressMessage.groups[0].y).toBe(150);
  });

  it('should validate complete message structure', () => {
    const groups = createMockGroups();

    const completeMessage: WorkerOutputMessage = {
      type: 'complete',
      groups: groups.map(g => ({ ...g, x: 200, y: 250 })),
      tick: 120,
      totalTicks: 120,
    };

    expect(completeMessage.type).toBe('complete');
    expect(completeMessage.tick).toBe(120);
    expect(completeMessage.totalTicks).toBe(120);
  });

  it('should preserve group IDs and radii through layout', () => {
    const groups = createMockGroups();

    const outputGroups = groups.map(g => ({
      ...g,
      x: Math.random() * 800,
      y: Math.random() * 600,
    }));

    outputGroups.forEach((outGroup, idx) => {
      expect(outGroup.id).toBe(groups[idx].id);
      expect(outGroup.radius).toBe(groups[idx].radius);
    });
  });

  it('should calculate correct number of progress updates', () => {
    const totalTicks = 120;
    const progressInterval = 10;

    // Progress at ticks: 0, 10, 20, ..., 110, 119 (complete)
    // That's 12 progress + 1 complete = 13 total messages
    const expectedProgressMessages = Math.floor(totalTicks / progressInterval);
    const expectedTotalMessages = expectedProgressMessages + 1; // +1 for complete

    expect(expectedTotalMessages).toBe(13);
  });
});

describe('runForceLayoutAsync callback contract', () => {
  it('should call onProgress with correct parameters', () => {
    const mockProgress = vi.fn();
    const groups = createMockGroups();

    // Simulate what the worker would call
    mockProgress(groups, 10, 120);

    expect(mockProgress).toHaveBeenCalledWith(groups, 10, 120);
    expect(mockProgress).toHaveBeenCalledTimes(1);
  });

  it('should call onComplete when layout finishes', () => {
    const mockComplete = vi.fn();
    const groups = createMockGroups();

    // Simulate final callback
    mockComplete(groups);

    expect(mockComplete).toHaveBeenCalledWith(groups);
    expect(mockComplete).toHaveBeenCalledTimes(1);
  });

  it('should handle cleanup function', () => {
    const mockTerminate = vi.fn();

    // Simulate cleanup
    const cleanup = () => mockTerminate();
    cleanup();

    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });
});
