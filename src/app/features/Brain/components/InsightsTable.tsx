'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Star,
  Trash2,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  AlertOctagon,
  GitMerge,
  Check,
  X,
  Zap,
} from 'lucide-react';
import type { LearningInsight } from '@/app/db/models/brain.types';
import InsightEvidenceLinks from './InsightEvidenceLinks';
import InsightSparkline from './InsightSparkline';
import type { ConfidencePoint } from '@/app/api/brain/insights/route';

// Dynamically import react-window to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactWindowList = dynamic(
  () => import('react-window').then((mod) => mod.List),
  { ssr: false }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) as any;

export interface InsightWithMeta extends LearningInsight {
  project_id: string;
  reflection_id: string;
  confidenceHistory?: ConfidencePoint[];
}

export type InsightType = LearningInsight['type'];
export type SortField = 'type' | 'title' | 'confidence' | 'evidence';
export type SortDir = 'asc' | 'desc';

const TYPE_CONFIG: Record<InsightType, { icon: React.ReactNode; label: string; color: string }> = {
  preference_learned: { icon: <Star className="w-3.5 h-3.5" />, label: 'Preference', color: 'text-cyan-400' },
  pattern_detected: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Pattern', color: 'text-purple-400' },
  warning: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Warning', color: 'text-amber-400' },
  recommendation: { icon: <Lightbulb className="w-3.5 h-3.5" />, label: 'Recommend', color: 'text-green-400' },
};

const ROW_HEIGHT = 52;
const MAX_VISIBLE_ROWS = 15;
const VIRTUALIZATION_THRESHOLD = 50;

interface InsightsTableProps {
  insights: InsightWithMeta[];
  scope: 'project' | 'global';
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  onDelete: (insight: InsightWithMeta) => void;
  onResolveConflict?: (insight: InsightWithMeta, resolution: 'keep_both' | 'keep_this' | 'keep_other') => void;
  projectNameMap: Map<string, string>;
}

function SortHeader({ field, label, sortField, onSort }: { field: SortField; label: string; sortField: SortField; onSort: (f: SortField) => void }) {
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {label}
      {sortField === field && <ArrowUpDown className="w-3 h-3 text-purple-400" />}
    </button>
  );
}

