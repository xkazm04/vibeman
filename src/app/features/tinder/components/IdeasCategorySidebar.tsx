'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import IdeasLoadingState from '@/app/features/Ideas/components/IdeasLoadingState';
import { IDEA_CATEGORIES, IdeaCategory, isStandardCategory } from '@/types/ideaCategory';

// Category display configuration
const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  functionality: { label: 'Functionality', emoji: '⚡', color: 'purple' },
  performance: { label: 'Performance', emoji: '📊', color: 'green' },
  maintenance: { label: 'Maintenance', emoji: '🔧', color: 'orange' },
  ui: { label: 'UI/UX', emoji: '🎨', color: 'pink' },
  code_quality: { label: 'Code Quality', emoji: '💻', color: 'blue' },
  user_benefit: { label: 'User Benefit', emoji: '❤️', color: 'red' },
};

// Default config for unknown categories
const DEFAULT_CONFIG = { label: 'Other', emoji: '📌', color: 'gray' };

interface IdeasCategorySidebarProps {
  categories: Array<{ category: string; count: number }>;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function IdeasCategorySidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  loading = false,
  disabled = false,
}: IdeasCategorySidebarProps) {
  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);

  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category] || { ...DEFAULT_CONFIG, label: category.replace(/_/g, ' ') };
  };

  const getColorClasses = (color: string, isActive: boolean) => {
    const colorMap: Record<string, { active: string; inactive: string }> = {
      purple: {
        active: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/20',
        inactive: 'hover:bg-purple-500/10 hover:border-purple-500/20',
      },
      green: {
        active: 'bg-green-500/20 text-green-300 border-green-500/40 shadow-green-500/20',
        inactive: 'hover:bg-green-500/10 hover:border-green-500/20',
      },
      orange: {
        active: 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-orange-500/20',
        inactive: 'hover:bg-orange-500/10 hover:border-orange-500/20',
      },
      pink: {
        active: 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-pink-500/20',
        inactive: 'hover:bg-pink-500/10 hover:border-pink-500/20',
      },
      blue: {
        active: 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-blue-500/20',
        inactive: 'hover:bg-blue-500/10 hover:border-blue-500/20',
      },
      red: {
        active: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/20',
        inactive: 'hover:bg-red-500/10 hover:border-red-500/20',
      },
      gray: {
        active: 'bg-gray-500/20 text-gray-300 border-gray-500/40 shadow-gray-500/20',
        inactive: 'hover:bg-gray-500/10 hover:border-gray-500/20',
      },
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="w-56 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-700/40">
        <Filter className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-semibold text-gray-200">Filter by Type</span>
      </div>

      {/* Loading State */}
      {loading ? (
        <IdeasLoadingState size="sm" />
      ) : (
        <>
          {/* All Ideas Button */}
          <motion.button
            onClick={() => onCategoryChange(null)}
            disabled={disabled}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-lg
              text-sm font-medium transition-all duration-200 border
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${selectedCategory === null
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-md shadow-purple-500/20'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-700/30 hover:border-gray-600/40'
              }
            `}
            whileHover={disabled ? {} : { scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.98 }}
          >
            <span className="flex items-center gap-2">
              <span>🌟</span>
              <span>All Ideas</span>
            </span>
            <span className={`
              px-2 py-0.5 text-xs font-semibold rounded-full
              ${selectedCategory === null ? 'bg-purple-500/30 text-purple-200' : 'bg-gray-700 text-gray-400'}
            `}>
              {totalCount}
            </span>
          </motion.button>

          {/* Separator */}
          <div className="h-px bg-gray-700/40" />

          {/* Category Buttons */}
          <div className="space-y-1.5">
            {categories.map(({ category, count }) => {
              const config = getCategoryConfig(category);
              const colorClasses = getColorClasses(config.color, selectedCategory === category);
              const isActive = selectedCategory === category;

              return (
                <motion.button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  disabled={disabled || count === 0}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg
                    text-sm font-medium transition-all duration-200 border
                    ${disabled || count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isActive
                      ? colorClasses.active + ' shadow-md'
                      : 'text-gray-400 border-transparent ' + colorClasses.inactive
                    }
                  `}
                  whileHover={disabled || count === 0 ? {} : { scale: 1.02 }}
                  whileTap={disabled || count === 0 ? {} : { scale: 0.98 }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>{config.emoji}</span>
                    <span className="truncate capitalize">{config.label}</span>
                  </span>
                  <span className={`
                    px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0
                    ${isActive ? `bg-${config.color}-500/30` : 'bg-gray-700'} text-gray-300
                  `}>
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Empty State */}
          {categories.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500">
              No ideas to filter
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
