'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';
import { useThemeStore } from '@/stores/themeStore';
import ContextGroupSelector from './ContextGroupSelector';
import ContextItemSelector from './ContextItemSelector';

interface ContextRowSelectionProps {
  contexts: Context[];
  contextGroups: ContextGroup[];
  selectedContextIds: string[];
  onSelectContexts: (contextIds: string[]) => void;
}

export default function ContextRowSelection({
  contexts,
  contextGroups,
  selectedContextIds,
  onSelectContexts,
}: ContextRowSelectionProps) {
  const { getThemeColors } = useThemeStore();

  // Internal state: which groups are selected/expanded
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<string[]>([]);

  // Check if "Full Project" is selected (no contexts and no groups selected)
  const isFullProjectSelected = selectedContextIds.length === 0 && selectedGroupIds.length === 0;

  // Handle "Full Project" button click
  const handleFullProjectClick = () => {
    setSelectedGroupIds([]);
    onSelectContexts([]);
  };

  // Toggle group selection
  const handleToggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      // Deselecting group - also remove all contexts from this group
      setSelectedGroupIds((prev) => prev.filter((id) => id !== groupId));

      // Remove all contexts belonging to this group from selection
      const groupContextIds = contexts
        .filter((ctx) => ctx.groupId === groupId)
        .map((ctx) => ctx.id);
      onSelectContexts(selectedContextIds.filter((id) => !groupContextIds.includes(id)));
    } else {
      // Selecting group - just add to selected groups (don't auto-select contexts)
      setSelectedGroupIds((prev) => [...prev, groupId]);
    }
  };

  // Clear all groups and contexts
  const handleClearAll = () => {
    setSelectedGroupIds([]);
    onSelectContexts([]);
  };

  // Toggle individual context selection
  const handleToggleContext = (contextId: string) => {
    if (selectedContextIds.includes(contextId)) {
      onSelectContexts(selectedContextIds.filter((id) => id !== contextId));
    } else {
      onSelectContexts([...selectedContextIds, contextId]);
    }
  };

  // Calculate total selection count
  const totalSelectedCount = selectedContextIds.length;

  if (contexts.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="pt-3 border-t border-gray-700/20 space-y-3"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      {/* Row 1: Groups Selection */}
      <div className="flex items-start gap-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 pt-1.5">
          Groups:
        </span>

        <div className="flex items-center gap-2 flex-1 overflow-hidden">
          {/* Full Project Button */}
          <motion.button
            data-testid="context-filter-full-project"
            onClick={handleFullProjectClick}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isFullProjectSelected
                ? `${getThemeColors().bgHover} ${getThemeColors().text} border ${getThemeColors().borderHover}`
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
            }`}
            whileHover={{
              scale: 1.05,
              boxShadow: isFullProjectSelected
                ? '0 0 12px rgba(34, 211, 238, 0.4), 0 0 20px rgba(34, 211, 238, 0.2)'
                : '0 0 8px rgba(107, 114, 128, 0.3)',
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            Full Project
          </motion.button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-700/40 shrink-0" />

          {/* Group Selector */}
          <ContextGroupSelector
            contextGroups={contextGroups}
            contexts={contexts}
            selectedGroupIds={selectedGroupIds}
            onToggleGroup={handleToggleGroup}
            onClearAll={handleClearAll}
          />
        </div>

        {/* Selection count badge */}
        <AnimatePresence>
          {totalSelectedCount > 0 && (
            <motion.span
              className="shrink-0 px-2 py-1 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              data-testid="context-selection-count"
            >
              {totalSelectedCount} selected
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Row 2: Individual Contexts (only visible when groups are selected) */}
      <AnimatePresence>
        {selectedGroupIds.length > 0 && (
          <motion.div
            className="flex items-start gap-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 pt-1.5">
              Contexts:
            </span>

            <div className="flex-1">
              <ContextItemSelector
                contexts={contexts}
                contextGroups={contextGroups}
                selectedGroupIds={selectedGroupIds}
                selectedContextIds={selectedContextIds}
                onToggleContext={handleToggleContext}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
