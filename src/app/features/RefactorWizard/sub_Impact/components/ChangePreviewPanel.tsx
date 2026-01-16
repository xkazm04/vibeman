'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileCode,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import type { ImpactNode, FileChangePreview, DiffHunk, DiffLine } from '@/lib/impact';
import { IMPACT_COLORS } from '../lib/types';

interface ChangePreviewPanelProps {
  node: ImpactNode | null;
  preview: FileChangePreview | null;
  isOpen: boolean;
  onClose: () => void;
  onExclude: (nodeId: string) => void;
  onInclude: (nodeId: string) => void;
  isExcluded: boolean;
}

export function ChangePreviewPanel({
  node,
  preview,
  isOpen,
  onClose,
  onExclude,
  onInclude,
  isExcluded,
}: ChangePreviewPanelProps) {
  const [expandedHunks, setExpandedHunks] = React.useState<Set<number>>(new Set([0]));

  const toggleHunk = (index: number) => {
    setExpandedHunks(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Reset expanded hunks when node changes
  React.useEffect(() => {
    setExpandedHunks(new Set([0]));
  }, [node?.id]);

  if (!isOpen || !node) {
    return null;
  }

  const levelColors = IMPACT_COLORS[node.level];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="w-96 h-full bg-gray-900 border-l border-white/10 flex flex-col"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-cyan-400" />
              <h3 className="font-medium text-white truncate">{node.fileName}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-500 truncate mb-3">{node.path}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Impact level badge */}
              <span
                className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                style={{
                  backgroundColor: `${levelColors.fill}20`,
                  color: levelColors.fill,
                }}
              >
                {node.level}
              </span>

              {/* Change stats */}
              {preview && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-green-400">
                    <Plus className="w-3 h-3" />
                    {preview.additions}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <Minus className="w-3 h-3" />
                    {preview.deletions}
                  </span>
                </div>
              )}
            </div>

            {/* Exclude/Include toggle */}
            <button
              onClick={() => isExcluded ? onInclude(node.id) : onExclude(node.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                isExcluded
                  ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
              }`}
            >
              {isExcluded ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  Excluded
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  Included
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {preview ? (
            <div className="p-4 space-y-3">
              {preview.hunks.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No changes detected</p>
                </div>
              ) : (
                preview.hunks.map((hunk, index) => (
                  <DiffHunkView
                    key={index}
                    hunk={hunk}
                    index={index}
                    isExpanded={expandedHunks.has(index)}
                    onToggle={() => toggleHunk(index)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="p-4">
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <h4 className="text-sm font-medium text-gray-300 mb-2">File Details</h4>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Directory</dt>
                    <dd className="text-gray-300 text-right max-w-[200px] truncate">
                      {node.directory || '/'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Extension</dt>
                    <dd className="text-gray-300">.{node.extension || 'unknown'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Depth</dt>
                    <dd className="text-gray-300">
                      {node.depth === Infinity ? 'Not connected' : `${node.depth} level(s)`}
                    </dd>
                  </div>
                  {node.lineCount && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Lines</dt>
                      <dd className="text-gray-300">{node.lineCount}</dd>
                    </div>
                  )}
                  {node.changeCount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Changes</dt>
                      <dd className="text-gray-300">{node.changeCount}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {node.isSource && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-red-400">
                    This file will be directly modified by the refactoring.
                  </p>
                </div>
              )}

              {node.level === 'indirect' && (
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-400">
                    This file imports from modified files and may need updates.
                  </p>
                </div>
              )}

              {node.level === 'potential' && (
                <div className="mt-4 p-3 rounded-lg bg-gray-500/10 border border-gray-500/30">
                  <p className="text-xs text-gray-400">
                    This file is indirectly connected and may be affected.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface DiffHunkViewProps {
  hunk: DiffHunk;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function DiffHunkView({ hunk, index, isExpanded, onToggle }: DiffHunkViewProps) {
  const additions = hunk.lines.filter(l => l.type === 'addition').length;
  const deletions = hunk.lines.filter(l => l.type === 'deletion').length;

  return (
    <div className="rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Hunk header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 bg-gray-800/50 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-xs text-gray-400">
            @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {additions > 0 && (
            <span className="text-green-400">+{additions}</span>
          )}
          {deletions > 0 && (
            <span className="text-red-400">-{deletions}</span>
          )}
        </div>
      </button>

      {/* Hunk content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="font-mono text-xs">
              {hunk.lines.map((line, lineIndex) => (
                <DiffLineView key={lineIndex} line={line} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DiffLineView({ line }: { line: DiffLine }) {
  const bgColor = {
    context: 'bg-transparent',
    addition: 'bg-green-500/10',
    deletion: 'bg-red-500/10',
  }[line.type];

  const textColor = {
    context: 'text-gray-400',
    addition: 'text-green-400',
    deletion: 'text-red-400',
  }[line.type];

  const prefix = {
    context: ' ',
    addition: '+',
    deletion: '-',
  }[line.type];

  const lineNum = line.type === 'deletion' ? line.oldLineNumber : line.newLineNumber;

  return (
    <div className={`flex ${bgColor} hover:bg-white/5`}>
      <span className="w-10 flex-shrink-0 text-right pr-2 text-gray-600 border-r border-gray-700/50 select-none">
        {lineNum || ''}
      </span>
      <span className={`flex-1 pl-2 pr-4 ${textColor} whitespace-pre overflow-x-auto`}>
        <span className="text-gray-600 mr-1">{prefix}</span>
        {line.content}
      </span>
    </div>
  );
}
