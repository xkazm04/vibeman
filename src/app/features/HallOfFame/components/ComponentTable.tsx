'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Star, Zap } from 'lucide-react';
import type { CategoryId } from '../lib/types';
import { getComponentsByCategory, getCategoryById } from '../lib/showcaseRegistry';

interface ComponentTableProps {
  categoryId: CategoryId;
  onComponentClick: (componentId: string) => void;
  starredIds: Set<string>;
  onToggleStar: (componentId: string, e: React.MouseEvent) => void;
}

const CATEGORY_ACCENT_COLORS: Record<string, string> = {
  'core-ui': 'text-cyan-400 bg-cyan-500/10',
  'data-display': 'text-purple-400 bg-purple-500/10',
  'overlays': 'text-amber-400 bg-amber-500/10',
  'advanced': 'text-emerald-400 bg-emerald-500/10',
};

const CATEGORY_HOVER_COLORS: Record<string, string> = {
  'core-ui': 'hover:bg-cyan-500/5 hover:border-cyan-500/30',
  'data-display': 'hover:bg-purple-500/5 hover:border-purple-500/30',
  'overlays': 'hover:bg-amber-500/5 hover:border-amber-500/30',
  'advanced': 'hover:bg-emerald-500/5 hover:border-emerald-500/30',
};

export function ComponentTable({ categoryId, onComponentClick, starredIds, onToggleStar }: ComponentTableProps) {
  const components = getComponentsByCategory(categoryId);
  const category = getCategoryById(categoryId);

  // Sort by name ascending
  const sortedComponents = useMemo(() => {
    return [...components].sort((a, b) => a.name.localeCompare(b.name));
  }, [components]);

  const accentColor = CATEGORY_ACCENT_COLORS[categoryId] || 'text-gray-400 bg-gray-500/10';
  const hoverColor = CATEGORY_HOVER_COLORS[categoryId] || 'hover:bg-gray-500/5';

  if (sortedComponents.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 bg-gray-900/30 rounded-lg border border-gray-800/50">
        No components in this category yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800/50 bg-gray-900/30">
      {/* Table Header */}
      <div className="grid grid-cols-[auto_1fr_2fr_auto_auto] gap-4 px-4 py-2.5 bg-gray-800/40 border-b border-gray-800/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="w-10 text-center">Star</div>
        <div>Name</div>
        <div>Description</div>
        <div className="text-center">Variants</div>
        <div className="w-8"></div>
      </div>

      {/* Table Body */}
      <AnimatePresence mode="popLayout">
        {sortedComponents.map((component, index) => {
          const isStarred = starredIds.has(component.id);
          return (
            <motion.div
              key={component.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: index * 0.02, duration: 0.2 }}
              onClick={() => onComponentClick(component.id)}
              className={`
                w-full grid grid-cols-[auto_1fr_2fr_auto_auto] gap-4 px-4 py-3
                text-left border-b border-gray-800/30 last:border-b-0
                transition-all duration-150 group cursor-pointer
                ${hoverColor}
              `}
            >
              {/* Star Toggle */}
              <div className="flex items-center justify-center w-10">
                <button
                  onClick={(e) => onToggleStar(component.id, e)}
                  className={`
                    p-1.5 rounded-md transition-all duration-200
                    ${isStarred
                      ? 'text-amber-400 hover:bg-amber-500/20'
                      : 'text-gray-600 hover:text-amber-400 hover:bg-gray-800'
                    }
                  `}
                  title={isStarred ? 'Remove from featured' : 'Add to featured'}
                >
                  <Star
                    className={`w-4 h-4 transition-all ${isStarred ? 'fill-amber-400' : ''}`}
                  />
                </button>
              </div>

              {/* Name */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
                  {component.name}
                </span>
              </div>

              {/* Description */}
              <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors truncate">
                {component.description}
              </div>

              {/* Variants Badge */}
              <div className="flex items-center justify-center">
                {component.variantCount && component.variantCount > 1 ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${accentColor}`}>
                    <Zap className="w-3 h-3" />
                    {component.variantCount}
                  </span>
                ) : (
                  <span className="text-xs text-gray-600">-</span>
                )}
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center w-8">
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-800/20 border-t border-gray-800/50 text-xs text-gray-500">
        {sortedComponents.length} component{sortedComponents.length !== 1 ? 's' : ''} in {category?.name || 'this category'}
      </div>
    </div>
  );
}
