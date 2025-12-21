'use client';

import { motion } from 'framer-motion';
import { Star, Download, ArrowRight, Heart, Clock, AlertTriangle, Zap, User } from 'lucide-react';
import type { DbRefactoringPatternWithAuthor, PatternCategory } from '@/app/db/models/marketplace.types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface PatternCardProps {
  pattern: DbRefactoringPatternWithAuthor;
  compact?: boolean;
  showAuthor?: boolean;
}

const categoryColors: Record<PatternCategory, { bg: string; text: string; border: string }> = {
  migration: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  cleanup: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  security: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  performance: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  architecture: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  testing: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  modernization: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'best-practices': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
};

const effortIcons: Record<'low' | 'medium' | 'high', React.ReactNode> = {
  low: <Zap className="w-3 h-3 text-green-400" />,
  medium: <Clock className="w-3 h-3 text-yellow-400" />,
  high: <AlertTriangle className="w-3 h-3 text-red-400" />,
};

export default function PatternCard({ pattern, compact = false, showAuthor = true }: PatternCardProps) {
  const { setSelectedPattern, toggleFavorite, isFavorite } = useMarketplaceStore();
  const categoryStyle = categoryColors[pattern.category] || categoryColors.cleanup;
  const isFav = isFavorite(pattern.id);

  const handleCardClick = () => {
    setSelectedPattern(pattern.id);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(pattern.id);
  };

  // Parse tags from JSON string
  const tags: string[] = (() => {
    try {
      return JSON.parse(pattern.tags || '[]');
    } catch {
      return [];
    }
  })();

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={handleCardClick}
        className="group cursor-pointer p-4 bg-black/20 hover:bg-black/30 border border-white/5 hover:border-purple-500/30 rounded-xl transition-all"
        data-testid={`pattern-card-compact-${pattern.id}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate">{pattern.title}</h4>
            <p className="text-xs text-gray-500 truncate">{pattern.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border} border`}>
              {pattern.category}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={handleCardClick}
      className="group cursor-pointer bg-black/30 hover:bg-black/40 border border-white/5 hover:border-purple-500/30 rounded-2xl overflow-hidden transition-all shadow-lg hover:shadow-purple-500/10"
      data-testid={`pattern-card-${pattern.id}`}
    >
      {/* Header with gradient */}
      <div className={`h-2 ${categoryStyle.bg}`} />

      <div className="p-5">
        {/* Top Row: Category & Actions */}
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border} border`}>
            {pattern.category}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFavoriteClick}
              className={`p-1.5 rounded-lg transition-colors ${
                isFav
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'hover:bg-white/5 text-gray-500 hover:text-pink-400'
              }`}
              data-testid={`pattern-favorite-${pattern.id}`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors line-clamp-1">
          {pattern.title}
        </h3>
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {pattern.description}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-medium text-gray-400 bg-white/5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 text-[10px] font-medium text-gray-500">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 font-medium">
                {pattern.rating_average.toFixed(1)}
              </span>
              <span className="text-gray-600">({pattern.rating_count})</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              <span>{pattern.download_count}</span>
            </div>
            <div className="flex items-center gap-1" title={`${pattern.estimated_effort} effort`}>
              {effortIcons[pattern.estimated_effort]}
              <span className="capitalize">{pattern.estimated_effort}</span>
            </div>
          </div>
        </div>

        {/* Author */}
        {showAuthor && pattern.author_display_name && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
              <User className="w-3 h-3 text-purple-400" />
            </div>
            <span className="text-xs text-gray-400">
              by <span className="text-purple-400">{pattern.author_display_name}</span>
            </span>
            {pattern.author_reputation_score > 100 && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-yellow-500/10 text-yellow-400 rounded">
                TOP
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
