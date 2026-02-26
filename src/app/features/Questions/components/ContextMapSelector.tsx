'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCircle, Layers, AlertCircle, Wand2, FileCode } from 'lucide-react';
import CompactList, { CompactListItem } from '@/components/lists/CompactList';
import { DbContext, DbContextGroup } from '@/app/db';
import { GroupedContexts } from '../lib/questionsApi';

interface ContextMapSelectorProps {
  /** Grouped contexts from SQLite database */
  groupedContexts: GroupedContexts[];
  /** All contexts (flat list for easier selection tracking) */
  allContexts: DbContext[];
  /** Selected context IDs */
  selectedContextIds: string[];
  /** Toggle selection for a context */
  onToggleContext: (contextId: string) => void;
  /** Select all contexts */
  onSelectAll: () => void;
  /** Clear all selections */
  onClearAll: () => void;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Handler for setting up context map (fallback) */
  onSetupContextMap?: () => Promise<void>;
}

// Max columns per row
const MAX_COLUMNS = 4;

// Category color map - static to avoid recreation
const CATEGORY_COLORS: Record<string, string> = {
  ui: 'text-purple-400',
  lib: 'text-blue-400',
  api: 'text-green-400',
  data: 'text-amber-400'
};

/**
 * Convert DbContext to CompactListItem
 * Note: parsedFilePaths parameter allows pre-parsed file paths to avoid
 * redundant JSON.parse calls on every selection change
 */
function contextToListItem(
  context: DbContext,
  isSelected: boolean,
  parsedFilePaths?: string[]
): CompactListItem {
  // Build badges array
  const badges: CompactListItem['badges'] = [];

  // Category badge
  if (context.category) {
    badges.push({
      icon: FileCode,
      label: context.category,
      color: CATEGORY_COLORS[context.category] || 'text-gray-400'
    });
  }

  // File count badge
  const fileCount = parsedFilePaths?.length ?? 0;
  if (fileCount > 0) {
    badges.push({
      label: `${fileCount}f`,
      color: 'text-gray-500'
    });
  }

  return {
    id: context.id,
    title: context.name,
    status: isSelected ? 'accepted' : 'pending',
    badges
  };
}

export default function ContextMapSelector({
  groupedContexts,
  allContexts,
  selectedContextIds,
  onToggleContext,
  onSelectAll,
  onClearAll,
  loading = false,
  error = null,
  onSetupContextMap
}: ContextMapSelectorProps) {
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);

  const allSelected = allContexts.length > 0 && selectedContextIds.length === allContexts.length;
  const someSelected = selectedContextIds.length > 0;

  // Memoize parsed file paths - only re-parses when contexts change, not on selection changes
  // This eliminates redundant JSON.parse calls (20+ contexts × every selection toggle)
  const parsedFilePathsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ctx of allContexts) {
      try {
        const filePaths = JSON.parse(ctx.file_paths || '[]');
        map.set(ctx.id, Array.isArray(filePaths) ? filePaths : []);
      } catch {
        map.set(ctx.id, []);
      }
    }
    return map;
  }, [allContexts]);

  const totalFileCount = useMemo(() => {
    let count = 0;
    for (const paths of parsedFilePathsMap.values()) {
      count += paths.length;
    }
    return count;
  }, [parsedFilePathsMap]);

  const handleSetup = async () => {
    if (!onSetupContextMap) return;

    setSetupLoading(true);
    setSetupSuccess(false);

    try {
      await onSetupContextMap();
      setSetupSuccess(true);
    } catch (err) {
      console.error('Failed to setup context map:', err);
    } finally {
      setSetupLoading(false);
    }
  };

  // Convert grouped contexts to CompactList items
  // Uses pre-parsed file paths to avoid redundant JSON.parse on selection changes
  const groupedListItems = useMemo(() => {
    return groupedContexts.map(({ group, contexts }) => ({
      group,
      items: contexts.map(ctx =>
        contextToListItem(
          ctx,
          selectedContextIds.includes(ctx.id),
          parsedFilePathsMap.get(ctx.id)
        )
      )
    }));
  }, [groupedContexts, selectedContextIds, parsedFilePathsMap]);

  // Split groups into rows (max 4 per row)
  const rows = useMemo(() => {
    const result: typeof groupedListItems[] = [];
    for (let i = 0; i < groupedListItems.length; i += MAX_COLUMNS) {
      result.push(groupedListItems.slice(i, i + MAX_COLUMNS));
    }
    return result;
  }, [groupedListItems]);

  if (loading) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading contexts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-amber-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-amber-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">{error}</p>
              {!setupSuccess && (
                <p className="text-sm text-gray-400 mt-1">
                  Setup the context-map-generator skill to create contexts.
                </p>
              )}
              {setupSuccess && (
                <p className="text-sm text-green-400 mt-1">
                  Skill and requirement files created. Run <code className="bg-gray-700 px-1 rounded">/generate-context-map</code> in Claude Code.
                </p>
              )}
            </div>
          </div>
          {onSetupContextMap && !setupSuccess && (
            <button
              onClick={handleSetup}
              disabled={setupLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {setupLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Setup Skill</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (allContexts.length === 0) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40">
        <div className="flex items-center gap-3 text-gray-400">
          <Layers className="w-5 h-5" />
          <span>No contexts found. Select a project first or run context-map-generator.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40 space-y-4">
      {/* Header with select/clear actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-300">
          <Layers className="w-4 h-4" />
          <span className="text-sm font-medium">Contexts</span>
          <span className="text-xs text-gray-500">
            ({selectedContextIds.length}/{allContexts.length} selected{totalFileCount > 0 ? ` \u00b7 ${totalFileCount} files` : ''})
          </span>
        </div>
        <div className="flex gap-2">
          {!allSelected && (
            <button
              onClick={onSelectAll}
              className="text-xs px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors"
            >
              Select All
            </button>
          )}
          {someSelected && (
            <button
              onClick={onClearAll}
              className="text-xs px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Context groups in columns (max 4 per row) */}
      <div className="space-y-4">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(row.length, MAX_COLUMNS)}, minmax(0, 1fr))`
            }}
          >
            {row.map(({ group, items }) => {
              const selectedInGroup = items.filter(i => i.status === 'accepted').length;
              const totalInGroup = items.length;
              const allGroupSelected = totalInGroup > 0 && selectedInGroup === totalInGroup;

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rowIndex * 0.1 }}
                >
                  <CompactList
                    title={group.name}
                    titleExtra={
                      allGroupSelected ? (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      ) : (
                        <span className="text-[10px] text-gray-500 tabular-nums">
                          {selectedInGroup}/{totalInGroup}
                        </span>
                      )
                    }
                    items={items}
                    onItemClick={(item) => onToggleContext(item.id)}
                    emptyMessage="No contexts"
                    maxHeight="max-h-[300px]"
                  />
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
