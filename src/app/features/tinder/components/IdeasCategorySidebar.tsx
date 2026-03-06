'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import IdeasLoadingState from '@/app/features/Ideas/components/IdeasLoadingState';
import { getCategoryConfig } from '@/app/features/Ideas/lib/ideaConfig';

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

  const getConfig = (category: string) => {
    const cfg = getCategoryConfig(category);
    // For non-standard categories, use the raw string as label
    const label = cfg.label === 'Other' ? category.replace(/_/g, ' ') : cfg.label;
    return { ...cfg, label };
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
              const config = getConfig(category);
              const { accent } = config;
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
                      ? accent.active + ' shadow-md'
                      : 'text-gray-400 border-transparent ' + accent.inactive
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
                    ${isActive ? accent.badgeBg : 'bg-gray-700'} text-gray-300
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
