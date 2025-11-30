'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Star, Download, ArrowRight, ChevronDown, ChevronUp, Loader2, ExternalLink } from 'lucide-react';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import type { DbRefactoringPatternWithAuthor, PatternCategory } from '@/app/db/models/marketplace.types';

interface CommunityPatternRecommendationsProps {
  categories?: PatternCategory[];
  language?: string;
  framework?: string;
  maxRecommendations?: number;
  onPatternApply?: (pattern: DbRefactoringPatternWithAuthor) => void;
}

const categoryColors: Record<PatternCategory, { bg: string; text: string }> = {
  migration: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  cleanup: { bg: 'bg-green-500/10', text: 'text-green-400' },
  security: { bg: 'bg-red-500/10', text: 'text-red-400' },
  performance: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  architecture: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  testing: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  accessibility: { bg: 'bg-pink-500/10', text: 'text-pink-400' },
  modernization: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  'best-practices': { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
};

/**
 * CommunityPatternRecommendations
 *
 * Displays community pattern recommendations in the RefactorWizard.
 * Integrates marketplace patterns alongside AI-generated refactoring suggestions.
 */
export default function CommunityPatternRecommendations({
  categories,
  language = 'typescript',
  framework = 'nextjs',
  maxRecommendations = 5,
  onPatternApply,
}: CommunityPatternRecommendationsProps) {
  const { openModal, setSelectedPattern } = useMarketplaceStore();
  const [patterns, setPatterns] = useState<DbRefactoringPatternWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (language) params.set('language', language);
        if (framework) params.set('framework', framework);
        if (categories && categories.length > 0) {
          params.set('categories', categories.join(','));
        }
        params.set('limit', String(maxRecommendations));
        params.set('sortBy', 'rating');

        const response = await fetch(`/api/marketplace/patterns/compatible?${params}`);
        if (!response.ok) throw new Error('Failed to fetch recommendations');

        const data = await response.json();
        setPatterns(data.patterns || []);
      } catch (err) {
        console.error('Error fetching community patterns:', err);
        setError('Could not load community patterns');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [categories, language, framework, maxRecommendations]);

  const handlePatternClick = (pattern: DbRefactoringPatternWithAuthor) => {
    setSelectedPattern(pattern.id);
    openModal();
  };

  const handleApplyPattern = (pattern: DbRefactoringPatternWithAuthor, e: React.MouseEvent) => {
    e.stopPropagation();
    onPatternApply?.(pattern);
  };

  if (loading) {
    return (
      <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-purple-400" />
          <span className="text-sm text-purple-400">Loading community patterns...</span>
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin ml-auto" />
        </div>
      </div>
    );
  }

  if (error || patterns.length === 0) {
    return null; // Don't show anything if no patterns available
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-950/30 to-pink-950/30 border border-purple-500/20 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        data-testid="community-patterns-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Store className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">Community Patterns</h3>
            <p className="text-xs text-gray-500">{patterns.length} recommendations from the marketplace</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Pattern List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5"
          >
            <div className="p-4 space-y-3">
              {patterns.map((pattern, index) => {
                const categoryStyle = categoryColors[pattern.category] || categoryColors.cleanup;

                return (
                  <motion.div
                    key={pattern.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handlePatternClick(pattern)}
                    className="group cursor-pointer bg-black/20 hover:bg-black/40 border border-white/5 hover:border-purple-500/30 rounded-xl p-4 transition-all"
                    data-testid={`community-pattern-${pattern.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                            {pattern.title}
                          </h4>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}>
                            {pattern.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                          {pattern.description}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-600">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span className="text-yellow-400">{pattern.rating_average.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            <span>{pattern.download_count}</span>
                          </div>
                          {pattern.author_display_name && (
                            <span className="text-purple-400/60">by {pattern.author_display_name}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onPatternApply && (
                          <button
                            onClick={(e) => handleApplyPattern(pattern, e)}
                            className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors"
                            data-testid={`apply-community-pattern-${pattern.id}`}
                          >
                            Apply
                          </button>
                        )}
                        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Browse More Link */}
              <button
                onClick={() => openModal()}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
                data-testid="browse-marketplace-link"
              >
                <ExternalLink className="w-4 h-4" />
                Browse All Patterns in Marketplace
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
