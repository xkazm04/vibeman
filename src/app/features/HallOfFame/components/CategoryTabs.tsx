'use client';

import { motion } from 'framer-motion';
import type { CategoryId } from '../lib/types';
import { categories, getComponentCountByCategory } from '../lib/showcaseRegistry';

interface CategoryTabsProps {
  activeCategory: CategoryId;
  onCategoryChange: (categoryId: CategoryId) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-800 pb-1">
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        const count = getComponentCountByCategory(category.id);
        const Icon = category.icon;

        return (
          <motion.button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              relative flex items-center gap-2 px-4 py-3 rounded-t-lg
              font-medium text-sm transition-colors duration-200
              ${isActive
                ? 'text-cyan-300'
                : 'text-gray-400 hover:text-gray-200'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className="w-4 h-4" />
            <span>{category.name}</span>

            {/* Count badge */}
            <span
              className={`
                px-1.5 py-0.5 text-xs rounded-full
                ${isActive
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-gray-700/50 text-gray-500'
                }
              `}
            >
              {count}
            </span>

            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-t-lg border border-cyan-500/30 border-b-0"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}

            {/* Bottom border for active tab */}
            {isActive && (
              <motion.div
                layoutId="activeTabBorder"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
