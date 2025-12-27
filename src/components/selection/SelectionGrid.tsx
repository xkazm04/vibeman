'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Sparkles } from 'lucide-react';

export interface SelectionOption {
  id: string;
  label: string;
  description: string;
  emoji?: string;
  icon?: LucideIcon;
  color?: string;
}

export interface SelectionGridProps {
  /** Title of the selection grid */
  title?: string;
  /** Icon for the title */
  titleIcon?: LucideIcon;
  /** Array of selectable options */
  options: SelectionOption[];
  /** Currently selected option IDs */
  selectedIds: string[];
  /** Selection change handler */
  onChange: (ids: string[]) => void;
  /** Allow multiple selections */
  multiSelect?: boolean;
  /** Minimum selections required */
  minSelections?: number;
  /** Grid columns configuration */
  columns?: number;
}

/**
 * SelectionGrid - A grid of selectable cards
 *
 * Features:
 * - Single or multi-select mode
 * - Emoji/icon support
 * - Color-coded selections
 * - Animated hover and selection states
 * - Configurable column layout
 */
export default function SelectionGrid({
  title,
  titleIcon: TitleIcon = Sparkles,
  options,
  selectedIds,
  onChange,
  multiSelect = true,
  minSelections = 1,
  columns = 4,
}: SelectionGridProps) {
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      // Deselect - but keep minimum selections
      if (selectedIds.length > minSelections) {
        onChange(selectedIds.filter(s => s !== id));
      }
    } else {
      // Select
      if (multiSelect) {
        onChange([...selectedIds, id]);
      } else {
        onChange([id]);
      }
    }
  };

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center space-x-2 mb-3">
          <TitleIcon className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-cyan-300">
            {title}
            {multiSelect && selectedIds.length > 1 && (
              <span className="text-sm text-cyan-500 ml-2">
                ({selectedIds.length} selected)
              </span>
            )}
          </h3>
        </div>
      )}

      <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          const Icon = option.icon;

          return (
            <motion.button
              key={option.id}
              onClick={() => handleToggle(option.id)}
              className={`relative px-4 py-3 rounded-lg border-2 transition-all duration-300 text-left ${
                isSelected
                  ? option.color || 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                  : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:bg-gray-800/60 hover:border-gray-600/40'
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Selected indicator overlay */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-lg opacity-20 pointer-events-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)'
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  transition={{ duration: 0.3 }}
                />
              )}

              <div className="relative flex flex-col items-center space-y-2">
                {option.emoji && <span className="text-2xl">{option.emoji}</span>}
                {Icon && !option.emoji && <Icon className={`w-6 h-6 ${isSelected ? '' : 'text-gray-500'}`} />}
                <span className={`text-sm font-semibold ${isSelected ? '' : 'text-gray-400'}`}>
                  {option.label}
                </span>
                <span className={`text-[10px] text-center leading-tight ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                  {option.description}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
