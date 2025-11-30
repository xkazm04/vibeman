import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DbRefactoringPatternWithAuthor,
  DbMarketplaceUser,
  DbUserBadgeWithDetails,
  PatternCategory,
  PatternScope,
} from '@/app/db/models/marketplace.types';

// =============================================================================
// TYPES
// =============================================================================

export interface MarketplaceFilters {
  category: PatternCategory | 'all';
  scope: PatternScope | 'all';
  language: string | null;
  framework: string | null;
  search: string;
  sortBy: 'rating' | 'downloads' | 'recent';
}

export interface PatternFormData {
  name: string;
  title: string;
  description: string;
  detailed_description: string;
  problem_statement: string;
  solution_approach: string;
  category: PatternCategory;
  scope: PatternScope;
  tags: string[];
  language: string;
  framework: string;
  min_version: string;
  detection_rules: object[];
  transformation_rules: object[];
  example_before: string;
  example_after: string;
  estimated_effort: 'low' | 'medium' | 'high';
  risk_level: 'low' | 'medium' | 'high';
  requires_review: boolean;
  automated: boolean;
}

export type MarketplaceView = 'browse' | 'my-patterns' | 'favorites' | 'collections' | 'create' | 'detail';

interface MarketplaceState {
  // View state
  currentView: MarketplaceView;
  selectedPatternId: string | null;
  isModalOpen: boolean;

  // Data
  patterns: DbRefactoringPatternWithAuthor[];
  featuredPatterns: DbRefactoringPatternWithAuthor[];
  myPatterns: DbRefactoringPatternWithAuthor[];
  favoritePatterns: DbRefactoringPatternWithAuthor[];
  currentUser: DbMarketplaceUser | null;
  userBadges: DbUserBadgeWithDetails[];

  // Loading states
  isLoadingPatterns: boolean;
  isLoadingUser: boolean;
  isPublishing: boolean;

  // Filters
  filters: MarketplaceFilters;

  // Pagination
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number;

  // Form state (for create/edit)
  formData: Partial<PatternFormData>;
  formErrors: Record<string, string>;

  // Error state
  error: string | null;

  // Actions
  setCurrentView: (view: MarketplaceView) => void;
  setSelectedPattern: (patternId: string | null) => void;
  openModal: () => void;
  closeModal: () => void;

  // Data fetching
  fetchPatterns: () => Promise<void>;
  fetchFeaturedPatterns: () => Promise<void>;
  fetchMyPatterns: () => Promise<void>;
  fetchFavoritePatterns: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  fetchUserBadges: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Filter actions
  setFilter: (key: keyof MarketplaceFilters, value: string | PatternCategory | PatternScope | 'all' | null) => void;
  resetFilters: () => void;

  // Pattern actions
  createPattern: (data: PatternFormData) => Promise<DbRefactoringPatternWithAuthor | null>;
  updatePattern: (id: string, data: Partial<PatternFormData>) => Promise<DbRefactoringPatternWithAuthor | null>;
  publishPattern: (id: string) => Promise<boolean>;
  deletePattern: (id: string) => Promise<boolean>;

  // Rating actions
  ratePattern: (patternId: string, rating: number, review?: string) => Promise<boolean>;

  // Favorite actions
  toggleFavorite: (patternId: string) => Promise<boolean>;
  isFavorite: (patternId: string) => boolean;

  // Form actions
  setFormData: (data: Partial<PatternFormData>) => void;
  clearFormData: () => void;
  validateForm: () => boolean;

  // Utility actions
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const defaultFilters: MarketplaceFilters = {
  category: 'all',
  scope: 'all',
  language: null,
  framework: null,
  search: '',
  sortBy: 'rating',
};

const defaultFormData: Partial<PatternFormData> = {
  name: '',
  title: '',
  description: '',
  detailed_description: '',
  problem_statement: '',
  solution_approach: '',
  category: 'cleanup',
  scope: 'file',
  tags: [],
  language: '',
  framework: '',
  min_version: '',
  detection_rules: [],
  transformation_rules: [],
  example_before: '',
  example_after: '',
  estimated_effort: 'medium',
  risk_level: 'low',
  requires_review: true,
  automated: false,
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'browse',
      selectedPatternId: null,
      isModalOpen: false,

      patterns: [],
      featuredPatterns: [],
      myPatterns: [],
      favoritePatterns: [],
      currentUser: null,
      userBadges: [],

      isLoadingPatterns: false,
      isLoadingUser: false,
      isPublishing: false,

      filters: defaultFilters,

      offset: 0,
      limit: 20,
      hasMore: false,
      total: 0,

      formData: defaultFormData,
      formErrors: {},

      error: null,

      // View actions
      setCurrentView: (view) => set({ currentView: view, selectedPatternId: null }),

      setSelectedPattern: (patternId) => set({
        selectedPatternId: patternId,
        currentView: patternId ? 'detail' : get().currentView,
      }),

      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),

