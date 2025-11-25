'use client';

import React, { useState } from 'react';

export interface ContextItem {
  id: string;
  name: string;
  description: string | null;
  groupName?: string;
}

export interface ContextSelectionListProps {
  contexts: ContextItem[];
  onSelectionChange: (selectedIds: string[]) => void;
  onAccept: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}

/**
 * Context Selection Component
 * Simple checkbox list for selecting contexts
 */
export default function ContextSelectionList({
  contexts,
  onSelectionChange,
  onAccept,
  onCancel,
}: ContextSelectionListProps) {
  const [selectedContexts, setSelectedContexts] = useState<Set<string>>(
    new Set(contexts.map((c) => c.id)) // Default: all selected
  );

  const handleToggle = (contextId: string) => {
    const newSelection = new Set(selectedContexts);
    if (newSelection.has(contextId)) {
      newSelection.delete(contextId);
    } else {
      newSelection.add(contextId);
    }
    setSelectedContexts(newSelection);
    onSelectionChange(Array.from(newSelection));
  };

  const handleSelectAll = () => {
    const allIds = contexts.map((c) => c.id);
    setSelectedContexts(new Set(allIds));
    onSelectionChange(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedContexts(new Set());
    onSelectionChange([]);
  };

  return (
    <div className="space-y-3" data-testid="context-selection-list">
      {/* Header with stats and bulk actions */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cyan-500/30">
        <div className="text-sm text-gray-400">
          {selectedContexts.size} of {contexts.length} selected
        </div>
        <div className="flex gap-2">
          {/* Selection buttons */}
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors"
            data-testid="select-all-btn"
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-3 py-1 text-xs bg-gray-500/10 border border-gray-500/30 text-gray-400 rounded hover:bg-gray-500/20 transition-colors"
            data-testid="deselect-all-btn"
          >
            Deselect All
          </button>

          {/* Divider */}
          <div className="w-px bg-gray-600/50 mx-1" />

          {/* Action buttons */}
          <button
            onClick={onCancel}
            className="px-4 py-1 text-xs bg-gray-500/10 border border-gray-500/30 text-gray-400 rounded hover:bg-gray-500/20 transition-colors"
            data-testid="screen-coverage-cancel-btn"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={selectedContexts.size === 0}
            className="px-4 py-1 text-xs bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 rounded hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="screen-coverage-accept-btn"
          >
            Generate Requirements ({selectedContexts.size})
          </button>
        </div>
      </div>

      {/* Context list with checkboxes */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {contexts.map((context) => {
          const isSelected = selectedContexts.has(context.id);
          return (
            <label
              key={context.id}
              className={`flex items-start gap-3 p-3 bg-gray-800/50 border ${
                isSelected ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-600/30'
              } rounded cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors`}
              data-testid={`context-item-${context.id}`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(context.id)}
                className="mt-1 w-4 h-4 bg-gray-700 border-gray-600 rounded text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
                data-testid={`context-checkbox-${context.id}`}
              />

              {/* Context info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-white">{context.name}</div>
                  {context.groupName && (
                    <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded">
                      {context.groupName}
                    </span>
                  )}
                </div>
                {context.description && (
                  <div className="text-sm text-gray-400 mt-1 line-clamp-2">{context.description}</div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
