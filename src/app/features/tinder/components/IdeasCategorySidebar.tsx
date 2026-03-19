'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { transition } from '@/lib/motion';
import { Filter, ScanSearch } from 'lucide-react';
import IdeasLoadingState from '@/app/features/Ideas/components/IdeasLoadingState';
import { getCategoryConfig } from '@/app/features/Ideas/lib/ideaConfig';
import type { FilterDimension, ScanTypeCount } from '../lib/tinderTypes';

interface IdeasCategorySidebarProps {
  categories: Array<{ category: string; count: number }>;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  loading?: boolean;
  disabled?: boolean;
  // Scan type filter support
  filterDimension: FilterDimension;
  onFilterDimensionChange: (dimension: FilterDimension) => void;
  scanTypes: ScanTypeCount[];
  selectedScanType: string | null;
  onScanTypeChange: (scanType: string | null) => void;
  scanTypesLoading?: boolean;
}

const SCAN_TYPE_ICONS: Record<string, string> = {
  overall: '🔍',
  brand_artist: '🎨',
  targeted: '🎯',
  context: '📁',
  goal: '🏆',
};

export default function IdeasCategorySidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  loading = false,
  disabled = false,
  filterDimension,
  onFilterDimensionChange,
  scanTypes,
  selectedScanType,
  onScanTypeChange,
  scanTypesLoading = false,
}: IdeasCategorySidebarProps) {
  const totalCategoryCount = categories.reduce((sum, cat) => sum + cat.count, 0);
  const totalScanTypeCount = scanTypes.reduce((sum, st) => sum + st.count, 0);

  const getConfig = (category: string) => {
    const cfg = getCategoryConfig(category);
    const label = cfg.label === 'Other' ? category.replace(/_/g, ' ') : cfg.label;
    return { ...cfg, label };
  };

  const isCategory = filterDimension === 'category';
  const isScanType = filterDimension === 'scan_type';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={transition.normal}
      className="w-56 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3"
    >
      {/* Dimension Switcher */}
      <div className="flex items-center gap-1 p-0.5 bg-gray-900/50 rounded-lg border border-gray-700/40">
        <button
          onClick={() => onFilterDimensionChange('category')}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md
            text-xs font-medium transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isCategory
              ? 'bg-purple-500/20 text-purple-300 shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
            }
          `}
        >
          <Filter className="w-3 h-3" />
          <span>Type</span>
        </button>
        <button
          onClick={() => onFilterDimensionChange('scan_type')}
          disabled={disabled}
          className={`
            flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md
            text-xs font-medium transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isScanType
              ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
            }
          `}
        >
          <ScanSearch className="w-3 h-3" />
          <span>Scan</span>
        </button>
      </div>

      {/* Category Mode */}
      {isCategory && (
        <>
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
                  {totalCategoryCount}
                </span>
              </motion.button>

              <div className="h-px bg-gray-700/40" />

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

              {categories.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  No ideas to filter
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Scan Type Mode */}
      {isScanType && (
        <>
          {scanTypesLoading ? (
            <IdeasLoadingState size="sm" />
          ) : (
            <>
              {/* All Scan Types Button */}
              <motion.button
                onClick={() => onScanTypeChange(null)}
                disabled={disabled}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg
                  text-sm font-medium transition-all duration-200 border
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${selectedScanType === null
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-md shadow-cyan-500/20'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-700/30 hover:border-gray-600/40'
                  }
                `}
                whileHover={disabled ? {} : { scale: 1.02 }}
                whileTap={disabled ? {} : { scale: 0.98 }}
              >
                <span className="flex items-center gap-2">
                  <span>🌟</span>
                  <span>All Scans</span>
                </span>
                <span className={`
                  px-2 py-0.5 text-xs font-semibold rounded-full
                  ${selectedScanType === null ? 'bg-cyan-500/30 text-cyan-200' : 'bg-gray-700 text-gray-400'}
                `}>
                  {totalScanTypeCount}
                </span>
              </motion.button>

              <div className="h-px bg-gray-700/40" />

              <div className="space-y-1.5">
                {scanTypes.map(({ scan_type, count }) => {
                  const isActive = selectedScanType === scan_type;
                  const icon = SCAN_TYPE_ICONS[scan_type] || '📋';
                  const label = scan_type.replace(/_/g, ' ');

                  return (
                    <motion.button
                      key={scan_type}
                      onClick={() => onScanTypeChange(scan_type)}
                      disabled={disabled || count === 0}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-lg
                        text-sm font-medium transition-all duration-200 border
                        ${disabled || count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-md shadow-cyan-500/20'
                          : 'text-gray-400 border-transparent hover:bg-cyan-500/10 hover:border-cyan-500/20'
                        }
                      `}
                      whileHover={disabled || count === 0 ? {} : { scale: 1.02 }}
                      whileTap={disabled || count === 0 ? {} : { scale: 0.98 }}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span>{icon}</span>
                        <span className="truncate capitalize">{label}</span>
                      </span>
                      <span className={`
                        px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0
                        ${isActive ? 'bg-cyan-500/30' : 'bg-gray-700'} text-gray-300
                      `}>
                        {count}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {scanTypes.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  No scan types found
                </div>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  );
}
