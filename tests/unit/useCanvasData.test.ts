// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCanvasData } from '@/app/features/Brain/sub_MemoryCanvas/lib/useCanvasData';
import { CanvasStore } from '@/app/features/Brain/sub_MemoryCanvas/lib/canvasStore';

// ── Mocks ──

let activeProjectValue: { id: string; name: string; path: string } | null = {
  id: 'test-project-1',
  name: 'Test',
  path: '/test',
};

vi.mock('@/stores/clientProjectStore', () => ({
  useClientProjectStore: vi.fn((selector: any) =>
    selector({ activeProject: activeProjectValue })
  ),
}));

vi.mock('@/app/features/Brain/sub_MemoryCanvas/lib/signalMapper', () => ({
  mapSignalsToEvents: vi.fn((_signals: unknown[], _max: number) => []),
}));

vi.mock('@/app/features/Brain/lib/queries/queryKeys', () => ({
  brainKeys: {
    signals: () => ['brain', 'signals'],
  },
}));

vi.mock('@/lib/cache/cache-config', () => ({
  CACHE_PRESETS: {
    brainData: { staleTime: 0 },
  },
}));

vi.mock('@/lib/brain/config', () => ({
  CANVAS_REFRESH_INTERVAL_MS: 30_000,
  MAX_CANVAS_SIGNALS: 200,
  CANVAS_WINDOW_DAYS: 14,
}));

vi.mock('@/lib/apiResponseGuard', () => ({
  safeResponseJson: vi.fn(async (res: Response) => res.json()),
  parseApiResponse: vi.fn((raw: any) => raw),
  BrainSignalsResponseSchema: {},
}));

global.fetch = vi.fn();

// ── Helpers ──

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCanvasData polling integration', () => {
  let mockStore: CanvasStore;

  beforeEach(() => {
    vi.clearAllMocks();
    activeProjectValue = { id: 'test-project-1', name: 'Test', path: '/test' };

    mockStore = {
      setEvents: vi.fn(),
      getState: vi.fn(),
      subscribe: vi.fn(),
    } as any;

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { signals: [] },
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(
      () =>
        useCanvasData({
          store: mockStore,
          getFocusedGroupId: () => null,
          enabled: true,
        }),
      { wrapper: createWrapper() }
    );

    // Initially loading (query hasn't resolved yet)
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should call fetch on mount when enabled', async () => {
    renderHook(
      () =>
        useCanvasData({
          store: mockStore,
          getFocusedGroupId: () => null,
          enabled: true,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/brain/signals')
      );
    });
  });

  it('should not fetch when disabled', async () => {
    renderHook(
      () =>
        useCanvasData({
          store: mockStore,
          getFocusedGroupId: () => null,
          enabled: false,
        }),
      { wrapper: createWrapper() }
    );

    // Give React Query a tick to potentially fire
    await new Promise(r => setTimeout(r, 50));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should provide refresh function', () => {
    const { result } = renderHook(
      () =>
        useCanvasData({
          store: mockStore,
          getFocusedGroupId: () => null,
          enabled: true,
        }),
      { wrapper: createWrapper() }
    );

    expect(typeof result.current.refresh).toBe('function');
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(
      () =>
        useCanvasData({
          store: mockStore,
          getFocusedGroupId: () => null,
          enabled: true,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear events when no active project', async () => {
    activeProjectValue = null;

    // Re-import the mock so useClientProjectStore picks up the null project
    const { useClientProjectStore } = await import('@/stores/clientProjectStore');
    (useClientProjectStore as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: any) => selector({ activeProject: null })
    );

    renderHook(
      () =>
        useCanvasData({
          store: mockStore,
          getFocusedGroupId: () => null,
          enabled: true,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockStore.setEvents).toHaveBeenCalledWith([], null);
    });
  });
});
