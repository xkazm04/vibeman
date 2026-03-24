// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCanvasData } from '@/app/features/Brain/sub_MemoryCanvas/lib/useCanvasData';
import { CanvasStore } from '@/app/features/Brain/sub_MemoryCanvas/lib/canvasStore';

// Mock dependencies
vi.mock('@/stores/clientProjectStore', () => ({
  useClientProjectStore: vi.fn((selector) =>
    selector({ activeProject: { id: 'test-project-1', name: 'Test', path: '/test' } })
  ),
}));

vi.mock('@/hooks/usePolling', () => ({
  usePolling: vi.fn(),
}));

global.fetch = vi.fn();

describe('useCanvasData polling integration', () => {
  let mockStore: CanvasStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = {
      setEvents: vi.fn(),
      getState: vi.fn(),
      subscribe: vi.fn(),
    } as any;

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        signals: [],
      }),
    });
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() =>
      useCanvasData({
        store: mockStore,
        getFocusedGroupId: () => null,
        enabled: true,
      })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should call fetch on mount when enabled', async () => {
    renderHook(() =>
      useCanvasData({
        store: mockStore,
        getFocusedGroupId: () => null,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/brain/signals?projectId=test-project-1')
      );
    });
  });

  it('should not fetch when disabled', () => {
    renderHook(() =>
      useCanvasData({
        store: mockStore,
        getFocusedGroupId: () => null,
        enabled: false,
      })
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should provide refresh function', () => {
    const { result } = renderHook(() =>
      useCanvasData({
        store: mockStore,
        getFocusedGroupId: () => null,
        enabled: true,
      })
    );

    expect(typeof result.current.refresh).toBe('function');
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useCanvasData({
        store: mockStore,
        getFocusedGroupId: () => null,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear events when no active project', () => {
    const { useClientProjectStore } = require('@/stores/clientProjectStore');
    useClientProjectStore.mockImplementation((selector: any) =>
      selector({ activeProject: null })
    );

    renderHook(() =>
      useCanvasData({
        store: mockStore,
        getFocusedGroupId: () => null,
        enabled: true,
      })
    );

    expect(mockStore.setEvents).toHaveBeenCalledWith([], null);
  });
});
