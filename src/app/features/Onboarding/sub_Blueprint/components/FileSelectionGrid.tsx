'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Trash2, Wrench, X } from 'lucide-react';

export interface FileSelectionItem {
  id: string;
  filePath: string;
  relativePath: string;
  exports?: string[];
  reason?: string;
  metadata?: Record<string, any>;
}

export interface FileSelectionAction {
  id: 'clean' | 'integrate' | 'skip';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

export interface FileSelectionGridProps {
  files: FileSelectionItem[];
  onSelectionChange?: (selections: Record<string, string>) => void;
  className?: string;
  testId?: string;
}

const DEFAULT_ACTIONS: FileSelectionAction[] = [
  {
    id: 'clean',
    label: 'Delete',
    icon: Trash2,
    color: 'red',
    description: 'Remove this file from the codebase',
  },
  {
    id: 'integrate',
    label: 'Integrate',
    icon: Wrench,
    color: 'green',
    description: 'Analyze and integrate into codebase',
  },
  {
    id: 'skip',
    label: 'Skip',
    icon: X,
    color: 'gray',
    description: 'Keep as-is, no action',
  },
];

export default function FileSelectionGrid({
  files,
  onSelectionChange,
  className = '',
  testId = 'file-selection-grid',
}: FileSelectionGridProps) {
  // State: fileId -> actionId
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Virtual scrolling state
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  // Constants for virtual scrolling
  const ITEM_HEIGHT = 44; // Height of each row in pixels (py-1.5 + content + margin)
  const BUFFER = 5; // Number of items to render above/below visible area

  const handleSelect = (fileId: string, actionId: string) => {
    const newSelections = {
      ...selections,
      [fileId]: selections[fileId] === actionId ? '' : actionId, // Toggle if same action
    };

    setSelections(newSelections);
    onSelectionChange?.(newSelections);
  };

  // Compute stats
  const stats = useMemo(() => {
    const cleanCount = Object.values(selections).filter(action => action === 'clean').length;
    const integrateCount = Object.values(selections).filter(action => action === 'integrate').length;
    const skipCount = Object.values(selections).filter(action => action === 'skip').length;
    const unassignedCount = files.length - cleanCount - integrateCount - skipCount;

    return { cleanCount, integrateCount, skipCount, unassignedCount };
  }, [selections, files.length]);

  // Calculate visible range for virtual scrolling
  const { visibleStart, visibleEnd, totalHeight } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const end = Math.min(files.length, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER);
    const total = files.length * ITEM_HEIGHT;

    return { visibleStart: start, visibleEnd: end, totalHeight: total };
  }, [scrollTop, containerHeight, files.length]);

  // Handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Measure container height on mount and resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const getActionColor = (actionId: string) => {
    switch (actionId) {
      case 'clean': return { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', hover: 'hover:bg-red-500/30 hover:border-red-500/60' };
      case 'integrate': return { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400', hover: 'hover:bg-green-500/30 hover:border-green-500/60' };
      case 'skip': return { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400', hover: 'hover:bg-gray-500/30 hover:border-gray-500/60' };
      default: return { bg: 'bg-gray-800/50', border: 'border-gray-600/50', text: 'text-gray-400', hover: '' };
    }
  };

  return (
    <div className={`space-y-3 ${className}`} data-testid={testId}>
      {/* Compact Stats Bar */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 border border-gray-600/50 rounded">
          <span className="text-gray-500">Unassigned:</span>
          <span className="text-gray-300 font-bold">{stats.unassignedCount}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded">
          <Trash2 className="w-3 h-3 text-red-400" />
          <span className="text-red-400 font-bold">{stats.cleanCount}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded">
          <Wrench className="w-3 h-3 text-green-400" />
          <span className="text-green-400 font-bold">{stats.integrateCount}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500/10 border border-gray-500/30 rounded">
          <X className="w-3 h-3 text-gray-400" />
          <span className="text-gray-400 font-bold">{stats.skipCount}</span>
        </div>
      </div>

      {/* Compact Table Header */}
      <div className="flex items-center gap-2 px-2 py-1 text-xs font-mono text-gray-500 border-b border-gray-700/50">
        <div className="flex-1 min-w-0">File Path</div>
        <div className="w-16 text-center flex-shrink-0">Delete</div>
        <div className="w-20 text-center flex-shrink-0">Integrate</div>
        <div className="w-16 text-center flex-shrink-0">Skip</div>
      </div>

      {/* Virtualized File List */}
      <div
        ref={containerRef}
        className="max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-gray-800/30"
        data-testid={`${testId}-files`}
        onScroll={handleScroll}
      >
        {/* Virtual scroll container */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Only render visible items */}
          {files.slice(visibleStart, visibleEnd).map((file, visibleIndex) => {
            const index = visibleStart + visibleIndex;
            const selectedAction = selections[file.id];
            const rowColors = selectedAction ? getActionColor(selectedAction) : { border: 'border-gray-700/30' };

            return (
              <div
                key={file.id}
                style={{
                  position: 'absolute',
                  top: index * ITEM_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ITEM_HEIGHT,
                }}
                className={`flex items-center gap-2 px-2 py-1.5 bg-gray-900/30 border ${rowColors.border} rounded hover:bg-gray-800/50 transition-all group`}
                data-testid={`${testId}-file-${index}`}
              >
                {/* File Info - Left */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-gray-300 truncate" title={file.relativePath}>
                    {file.relativePath}
                  </div>
                  {(file.exports && file.exports.length > 0) && (
                    <div className="text-[10px] text-gray-600 truncate">
                      {file.exports.join(', ')}
                    </div>
                  )}
                </div>

                {/* Action Buttons - Right (fixed width columns) */}
                <button
                  onClick={() => handleSelect(file.id, 'clean')}
                  className={`
                    w-16 h-7 flex items-center justify-center gap-1 rounded border text-[10px] font-mono
                    transition-all flex-shrink-0
                    ${selectedAction === 'clean'
                      ? `${getActionColor('clean').bg} ${getActionColor('clean').border} ${getActionColor('clean').text}`
                      : `bg-gray-800/30 border-gray-700/30 text-gray-600 ${getActionColor('clean').hover}`
                    }
                  `}
                  data-testid={`${testId}-file-${index}-action-clean`}
                  title="Remove this file from the codebase"
                >
                  {selectedAction === 'clean' && <Check className="w-3 h-3" />}
                  <Trash2 className="w-3 h-3" />
                </button>

                <button
                  onClick={() => handleSelect(file.id, 'integrate')}
                  className={`
                    w-20 h-7 flex items-center justify-center gap-1 rounded border text-[10px] font-mono
                    transition-all flex-shrink-0
                    ${selectedAction === 'integrate'
                      ? `${getActionColor('integrate').bg} ${getActionColor('integrate').border} ${getActionColor('integrate').text}`
                      : `bg-gray-800/30 border-gray-700/30 text-gray-600 ${getActionColor('integrate').hover}`
                    }
                  `}
                  data-testid={`${testId}-file-${index}-action-integrate`}
                  title="Analyze and integrate into codebase"
                >
                  {selectedAction === 'integrate' && <Check className="w-3 h-3" />}
                  <Wrench className="w-3 h-3" />
                </button>

                <button
                  onClick={() => handleSelect(file.id, 'skip')}
                  className={`
                    w-16 h-7 flex items-center justify-center gap-1 rounded border text-[10px] font-mono
                    transition-all flex-shrink-0
                    ${selectedAction === 'skip'
                      ? `${getActionColor('skip').bg} ${getActionColor('skip').border} ${getActionColor('skip').text}`
                      : `bg-gray-800/30 border-gray-700/30 text-gray-600 ${getActionColor('skip').hover}`
                    }
                  `}
                  data-testid={`${testId}-file-${index}-action-skip`}
                  title="Keep as-is, no action"
                >
                  {selectedAction === 'skip' && <Check className="w-3 h-3" />}
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
