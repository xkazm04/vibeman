'use client';

import { motion } from 'framer-motion';
import { Lightbulb, Compass, Layers } from 'lucide-react';
import { useTabNavigation } from '@/hooks/useTabNavigation';
import { SuggestionFilter } from '../lib/unifiedTypes';

interface SuggestionTypeToggleProps {
  value: SuggestionFilter;
  onChange: (filter: SuggestionFilter) => void;
  ideasCount?: number;
  directionsCount?: number;
  compact?: boolean;
}

const TYPE_OPTIONS: {
  value: SuggestionFilter;
  label: string;
  icon: typeof Lightbulb;
  color: string;
  bgActive: string;
  textActive: string;
  borderActive: string;
}[] = [
  {
    value: 'ideas',
    label: 'Ideas',
    icon: Lightbulb,
    color: 'yellow',
    bgActive: 'bg-yellow-500/20',
    textActive: 'text-yellow-300',
    borderActive: 'border-yellow-500/40'
  },
  {
    value: 'directions',
    label: 'Directions',
    icon: Compass,
    color: 'cyan',
    bgActive: 'bg-cyan-500/20',
    textActive: 'text-cyan-300',
    borderActive: 'border-cyan-500/40'
  },
  {
    value: 'both',
    label: 'Both',
    icon: Layers,
    color: 'purple',
    bgActive: 'bg-purple-500/20',
    textActive: 'text-purple-300',
    borderActive: 'border-purple-500/40'
  }
];

export default function SuggestionTypeToggle({
  value,
  onChange,
  ideasCount,
  directionsCount,
  compact = false
}: SuggestionTypeToggleProps) {
  const { tablistRef, handleKeyDown } = useTabNavigation();

  const getCount = (option: SuggestionFilter): number | undefined => {
    if (option === 'ideas') return ideasCount;
    if (option === 'directions') return directionsCount;
    if (option === 'both' && ideasCount !== undefined && directionsCount !== undefined) {
      return ideasCount + directionsCount;
    }
    return undefined;
  };

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label="Suggestion type"
      onKeyDown={handleKeyDown}
      className={`flex ${compact ? 'gap-1' : 'gap-2'}`}
    >
      {TYPE_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;
        const count = getCount(option.value);

        return (
          <motion.button
            key={option.value}
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={`
              flex items-center gap-1.5 rounded-lg border transition-all outline-none
              focus-visible:ring-2 focus-visible:ring-yellow-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
              ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
              ${isSelected
                ? `${option.bgActive} ${option.textActive} ${option.borderActive}`
                : 'bg-gray-800/40 text-gray-400 border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            <span className="font-medium">{option.label}</span>
            {count !== undefined && (
              <span className={`
                ${compact ? 'text-2xs' : 'text-xs'}
                ${isSelected ? 'opacity-80' : 'opacity-60'}
              `}>
                ({count.toLocaleString()})
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
