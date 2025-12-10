/**
 * Data Slice - Manages patterns, users, and badges data
 */

import type { StateCreator } from 'zustand';
import type { DataSlice, MarketplaceState } from './types';
import type { DbRefactoringPatternWithAuthor } from '@/app/db/models/marketplace.types';

export const createDataSlice: StateCreator<
  MarketplaceState,
  [],
  [],
  DataSlice
> = (set, get) => ({
  patterns: [],
  featuredPatterns: [],
  myPatterns: [],
  favoritePatterns: [],
  currentUser: null,
  userBadges: [],
  isLoadingPatterns: false,
  isLoadingUser: false,

  fetchPatterns: async () => {
    const { filters, limit } = get();
    set({ isLoadingPatterns: true });
    get().clearError();

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
        offset: 0,
        isLoadingPatterns: false,
      });
    } catch (error) {
      set({
        isLoadingPatterns: false,
      });
      get().setError(error instanceof Error ? error.message : 'Unknown error');
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
    set({ isLoadingPatterns: true });
    get().clearError();

    try {
      const userResponse = await fetch('/api/marketplace/user');
      if (!userResponse.ok) throw new Error('Failed to fetch user');

      const userData = await userResponse.json();

      const response = await fetch('/api/marketplace/patterns?limit=100');
      if (!response.ok) throw new Error('Failed to fetch patterns');

      const data = await response.json();
      const myPatterns = data.patterns.filter(
        (p: DbRefactoringPatternWithAuthor) => p.author_id === userData.user.id
      );

      set({ myPatterns, isLoadingPatterns: false });
    } catch (error) {
      set({ isLoadingPatterns: false });
      get().setError(error instanceof Error ? error.message : 'Unknown error');
    }
  },

  fetchFavoritePatterns: async () => {
    set({ isLoadingPatterns: true });
    get().clearError();

    try {
      const response = await fetch('/api/marketplace/favorites');
      if (!response.ok) throw new Error('Failed to fetch favorites');

      const data = await response.json();
      set({ favoritePatterns: data.patterns, isLoadingPatterns: false });
    } catch (error) {
      set({ isLoadingPatterns: false });
      get().setError(error instanceof Error ? error.message : 'Unknown error');
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
});
