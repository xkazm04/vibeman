/**
 * Favorites Slice - Manages favorite patterns
 */

import type { StateCreator } from 'zustand';
import type { FavoritesSlice, MarketplaceState } from './types';

export const createFavoritesSlice: StateCreator<
  MarketplaceState,
  [],
  [],
  FavoritesSlice
> = (set, get) => ({
  toggleFavorite: async (patternId: string): Promise<boolean> => {
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
      get().setError(error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  },

  isFavorite: (patternId: string): boolean => {
    const { favoritePatterns } = get();
    return favoritePatterns.some((p) => p.id === patternId);
  },
});
