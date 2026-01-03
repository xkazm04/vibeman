/**
 * ContextGroupsView Component
 * Compact view of context groups for project review
 */

'use client';

import { motion } from 'framer-motion';
import { Folder, FolderOpen, Check } from 'lucide-react';
import type { GroupedContexts, Context } from '../hooks/useProjectContexts';

interface ContextGroupsViewProps {
  groupedContexts: GroupedContexts[];
  selectedContextId: string | null;
  onSelectContext: (context: Context) => void;
  isLoading?: boolean;
}

function ContextItem({
  context,
  isSelected,
  onClick,
}: {
  context: Context;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
        isSelected
          ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50'
          : 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-300'
      }`}
    >
      <div className="flex items-center gap-1.5">
        {isSelected && <Check className="w-3 h-3 text-purple-400 flex-shrink-0" />}
        <span className="truncate">{context.name}</span>
      </div>
    </button>
  );
}

function GroupColumn({
  group,
  contexts,
  selectedContextId,
  onSelectContext,
}: {
  group: GroupedContexts['group'];
  contexts: Context[];
  selectedContextId: string | null;
  onSelectContext: (context: Context) => void;
}) {
  const groupName = group?.name || 'Ungrouped';
  const groupColor = group?.color || '#6b7280';

  return (
    <div className="flex flex-col bg-gray-800/40 border border-gray-700/40 rounded-lg overflow-hidden min-w-[140px] max-w-[180px]">
      {/* Header */}
      <div
        className="px-2 py-1.5 border-b border-gray-700/40 flex items-center gap-1.5"
        style={{ backgroundColor: `${groupColor}15` }}
      >
        <FolderOpen className="w-3 h-3" style={{ color: groupColor }} />
        <span
          className="text-xs font-medium truncate"
          style={{ color: groupColor }}
          title={groupName}
        >
          {groupName}
        </span>
        <span className="text-[10px] text-gray-500 ml-auto">{contexts.length}</span>
      </div>

      {/* Contexts */}
      <div className="p-1 space-y-0.5 max-h-[120px] overflow-y-auto custom-scrollbar">
        {contexts.map(context => (
          <ContextItem
            key={context.id}
            context={context}
            isSelected={selectedContextId === context.id}
            onClick={() => onSelectContext(context)}
          />
        ))}
      </div>
    </div>
  );
}

export function ContextGroupsView({
  groupedContexts,
  selectedContextId,
  onSelectContext,
  isLoading,
}: ContextGroupsViewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-800/40 rounded-lg border border-gray-700/40">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading contexts...</span>
        </div>
      </div>
    );
  }

  if (groupedContexts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 bg-gray-800/40 rounded-lg border border-gray-700/40">
        <Folder className="w-8 h-8 text-gray-600 mb-2" />
        <span className="text-xs text-gray-500">No contexts found</span>
        <span className="text-[10px] text-gray-600">Create contexts to assign goals</span>
      </div>
    );
  }

  return (
    <motion.div
      className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {groupedContexts.map((gc, idx) => (
        <GroupColumn
          key={gc.group?.id || 'ungrouped'}
          group={gc.group}
          contexts={gc.contexts}
          selectedContextId={selectedContextId}
          onSelectContext={onSelectContext}
        />
      ))}
    </motion.div>
  );
}

export default ContextGroupsView;
