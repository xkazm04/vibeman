'use client';

import { useEffect } from 'react';
import { Heart, Loader2, Search } from 'lucide-react';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import PatternCard from './PatternCard';

export default function FavoritesView() {
  const {
    favoritePatterns,
    isLoadingPatterns,
    fetchFavoritePatterns,
    setCurrentView,
  } = useMarketplaceStore();

  useEffect(() => {
    fetchFavoritePatterns();
  }, [fetchFavoritePatterns]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-400" />
          Favorites
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Patterns you've saved for later
        </p>
      </div>

      {/* Loading State */}
      {isLoadingPatterns && favoritePatterns.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-gray-400">Loading favorites...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingPatterns && favoritePatterns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Heart className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No favorites yet</h3>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            Browse patterns and click the heart icon to save them here for quick access.
          </p>
          <button
            onClick={() => setCurrentView('browse')}
            className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors flex items-center gap-2"
            data-testid="favorites-browse-btn"
          >
            <Search className="w-5 h-5" />
            Browse Patterns
          </button>
        </div>
      )}

      {/* Favorites Grid */}
      {favoritePatterns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoritePatterns.map((pattern) => (
            <PatternCard key={pattern.id} pattern={pattern} />
          ))}
        </div>
      )}
    </div>
  );
}