      // Data fetching
      fetchPatterns: async () => {
        const { filters, limit } = get();
        set({ isLoadingPatterns: true, error: null, offset: 0 });

        try {
          const params = new URLSearchParams();
          if (filters.category !== 'all') params.set('category', filters.category);
          if (filters.scope !== 'all') params.set('scope', filters.scope);
          if (filters.language) params.set('language', filters.language);
          if (filters.framework) params.set('framework', filters.framework);
          if (filters.search) params.set('search', filters.search);
          params.set('sortBy', filters.sortBy);
          params.set('limit', String(limit));
          params.set('offset', '0');

          const response = await fetch(`/api/marketplace/patterns?${params}`);
          if (!response.ok) throw new Error('Failed to fetch patterns');

          const data = await response.json();
          set({
            patterns: data.patterns,
            total: data.total,
            hasMore: data.patterns.length === limit,
            isLoadingPatterns: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingPatterns: false,
          });
        }
      },

      fetchFeaturedPatterns: async () => {
        try {
          const response = await fetch('/api/marketplace/patterns?featured=true&limit=6');
          if (!response.ok) throw new Error('Failed to fetch featured patterns');

          const data = await response.json();
          set({ featuredPatterns: data.patterns });
        } catch (error) {
          console.error('Error fetching featured patterns:', error);
        }
      },

      fetchMyPatterns: async () => {
        set({ isLoadingPatterns: true, error: null });

        try {
          const userResponse = await fetch('/api/marketplace/user');
          if (!userResponse.ok) throw new Error('Failed to fetch user');

          const userData = await userResponse.json();

          // Fetch patterns by author (we'll need to filter client-side for now)
          const response = await fetch('/api/marketplace/patterns?limit=100');
          if (!response.ok) throw new Error('Failed to fetch patterns');

          const data = await response.json();
          const myPatterns = data.patterns.filter(
            (p: DbRefactoringPatternWithAuthor) => p.author_id === userData.user.id
          );

          set({ myPatterns, isLoadingPatterns: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingPatterns: false,
          });
        }
      },

      fetchFavoritePatterns: async () => {
        set({ isLoadingPatterns: true, error: null });

        try {
          const response = await fetch('/api/marketplace/favorites');
          if (!response.ok) throw new Error('Failed to fetch favorites');

          const data = await response.json();
          set({ favoritePatterns: data.patterns, isLoadingPatterns: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingPatterns: false,
          });
        }
      },

      fetchCurrentUser: async () => {
        set({ isLoadingUser: true });

        try {
          const response = await fetch('/api/marketplace/user');
          if (!response.ok) throw new Error('Failed to fetch user');

          const data = await response.json();
          set({ currentUser: data.user, isLoadingUser: false });
        } catch (error) {
          set({ isLoadingUser: false });
          console.error('Error fetching current user:', error);
        }
      },

      fetchUserBadges: async () => {
        try {
          const response = await fetch('/api/marketplace/badges');
          if (!response.ok) throw new Error('Failed to fetch badges');

          const data = await response.json();
          set({ userBadges: data.badges });
        } catch (error) {
          console.error('Error fetching badges:', error);
        }
      },

      loadMore: async () => {
        const { filters, limit, offset, patterns, hasMore } = get();
        if (!hasMore) return;

        const newOffset = offset + limit;
        set({ isLoadingPatterns: true });

        try {
          const params = new URLSearchParams();
          if (filters.category !== 'all') params.set('category', filters.category);
          if (filters.scope !== 'all') params.set('scope', filters.scope);
          if (filters.language) params.set('language', filters.language);
          if (filters.framework) params.set('framework', filters.framework);
          if (filters.search) params.set('search', filters.search);
          params.set('sortBy', filters.sortBy);
          params.set('limit', String(limit));
          params.set('offset', String(newOffset));

          const response = await fetch(`/api/marketplace/patterns?${params}`);
          if (!response.ok) throw new Error('Failed to load more patterns');

          const data = await response.json();
          set({
            patterns: [...patterns, ...data.patterns],
            offset: newOffset,
            hasMore: data.patterns.length === limit,
            isLoadingPatterns: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoadingPatterns: false,
          });
        }
      },

