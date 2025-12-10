/**
 * Pattern Actions Slice - CRUD operations on patterns
 */

import type { StateCreator } from 'zustand';
import type { PatternActionsSlice, MarketplaceState, PatternFormData } from './types';
import type { DbRefactoringPatternWithAuthor } from '@/app/db/models/marketplace.types';

export const createPatternActionsSlice: StateCreator<
  MarketplaceState,
  [],
  [],
  PatternActionsSlice
> = (set, get) => ({
  createPattern: async (data: PatternFormData): Promise<DbRefactoringPatternWithAuthor | null> => {
    set({ isPublishing: true });
    get().clearError();

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
      set({ isPublishing: false });
      get().setError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  },

  updatePattern: async (id: string, data: Partial<PatternFormData>): Promise<DbRefactoringPatternWithAuthor | null> => {
    set({ isPublishing: true });
    get().clearError();

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
      set({ isPublishing: false });
      get().setError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  },

  publishPattern: async (id: string): Promise<boolean> => {
    set({ isPublishing: true });
    get().clearError();

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
      set({ isPublishing: false });
      get().setError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  },

  deletePattern: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/marketplace/patterns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete pattern');

      get().fetchMyPatterns();
      return true;
    } catch (error) {
      get().setError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  },

  ratePattern: async (patternId: string, rating: number, review?: string): Promise<boolean> => {
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
      get().setError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  },
});