function InsightRow({
  insight,
  rowKey,
  scope,
  expandedRow,
  resolvingConflict,
  onToggleExpand,
  onToggleResolving,
  onDelete,
  onResolveConflict,
  projectNameMap,
}: {
  insight: InsightWithMeta;
  rowKey: string;
  scope: 'project' | 'global';
  expandedRow: string | null;
  resolvingConflict: string | null;
  onToggleExpand: (key: string | null) => void;
  onToggleResolving: (key: string | null) => void;
  onDelete: (insight: InsightWithMeta) => void;
  onResolveConflict?: (insight: InsightWithMeta, resolution: 'keep_both' | 'keep_this' | 'keep_other') => void;
  projectNameMap: Map<string, string>;
}) {
  const config = TYPE_CONFIG[insight.type];
  const isExpanded = expandedRow === rowKey;
  const hasEvidence = insight.evidence.length > 0;
  const hasConflict = insight.conflict_with && !insight.conflict_resolved;
  const isAutoResolved = insight.conflict_with && insight.conflict_resolved && insight.auto_pruned;
  const isAutoPruned = insight.auto_pruned;
  const isResolvingThis = resolvingConflict === rowKey;

  return (
    <>
      <div
        className={`flex items-start border-b border-zinc-800/30 hover:bg-zinc-800/20 group text-sm ${isExpanded ? 'bg-zinc-800/10' : ''} ${hasConflict ? 'border-l-2 border-l-red-500/50' : ''} ${isAutoPruned ? 'opacity-60' : ''}`}
      >
        {/* Type */}
        <div className="py-2 pr-3 w-24 shrink-0">
          <span className={`flex items-center gap-1.5 ${config.color}`}>
            {config.icon}
            <span className="text-xs">{config.label}</span>
          </span>
        </div>
        {/* Title */}
        <div className="py-2 pr-3 flex-1 min-w-0">
          <div className="max-w-md">
            <p className="text-zinc-200 text-sm truncate" title={insight.title}>{insight.title}</p>
            <p className="text-zinc-500 text-xs truncate mt-0.5" title={insight.description}>{insight.description}</p>
            {insight.evolves && (
              <p className="text-purple-400/60 text-[10px] italic mt-0.5 truncate">Evolved: {insight.evolves}</p>
            )}
            {hasConflict && (
              <div className="flex items-center gap-1.5 mt-1">
                <AlertOctagon className="w-3 h-3 text-red-400" />
                <span className="text-red-400/80 text-[10px] font-mono truncate" title={`Conflicts with: ${insight.conflict_with}`}>
                  CONFLICT: {insight.conflict_with}
                </span>
                <span className="text-zinc-600 text-[10px]">({insight.conflict_type})</span>
              </div>
            )}
            {isAutoResolved && (
              <div className="flex items-center gap-1.5 mt-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400/70 text-[10px] font-mono truncate" title={insight.auto_prune_reason}>
                  AUTO-RESOLVED: {insight.conflict_with}
                </span>
              </div>
            )}
            {isAutoPruned && !isAutoResolved && insight.auto_prune_reason && (
              <div className="flex items-center gap-1.5 mt-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400/70 text-[10px] font-mono truncate" title={insight.auto_prune_reason}>
                  DEMOTED{insight.original_confidence ? ` (was ${insight.original_confidence}%)` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
        {/* Project (global only) */}
        {scope === 'global' && (
          <div className="py-2 pr-3 w-28 shrink-0">
            <span className="text-xs text-zinc-400 truncate block max-w-[100px]" title={projectNameMap.get(insight.project_id) || insight.project_id}>
              {projectNameMap.get(insight.project_id) || insight.project_id.slice(0, 8)}
            </span>
          </div>
        )}
        {/* Confidence */}
        <div className="py-2 pr-3 w-20 shrink-0">
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${
              insight.confidence >= 80 ? 'bg-green-500/15 text-green-400'
                : insight.confidence >= 50 ? 'bg-amber-500/15 text-amber-400'
                : 'bg-zinc-700/40 text-zinc-400'
            }`}
            title={isAutoPruned && insight.original_confidence ? `Auto-pruned from ${insight.original_confidence}%` : undefined}
          >
            {insight.confidence}%
            {isAutoPruned && insight.original_confidence && (
              <span className="text-zinc-600 line-through ml-1">{insight.original_confidence}</span>
            )}
          </span>
        </div>
        {/* Trend */}
        <div className="py-2 pr-3 w-14 shrink-0">
          {insight.confidenceHistory && insight.confidenceHistory.length > 0 ? (
            <InsightSparkline history={insight.confidenceHistory} />
          ) : (
            <span className="text-xs text-zinc-600">&mdash;</span>
          )}
        </div>
        {/* Evidence */}
        <div className="py-2 pr-3 w-16 shrink-0">
          {hasEvidence ? (
            <button
              onClick={() => onToggleExpand(isExpanded ? null : rowKey)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              title={`${insight.evidence.length} evidence link${insight.evidence.length !== 1 ? 's' : ''} - click to expand`}
            >
              {isExpanded
                ? <ChevronDown className="w-3 h-3" />
                : <ChevronRight className="w-3 h-3" />
              }
              <span>{insight.evidence.length}</span>
            </button>
          ) : (
            <span className="text-xs text-zinc-600">0</span>
          )}
        </div>
        {/* Actions */}
        <div className="py-2 w-10 shrink-0 text-right">
          <div className="flex items-center justify-end gap-1">
            {hasConflict && onResolveConflict && (
              <button
                onClick={() => onToggleResolving(isResolvingThis ? null : rowKey)}
                className={`p-1 rounded transition-all ${
                  isResolvingThis
                    ? 'bg-red-500/20 text-red-400'
                    : 'opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 hover:bg-red-500/10'
                }`}
                title="Resolve conflict"
              >
                <GitMerge className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(insight)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete insight"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      {/* Conflict resolution row */}
      {isResolvingThis && hasConflict && !isAutoResolved && onResolveConflict && (
        <div className="border-b border-zinc-800/30 bg-red-500/5 py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-400" />
              <span className="text-xs text-zinc-300">
                Resolve conflict with &quot;<span className="text-red-400">{insight.conflict_with}</span>&quot;
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { onResolveConflict(insight, 'keep_both'); onToggleResolving(null); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 transition-colors"
                title="Keep both insights (mark as compatible)"
              >
                <Check className="w-3 h-3" />
                Keep Both
              </button>
              <button
                onClick={() => { onResolveConflict(insight, 'keep_this'); onToggleResolving(null); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                title="Keep this insight, delete the other"
              >
                <Check className="w-3 h-3" />
                Keep This
              </button>
              <button
                onClick={() => { onResolveConflict(insight, 'keep_other'); onToggleResolving(null); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                title="Keep the other insight, delete this one"
              >
                <X className="w-3 h-3" />
                Keep Other
              </button>
              <button
                onClick={() => onToggleResolving(null)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Expanded evidence row */}
      {isExpanded && (
        <div className="border-b border-zinc-800/30 bg-zinc-800/5 py-3 px-4">
          <InsightEvidenceLinks evidenceIds={insight.evidence} />
        </div>
      )}
    </>
  );
}

export function InsightsTable({ insights, scope, sortField, sortDir, onSort, onDelete, onResolveConflict, projectNameMap }: InsightsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(MAX_VISIBLE_ROWS * ROW_HEIGHT);

  const getRowKey = useCallback((insight: InsightWithMeta, idx: number) => `${insight.reflection_id}-${idx}`, []);

  // Measure container for virtualization height
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.height;
      if (available > 100) setContainerHeight(available);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const shouldVirtualize = insights.length > VIRTUALIZATION_THRESHOLD;

  const listHeight = shouldVirtualize
    ? Math.min(containerHeight, MAX_VISIBLE_ROWS * ROW_HEIGHT)
    : undefined;

  const renderRow = useCallback((insight: InsightWithMeta, idx: number) => {
    const rowKey = getRowKey(insight, idx);
    return (
      <InsightRow
        key={rowKey}
        insight={insight}
        rowKey={rowKey}
        scope={scope}
        expandedRow={expandedRow}
        resolvingConflict={resolvingConflict}
        onToggleExpand={setExpandedRow}
        onToggleResolving={setResolvingConflict}
        onDelete={onDelete}
        onResolveConflict={onResolveConflict}
        projectNameMap={projectNameMap}
      />
    );
  }, [scope, expandedRow, resolvingConflict, onDelete, onResolveConflict, projectNameMap, getRowKey]);

  return (
    <div className="overflow-x-auto" ref={containerRef}>
      {/* Header row */}
      <div className="flex items-center border-b border-zinc-800/60 pb-2">
        <div className="pr-3 w-24 shrink-0">
          <SortHeader field="type" label="Type" sortField={sortField} onSort={onSort} />
        </div>
        <div className="pr-3 flex-1">
          <SortHeader field="title" label="Title" sortField={sortField} onSort={onSort} />
        </div>
        {scope === 'global' && (
          <div className="pr-3 w-28 shrink-0">
            <span className="text-xs font-medium text-zinc-500">Project</span>
          </div>
        )}
        <div className="pr-3 w-20 shrink-0">
          <SortHeader field="confidence" label="Conf." sortField={sortField} onSort={onSort} />
        </div>
        <div className="pr-3 w-14 shrink-0">
          <span className="text-xs font-medium text-zinc-500">Trend</span>
        </div>
        <div className="pr-3 w-16 shrink-0">
          <SortHeader field="evidence" label="Evid." sortField={sortField} onSort={onSort} />
        </div>
        <div className="w-10 shrink-0">
          <span className="sr-only">Actions</span>
        </div>
      </div>

      {/* Rows */}
      {shouldVirtualize ? (
        <ReactWindowList
          height={listHeight}
          width="100%"
          itemCount={insights.length}
          itemSize={ROW_HEIGHT}
          overscanCount={5}
          itemKey={(index: number) => getRowKey(insights[index], index)}
        >
          {({ index, style }: { index: number; style: React.CSSProperties }) => (
            <div style={style}>
              {renderRow(insights[index], index)}
            </div>
          )}
        </ReactWindowList>
      ) : (
        <div>
          {insights.map((insight, idx) => renderRow(insight, idx))}
        </div>
      )}
    </div>
  );
}