      // Filter actions
      setFilter: (key, value) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        }));
        // Refetch patterns when filter changes
        get().fetchPatterns();
      },

      resetFilters: () => {
        set({ filters: defaultFilters });
        get().fetchPatterns();
      },

      // Pattern actions
      createPattern: async (data) => {
        set({ isPublishing: true, error: null });

        try {
          const response = await fetch('/api/marketplace/patterns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create pattern');
          }

          const result = await response.json();
          set({ isPublishing: false });

          // Refresh my patterns list
          get().fetchMyPatterns();

          return result.pattern;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isPublishing: false,
          });
          return null;
        }
      },

      updatePattern: async (id, data) => {
        set({ isPublishing: true, error: null });

        try {
          const response = await fetch(`/api/marketplace/patterns/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update pattern');
          }

          const result = await response.json();
          set({ isPublishing: false });

          // Refresh patterns
          get().fetchPatterns();
          get().fetchMyPatterns();

          return result.pattern;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isPublishing: false,
          });
          return null;
        }
      },

      publishPattern: async (id) => {
        set({ isPublishing: true, error: null });

        try {
          const response = await fetch(`/api/marketplace/patterns/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'published' }),
          });

          if (!response.ok) throw new Error('Failed to publish pattern');

          set({ isPublishing: false });
          get().fetchMyPatterns();

          return true;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isPublishing: false,
          });
          return false;
        }
      },

      deletePattern: async (id) => {
        try {
          const response = await fetch(`/api/marketplace/patterns/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('Failed to delete pattern');

          get().fetchMyPatterns();
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error' });
          return false;
        }
      },

      // Rating actions
      ratePattern: async (patternId, rating, review) => {
        try {
          const response = await fetch('/api/marketplace/ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pattern_id: patternId, rating, review }),
          });

          if (!response.ok) throw new Error('Failed to rate pattern');

          get().fetchPatterns();
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error' });
          return false;
        }
      },

      // Favorite actions
      toggleFavorite: async (patternId) => {
        const { favoritePatterns } = get();
        const isFav = favoritePatterns.some((p) => p.id === patternId);

        try {
          const response = await fetch('/api/marketplace/favorites', {
            method: isFav ? 'DELETE' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pattern_id: patternId }),
          });

          if (!response.ok) throw new Error('Failed to toggle favorite');

          get().fetchFavoritePatterns();
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Unknown error' });
          return false;
        }
      },

      isFavorite: (patternId) => {
        const { favoritePatterns } = get();
        return favoritePatterns.some((p) => p.id === patternId);
      },

      // Form actions
      setFormData: (data) => {
        set((state) => ({
          formData: { ...state.formData, ...data },
        }));
      },

      clearFormData: () => {
        set({ formData: defaultFormData, formErrors: {} });
      },

      validateForm: () => {
        const { formData } = get();
        const errors: Record<string, string> = {};

        if (!formData.name?.trim()) errors.name = 'Name is required';
        if (!formData.title?.trim()) errors.title = 'Title is required';
        if (!formData.description?.trim()) errors.description = 'Description is required';
        if (!formData.problem_statement?.trim()) errors.problem_statement = 'Problem statement is required';
        if (!formData.solution_approach?.trim()) errors.solution_approach = 'Solution approach is required';

        set({ formErrors: errors });
        return Object.keys(errors).length === 0;
      },

      // Utility actions
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      reset: () => set({
        currentView: 'browse',
        selectedPatternId: null,
        isModalOpen: false,
        patterns: [],
        featuredPatterns: [],
        myPatterns: [],
        favoritePatterns: [],
        filters: defaultFilters,
        offset: 0,
        hasMore: false,
        total: 0,
        formData: defaultFormData,
        formErrors: {},
        error: null,
      }),
    }),
    {
      name: 'marketplace-storage',
      partialize: (state) => ({
        filters: state.filters,
        currentView: state.currentView,
      }),
    }
  )
);
