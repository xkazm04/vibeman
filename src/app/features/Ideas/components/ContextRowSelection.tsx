'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';
import { useThemeStore } from '@/stores/themeStore';
import { getRGBFromHex } from '@/lib/design-tokens/colors';
import {
  HierarchicalSelector,
  type HierarchicalLevel,
} from '@/components/ui/HierarchicalSelector';

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

  // Internal state: which groups are expanded (to show individual contexts)
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<string[]>([]);

  const isFullProjectSelected = selectedContextIds.length === 0 && selectedGroupIds.length === 0;

  const handleFullProjectClick = () => {
    setSelectedGroupIds([]);
    onSelectContexts([]);
  };

  const handleClearAll = () => {
    setSelectedGroupIds([]);
    onSelectContexts([]);
  };

  // Count contexts per group (for badge display)
  const contextCountByGroup = React.useMemo(() => {
    const counts: Record<string, number> = {};
    contextGroups.forEach((group) => {
      counts[group.id] = contexts.filter((ctx) => ctx.groupId === group.id).length;
    });
    return counts;
  }, [contextGroups, contexts]);

  // Map group ID → child context IDs (for shift+click bulk toggle)
  const contextIdsByGroup = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    contextGroups.forEach((group) => {
      map[group.id] = contexts
        .filter((ctx) => ctx.groupId === group.id)
        .map((ctx) => ctx.id);
    });
    return map;
  }, [contextGroups, contexts]);

  // Groups with at least one context
  const nonEmptyGroups = React.useMemo(
    () => contextGroups.filter((g) => (contextCountByGroup[g.id] || 0) > 0),
    [contextGroups, contextCountByGroup],
  );

  // Check if all contexts of a group are selected
  const isGroupFullySelected = React.useCallback((groupId: string) => {
    const childIds = contextIdsByGroup[groupId] || [];
    return childIds.length > 0 && childIds.every((id) => selectedContextIds.includes(id));
  }, [contextIdsByGroup, selectedContextIds]);

  // Selection count for badge
  const contextCount = selectedContextIds.length;

  // --- Level definitions for HierarchicalSelector ---

  const groupLevel: HierarchicalLevel<ContextGroup> = React.useMemo(() => ({
    key: 'groups',
    label: 'Groups:',
    items: nonEmptyGroups,
    getId: (g) => g.id,
    renderItem: (group, { isSelected, onToggle }) => {
      const count = contextCountByGroup[group.id] || 0;
      const rgb = getRGBFromHex(group.color || '#6b7280');
      const allChildrenSelected = isGroupFullySelected(group.id);

      return (
        <motion.button
          data-testid={`context-group-select-${group.id}`}
          onClick={(e) => {
            if (e.shiftKey) {
              // Shift+Click: toggle all child contexts of this group
              const childIds = contextIdsByGroup[group.id] || [];
              if (allChildrenSelected) {
                // Deselect all children
                onSelectContexts(selectedContextIds.filter((id) => !childIds.includes(id)));
              } else {
                // Select all children (union with existing)
                const merged = new Set([...selectedContextIds, ...childIds]);
                onSelectContexts([...merged]);
              }
              // Also expand the group so user can see the children
              if (!selectedGroupIds.includes(group.id)) {
                setSelectedGroupIds((prev) => [...prev, group.id]);
              }
            } else {
              onToggle();
            }
          }}
          title="Click to expand/collapse. Shift+Click to select all contexts in this group."
          className={`relative shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            isSelected || allChildrenSelected
              ? 'text-white border-2'
              : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
          }`}
          style={{
            backgroundColor: (isSelected || allChildrenSelected) ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)` : undefined,
            borderColor: allChildrenSelected ? '#22c55e' : (isSelected ? group.color : undefined),
          }}
          whileHover={{
            boxShadow: (isSelected || allChildrenSelected)
              ? `0 0 12px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
              : '0 0 8px rgba(107, 114, 128, 0.3)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence>
            {allChildrenSelected && (
              <motion.div
                className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5 shadow-lg"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          <span>{group.name}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            isSelected || allChildrenSelected ? 'bg-white/20 text-white' : 'bg-gray-700/60 text-gray-500'
          }`}>
            {count}
          </span>
        </motion.button>
      );
    },
    cascadeDeselect: (deselectedGroupId, childSelectedIds) => {
      const groupContextIds = contexts
        .filter((ctx) => ctx.groupId === deselectedGroupId)
        .map((ctx) => ctx.id);
      return childSelectedIds.filter((id) => !groupContextIds.includes(id));
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [nonEmptyGroups, contextCountByGroup, selectedGroupIds, contexts, contextIdsByGroup, selectedContextIds, onSelectContexts, isGroupFullySelected]);

  const contextLevel: HierarchicalLevel<Context> = React.useMemo(() => ({
    key: 'contexts',
    label: 'Contexts:',
    items: contexts,
    getId: (c) => c.id,
    filterByParent: (allContexts, parentGroupIds) => {
      const result: Context[] = [];
      parentGroupIds.forEach((groupId) => {
        const groupContexts = allContexts
          .filter((ctx) => ctx.groupId === groupId)
          .sort((a, b) => a.name.localeCompare(b.name));
        result.push(...groupContexts);
      });
      return result;
    },
    renderItem: (context, { isSelected, onToggle }) => {
      const group = contextGroups.find((g) => g.id === context.groupId);
      const rgb = getRGBFromHex(group?.color || '#6b7280');

      return (
        <motion.button
          data-testid={`context-item-select-${context.id}`}
          onClick={onToggle}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isSelected
              ? 'text-white border'
              : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
          }`}
          style={{
            backgroundColor: isSelected ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)` : undefined,
            borderColor: isSelected ? group?.color : undefined,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{
            scale: 1.05,
            boxShadow: isSelected
              ? `0 0 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
              : '0 0 6px rgba(107, 114, 128, 0.2)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          {context.name}
        </motion.button>
      );
    },
  }), [contexts, contextGroups]);

  // Bridge HierarchicalSelector's record-based selectedIds with our split state
  const hierarchicalSelectedIds = React.useMemo(
    () => ({ groups: selectedGroupIds, contexts: selectedContextIds }),
    [selectedGroupIds, selectedContextIds],
  );

  const handleSelectionChange = React.useCallback(
    (levelKey: string, ids: string[]) => {
      if (levelKey === 'groups') {
        setSelectedGroupIds(ids);
      } else if (levelKey === 'contexts') {
        onSelectContexts(ids);
      }
    },
    [onSelectContexts],
  );

  if (contexts.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="pt-3 border-t border-gray-700/20"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <HierarchicalSelector
            levels={[groupLevel, contextLevel]}
            selectedIds={hierarchicalSelectedIds}
            onSelectionChange={handleSelectionChange}
            rootOption={{
              label: 'Full Project',
              isSelected: isFullProjectSelected,
              onSelect: handleFullProjectClick,
            }}
            onClearAll={handleClearAll}
          />
        </div>

        {/* Selection count badge */}
        <AnimatePresence>
          {contextCount > 0 && (
            <motion.span
              className="shrink-0 px-2 py-1 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              data-testid="context-selection-count"
            >
              {contextCount} selected
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
