'use client';

import { motion } from 'framer-motion';
import { Eye, Code, Star } from 'lucide-react';
import type { ShowcaseComponent } from '../lib/types';
import { getCategoryById } from '../lib/showcaseRegistry';

interface ComponentCardProps {
  component: Omit<ShowcaseComponent, 'PreviewComponent'>;
  onClick: () => void;
  index?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  'core-ui': 'from-cyan-500/50 to-blue-500/50',
  'data-display': 'from-purple-500/50 to-pink-500/50',
  'overlays': 'from-amber-500/50 to-orange-500/50',
  'advanced': 'from-emerald-500/50 to-teal-500/50',
};

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  'core-ui': 'border-t-cyan-500/60',
  'data-display': 'border-t-purple-500/60',
  'overlays': 'border-t-amber-500/60',
  'advanced': 'border-t-emerald-500/60',
};

export function ComponentCard({ component, onClick, index = 0 }: ComponentCardProps) {
  const category = getCategoryById(component.categoryId);
  const borderColor = CATEGORY_BORDER_COLORS[component.categoryId] || 'border-t-gray-500/60';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      className={`
        group relative cursor-pointer
        rounded-xl overflow-hidden
        bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-800/90
        border border-gray-700/50 border-t-2 ${borderColor}
        backdrop-blur-sm
        shadow-lg hover:shadow-xl hover:shadow-cyan-500/10
        transition-shadow duration-300
      `}
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className={`absolute -inset-1 bg-gradient-to-r ${CATEGORY_COLORS[component.categoryId] || 'from-gray-500/20 to-gray-400/20'} blur-xl`} />
      </div>

      {/* Content */}
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {component.isFeatured && (
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            )}
            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
              {component.name}
            </h3>
          </div>

          {component.variantCount && component.variantCount > 1 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-800/80 text-gray-400 rounded-full">
              {component.variantCount} variants
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-4 line-clamp-2 group-hover:text-gray-300 transition-colors">
          {component.description}
        </p>

        {/* Category tag */}
        {category && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 bg-gray-800/50 rounded">
            <category.icon className="w-3 h-3" />
            {category.name}
          </span>
        )}

        {/* Action hint */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 text-xs text-cyan-400">
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </div>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className={`
        absolute bottom-0 left-0 right-0 h-0.5
        bg-gradient-to-r ${CATEGORY_COLORS[component.categoryId] || 'from-gray-500/50 to-gray-400/50'}
        transform scale-x-0 group-hover:scale-x-100
        transition-transform duration-300 origin-left
      `} />
    </motion.div>
  );
}
