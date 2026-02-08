'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Definition of a single level in the hierarchy.
 *
 * @template TItem  The item type at this level (e.g. ContextGroup, Context)
 * @template TId    The ID type (default: string)
 */
export interface HierarchicalLevel<TItem, TId = string> {
  /** Unique key for this level (used for test-ids, keys) */
  key: string;
  /** Label shown next to this level row (e.g. "Groups:", "Contexts:") */
  label?: string;
  /** All items available at this level */
  items: TItem[];
  /** Extract the unique id from an item */
  getId: (item: TItem) => TId;
  /** Render a single item button. Return JSX. */
  renderItem: (item: TItem, opts: { isSelected: boolean; onToggle: () => void }) => React.ReactNode;
  /**
   * Given the IDs selected at the *previous* level, return the items
   * visible at this level. For the top-most level this receives an empty array.
   * If omitted, all items are always visible.
   */
  filterByParent?: (items: TItem[], parentSelectedIds: TId[]) => TItem[];
  /**
   * When an item at this level is deselected, return updated child IDs
   * (at the *next* level) with items belonging to this parent removed.
   * Used to cascade deselection downward.
   */
  cascadeDeselect?: (deselectedId: TId, childSelectedIds: TId[], allChildItems: TItem[]) => TId[];
}

export interface HierarchicalSelectorProps<TId = string> {
  /** Ordered level definitions, from broadest to narrowest */
  levels: HierarchicalLevel<any, TId>[];
  /**
   * Currently selected IDs per level, keyed by level.key.
   * Controlled component — the parent owns selection state.
   */
  selectedIds: Record<string, TId[]>;
  /** Called when selection changes for a level */
  onSelectionChange: (levelKey: string, ids: TId[]) => void;
  /** Optional "select all / root" button rendered before the first level */
  rootOption?: {
    label: string;
    isSelected: boolean;
    onSelect: () => void;
  };
  /** Optional clear-all callback (shown when anything is selected) */
  onClearAll?: () => void;
  /** Additional className for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Generic hierarchical cascading selector.
 *
 * Renders N levels of toggle-button rows where selecting items at level N
 * determines what's visible at level N+1. Deselecting at level N can
 * cascade removal of child selections via `cascadeDeselect`.
 */
export function HierarchicalSelector<TId = string>({
  levels,
  selectedIds,
  onSelectionChange,
  rootOption,
  onClearAll,
  className,
}: HierarchicalSelectorProps<TId>) {
  const hasAnySelection = useMemo(
    () => Object.values(selectedIds).some((ids) => (ids as TId[]).length > 0),
    [selectedIds],
  );

  const handleToggle = useCallback(
    (levelIndex: number, id: TId) => {
      const level = levels[levelIndex];
      const currentIds = selectedIds[level.key] ?? [];
      const isCurrentlySelected = currentIds.includes(id);

      let nextIds: TId[];
      if (isCurrentlySelected) {
        nextIds = currentIds.filter((i) => i !== id);

        // Cascade deselect to child levels
        if (level.cascadeDeselect) {
          const nextLevel = levels[levelIndex + 1];
          if (nextLevel) {
            const childIds = selectedIds[nextLevel.key] ?? [];
            const updatedChildIds = level.cascadeDeselect(id, childIds, nextLevel.items);
            onSelectionChange(nextLevel.key, updatedChildIds);
          }
        }
      } else {
        nextIds = [...currentIds, id];
      }

      onSelectionChange(level.key, nextIds);
    },
    [levels, selectedIds, onSelectionChange],
  );

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {levels.map((level, levelIndex) => {
        const parentLevel = levels[levelIndex - 1];
        const parentSelectedIds = parentLevel
          ? selectedIds[parentLevel.key] ?? []
          : [];

        // For level 0, always show all items. For deeper levels, only show
        // when there are parent selections (cascade visibility).
        if (levelIndex > 0 && parentSelectedIds.length === 0) {
          return null;
        }

        const visibleItems = level.filterByParent
          ? level.filterByParent(level.items, parentSelectedIds)
          : level.items;

        if (visibleItems.length === 0 && levelIndex > 0) {
          return null;
        }

        const levelSelectedIds = selectedIds[level.key] ?? [];

        return (
          <AnimatePresence key={level.key}>
            <motion.div
              initial={levelIndex > 0 ? { opacity: 0, height: 0 } : undefined}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3"
            >
              {/* Level label */}
              {level.label && (
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0 pt-1.5">
                  {level.label}
                </span>
              )}

              <div className="flex items-center gap-2 flex-1 flex-wrap">
                {/* Root option — only on first level */}
                {levelIndex === 0 && rootOption && (
                  <>
                    <motion.button
                      onClick={rootOption.onSelect}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        rootOption.isSelected
                          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40'
                          : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      {rootOption.label}
                    </motion.button>
                    <div className="w-px h-6 bg-gray-700/40 shrink-0" />
                  </>
                )}

                {/* Clear button — only on first level when there are selections */}
                {levelIndex === 0 && hasAnySelection && onClearAll && (
                  <motion.button
                    onClick={onClearAll}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 text-gray-400 border border-gray-600/50 hover:bg-gray-700/60 hover:text-gray-300 transition-all"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Clear
                  </motion.button>
                )}

                {/* Level items */}
                {visibleItems.map((item) => {
                  const id = level.getId(item);
                  const isSelected = levelSelectedIds.includes(id);
                  return (
                    <React.Fragment key={String(id)}>
                      {level.renderItem(item, {
                        isSelected,
                        onToggle: () => handleToggle(levelIndex, id),
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: useHierarchicalSelection
// ---------------------------------------------------------------------------

/**
 * Convenience hook for managing hierarchical selection state.
 * Returns `[selectedIds, setLevelIds, clearAll]`.
 */
export function useHierarchicalSelection<TId = string>(
  levelKeys: string[],
): [
  Record<string, TId[]>,
  (levelKey: string, ids: TId[]) => void,
  () => void,
] {
  const initial = useMemo(() => {
    const map: Record<string, TId[]> = {};
    levelKeys.forEach((k) => (map[k] = []));
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKeys.join(',')]);

  const [selectedIds, setSelectedIds] = useState(initial);

  const setLevelIds = useCallback((levelKey: string, ids: TId[]) => {
    setSelectedIds((prev) => ({ ...prev, [levelKey]: ids }));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds((prev) => {
      const cleared: Record<string, TId[]> = {};
      Object.keys(prev).forEach((k) => (cleared[k] = []));
      return cleared;
    });
  }, []);

  return [selectedIds, setLevelIds, clearAll];
}
