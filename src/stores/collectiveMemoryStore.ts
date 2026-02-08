/**
 * Collective Memory Store
 * Zustand store for cross-session collective memory UI state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  DbCollectiveMemoryEntry,
  CollectiveMemoryType,
} from '@/app/db/models/collective-memory.types';

// ============================================================================
// TYPES
// ============================================================================

export interface MemoryStats {
  total: number;
  byType: Record<string, number>;
  avgEffectiveness: number;
  recentCount: number;
  recentApplications: {
    pending: number;
    success: number;
    failure: number;
  };
}

export interface EffectivenessTrend {
  date: string;
  score: number;
  memoryCount: number;
}

interface CollectiveMemoryState {
  // Data
  memories: DbCollectiveMemoryEntry[];
  stats: MemoryStats | null;
  trends: EffectivenessTrend[];
  selectedMemoryId: string | null;

  // Filters
  activeTypeFilter: CollectiveMemoryType | null;
  searchQuery: string;

  // Loading
  isLoading: boolean;
  isLoadingStats: boolean;
  error: string | null;
}

interface CollectiveMemoryActions {
  fetchMemories: (projectId: string) => Promise<void>;
  fetchStats: (projectId: string) => Promise<void>;
  fetchTrends: (projectId: string) => Promise<void>;
  setTypeFilter: (type: CollectiveMemoryType | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedMemory: (id: string | null) => void;
  deleteMemory: (projectId: string, memoryId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

type CollectiveMemoryStore = CollectiveMemoryState & CollectiveMemoryActions;

const initialState: CollectiveMemoryState = {
  memories: [],
  stats: null,
  trends: [],
  selectedMemoryId: null,
  activeTypeFilter: null,
  searchQuery: '',
  isLoading: false,
  isLoadingStats: false,
  error: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useCollectiveMemoryStore = create<CollectiveMemoryStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      fetchMemories: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { activeTypeFilter, searchQuery } = get();
          const params = new URLSearchParams({ projectId, limit: '100' });
          if (activeTypeFilter) params.set('type', activeTypeFilter);

          let url = `/api/collective-memory?${params}`;
          if (searchQuery) {
            url = `/api/collective-memory?${params}&action=relevant&requirementName=${encodeURIComponent(searchQuery)}`;
          }

          const res = await fetch(url);
          const data = await res.json();

          if (data.success) {
            set({ memories: data.memories || [], isLoading: false });
          } else {
            set({ error: data.error || 'Failed to fetch memories', isLoading: false });
          }
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Fetch failed', isLoading: false });
        }
      },

      fetchStats: async (projectId: string) => {
        set({ isLoadingStats: true });
        try {
          const res = await fetch(`/api/collective-memory?projectId=${projectId}&action=stats`);
          const data = await res.json();
          if (data.success) {
            set({ stats: data.stats, isLoadingStats: false });
          } else {
            set({ isLoadingStats: false });
          }
        } catch {
          set({ isLoadingStats: false });
        }
      },

      fetchTrends: async (projectId: string) => {
        try {
          const res = await fetch(`/api/collective-memory?projectId=${projectId}&action=trends`);
          const data = await res.json();
          if (data.success) {
            set({ trends: data.trends || [] });
          }
        } catch {
          // Non-critical, silently fail
        }
      },

      setTypeFilter: (type) => set({ activeTypeFilter: type }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedMemory: (id) => set({ selectedMemoryId: id }),

      deleteMemory: async (projectId: string, memoryId: string) => {
        try {
          const res = await fetch('/api/collective-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', memoryId }),
          });
          const data = await res.json();
          if (data.success) {
            set(state => ({
              memories: state.memories.filter(m => m.id !== memoryId),
              selectedMemoryId: state.selectedMemoryId === memoryId ? null : state.selectedMemoryId,
            }));
            // Refresh stats
            get().fetchStats(projectId);
          }
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'Delete failed' });
        }
      },

      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    }),
    { name: 'collective-memory-store' }
  )
);
