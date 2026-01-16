'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Compass, Layers } from 'lucide-react';
import { TinderFilterMode } from '../lib/tinderTypes';

interface TinderFilterTabsProps {
  filterMode: TinderFilterMode;
  onFilterChange: (mode: TinderFilterMode) => void;
  counts: {
    ideas: number;
    directions: number;
  };
  disabled?: boolean;
}

const tabs: Array<{
  id: TinderFilterMode;
  label: string;
  icon: React.ElementType;
  countKey: 'ideas' | 'directions' | 'both';
  color: string;
  showCount: boolean;
}> = [
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, countKey: 'ideas', color: 'purple', showCount: true },
  { id: 'directions', label: 'Directions', icon: Compass, countKey: 'directions', color: 'cyan', showCount: false },
  { id: 'both', label: 'Both', icon: Layers, countKey: 'both', color: 'pink', showCount: true },
];

export default function TinderFilterTabs({
  filterMode,
  onFilterChange,
  counts,
  disabled = false,
}: TinderFilterTabsProps) {
  const getCount = (countKey: 'ideas' | 'directions' | 'both') => {
    if (countKey === 'both') {
      return counts.ideas + counts.directions;
    }
    return counts[countKey];
  };

  return (
    <div className="flex items-center justify-center gap-1">
      {tabs.map((tab) => {
        const isActive = filterMode === tab.id;
        const count = getCount(tab.countKey);
        const Icon = tab.icon;

        return (
          <motion.button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            disabled={disabled}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
              transition-colors duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isActive
                ? tab.color === 'purple'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : tab.color === 'cyan'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30 border border-transparent'
              }
            `}
            whileHover={disabled ? {} : { scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.98 }}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.showCount && count > 0 && (
              <span
                className={`
                  px-1.5 py-0.5 text-xs font-semibold rounded-full
                  ${isActive
                    ? tab.color === 'purple'
                      ? 'bg-purple-500/30 text-purple-200'
                      : tab.color === 'cyan'
                        ? 'bg-cyan-500/30 text-cyan-200'
                        : 'bg-pink-500/30 text-pink-200'
                    : 'bg-gray-700 text-gray-400'
                  }
                `}
              >
                {count}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className={`
                  absolute inset-0 rounded-lg -z-10
                  ${tab.color === 'purple'
                    ? 'bg-purple-500/10'
                    : tab.color === 'cyan'
                      ? 'bg-cyan-500/10'
                      : 'bg-pink-500/10'
                  }
                `}
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
