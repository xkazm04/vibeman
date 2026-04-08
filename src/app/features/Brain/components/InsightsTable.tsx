'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Star,
  Trash2,
  ArrowUpDown,
  AlertOctagon,
  GitMerge,
  GitBranch,
  Check,
  X,
  Zap,
  MessageSquare,
  Tag,
  Plus,
} from 'lucide-react';
import ExpandChevron from '@/components/ui/ExpandChevron';
import type { LearningInsight, InsightWithMeta, ConfidencePoint, InsightAnnotation } from '@/app/db/models/brain.types';
import InsightEvidenceLinks from './InsightEvidenceLinks';
import InsightSparkline from './InsightSparkline';

export type { InsightWithMeta, ConfidencePoint };

// Dynamically import react-window to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactWindowList = dynamic(
  () => import('react-window').then((mod) => mod.List),
  { ssr: false }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) as any;

export type InsightType = LearningInsight['type'];
export type SortField = 'type' | 'title' | 'confidence' | 'evidence';
export type SortDir = 'asc' | 'desc';

const TYPE_CONFIG: Record<InsightType, { icon: React.ReactNode; label: string; color: string }> = {
  preference_learned: { icon: <Star className="w-3.5 h-3.5" />, label: 'Preference', color: 'text-cyan-400' },
  pattern_detected: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Pattern', color: 'text-purple-400' },
  warning: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Warning', color: 'text-amber-400' },
  recommendation: { icon: <Lightbulb className="w-3.5 h-3.5" />, label: 'Recommend', color: 'text-green-400' },
  best_practice: { icon: <Zap className="w-3.5 h-3.5" />, label: 'Practice', color: 'text-emerald-400' },
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
  onViewLineage?: (insight: InsightWithMeta) => void;
  onSaveAnnotation?: (insightId: string, note: string | null, tags: string[]) => void;
  projectNameMap: Map<string, string>;
}

function SortHeader({ field, label, sortField, sortDir, onSort, semantic }: { field: SortField; label: string; sortField: SortField; sortDir: SortDir; onSort: (f: SortField) => void; semantic?: boolean }) {
  const isSorted = sortField === field;
  const button = (
    <button
      onClick={() => onSort(field)}
      aria-label={`Sort by ${label}`}
      className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded outline-none"
    >
      {label}
      {isSorted && <ArrowUpDown className="w-3 h-3 text-purple-400" />}
    </button>
  );
  if (semantic) return button;
  return (
    <div role="columnheader" aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {button}
    </div>
  );
}

function AnnotationEditor({
  annotation,
  onSave,
}: {
  annotation?: InsightAnnotation;
  onSave: (note: string | null, tags: string[]) => void;
}) {
  const [note, setNote] = useState(annotation?.note ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(annotation?.tags ?? []);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 20) {
      const next = [...tags, trimmed];
      setTags(next);
      setTagInput('');
      onSave(note || null, next);
    }
  }, [tagInput, tags, note, onSave]);

  const removeTag = useCallback((tag: string) => {
    const next = tags.filter(t => t !== tag);
    setTags(next);
    onSave(note || null, next);
  }, [tags, note, onSave]);

  const handleNoteBlur = useCallback(() => {
    const currentNote = note.trim() || null;
    const existingNote = annotation?.note ?? null;
    if (currentNote !== existingNote) {
      onSave(currentNote, tags);
    }
  }, [note, tags, annotation, onSave]);

  return (
    <div className="space-y-3">
      {/* Note */}
      <div>
        <label className="text-2xs text-zinc-500 font-mono uppercase mb-1 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          Note
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="Add a note about this insight..."
          maxLength={2000}
          rows={2}
          className="w-full rounded-lg text-xs text-zinc-300 px-3 py-2 outline-none font-mono placeholder:text-zinc-600 focus:ring-1 focus:ring-amber-500/40 transition-all resize-none"
          style={{
            background: 'rgba(39, 39, 42, 0.6)',
            border: '1px solid rgba(63, 63, 70, 0.4)',
          }}
        />
      </div>
      {/* Tags */}
      <div>
        <label className="text-2xs text-zinc-500 font-mono uppercase mb-1 flex items-center gap-1">
          <Tag className="w-3 h-3" />
          Tags
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-mono bg-amber-500/15 text-amber-300 border border-amber-500/20"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-red-400 transition-colors p-0 leading-none"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <div className="inline-flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                  removeTag(tags[tags.length - 1]);
                }
              }}
              placeholder={tags.length === 0 ? 'Add tags...' : '+'}
              maxLength={50}
              className="rounded text-2xs text-zinc-300 px-2 py-0.5 outline-none font-mono placeholder:text-zinc-600 focus:ring-1 focus:ring-amber-500/40 transition-all w-24"
              style={{
                background: 'rgba(39, 39, 42, 0.4)',
                border: '1px solid rgba(63, 63, 70, 0.3)',
              }}
            />
            {tagInput.trim() && (
              <button
                onClick={addTag}
                className="p-0.5 rounded text-amber-400 hover:bg-amber-500/10 transition-colors"
                aria-label="Add tag"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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
  onViewLineage,
  onSaveAnnotation,
  projectNameMap,
  semantic,
  colCount,
  animationDelay,
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
  onViewLineage?: (insight: InsightWithMeta) => void;
  onSaveAnnotation?: (insightId: string, note: string | null, tags: string[]) => void;
  projectNameMap: Map<string, string>;
  semantic?: boolean;
  colCount?: number;
  animationDelay?: number;
}) {
  const config = TYPE_CONFIG[insight.type];
  const isExpanded = expandedRow === rowKey;
  const hasEvidence = insight.evidence.length > 0;
  const hasConflict = insight.conflict_with && !insight.conflict_resolved;
  const isAutoResolved = insight.conflict_with && insight.conflict_resolved && insight.auto_pruned;
  const isAutoPruned = insight.auto_pruned;
  const isResolvingThis = resolvingConflict === rowKey;

  // Dynamic element tags: semantic HTML for non-virtualized path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RTag: any = semantic ? (animationDelay != null ? motion.tr : 'tr') : 'div';
  const CTag = semantic ? 'td' : 'div';
  const rProps = semantic
    ? (animationDelay != null ? { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, delay: animationDelay } } : {})
    : { role: 'row' as const };
  const cProps = semantic ? {} : { role: 'cell' as const };

  return (
    <>
      <RTag
        {...rProps}
        className={`flex items-start border-b border-zinc-800/30 hover:bg-zinc-800/20 group text-sm ${isExpanded ? 'bg-zinc-800/10' : ''} ${hasConflict ? 'border-l-2 border-l-red-500/50' : ''} ${isAutoPruned ? 'opacity-60' : ''}`}
      >
        {/* Type */}
        <CTag {...cProps} className="py-2 pr-3 w-24 shrink-0">
          <span className={`flex items-center gap-1.5 ${config.color}`}>
            {config.icon}
            <span className="text-xs">{config.label}</span>
          </span>
        </CTag>
        {/* Title */}
        <CTag {...cProps} className="py-2 pr-3 flex-1 min-w-0">
          <div className="max-w-md">
            <p className="text-zinc-200 text-sm truncate" title={insight.title}>{insight.title}</p>
            <p className="text-zinc-500 text-xs truncate mt-0.5" title={insight.description}>{insight.description}</p>
            {insight.evolves && (
              <p className="text-purple-400/60 text-2xs italic mt-0.5 truncate">Evolved: {insight.evolves}</p>
            )}
            {hasConflict && (
              <div className="flex items-center gap-1.5 mt-1">
                <AlertOctagon className="w-3 h-3 text-red-400" />
                <span className="text-red-400/80 text-2xs font-mono truncate" title={`Conflicts with: ${insight.conflict_with}`}>
                  CONFLICT: {insight.conflict_with}
                </span>
                <span className="text-zinc-600 text-2xs">({insight.conflict_type})</span>
              </div>
            )}
            {isAutoResolved && (
              <div className="flex items-center gap-1.5 mt-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400/70 text-2xs font-mono truncate" title={insight.auto_prune_reason}>
                  AUTO-RESOLVED: {insight.conflict_with}
                </span>
              </div>
            )}
            {isAutoPruned && !isAutoResolved && insight.auto_prune_reason && (
              <div className="flex items-center gap-1.5 mt-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400/70 text-2xs font-mono truncate" title={insight.auto_prune_reason}>
                  DEMOTED{insight.original_confidence ? ` (was ${insight.original_confidence}%)` : ''}
                </span>
              </div>
            )}
            {/* Inline annotation tags */}
            {insight.annotation && insight.annotation.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {insight.annotation.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-1.5 py-0 rounded-full text-2xs font-mono bg-amber-500/10 text-amber-300/80 border border-amber-500/15"
                  >
                    {tag}
                  </span>
                ))}
                {insight.annotation.tags.length > 5 && (
                  <span className="text-2xs text-zinc-500">+{insight.annotation.tags.length - 5}</span>
                )}
              </div>
            )}
            {/* Inline annotation note indicator */}
            {insight.annotation?.note && (
              <div className="flex items-center gap-1 mt-0.5">
                <MessageSquare className="w-2.5 h-2.5 text-zinc-500" />
                <span className="text-zinc-500 text-2xs truncate max-w-[200px]" title={insight.annotation.note}>
                  {insight.annotation.note}
                </span>
              </div>
            )}
          </div>
        </CTag>
        {/* Project (global only) */}
        {scope === 'global' && (
          <CTag {...cProps} className="py-2 pr-3 w-28 shrink-0">
            <span className="text-xs text-zinc-400 truncate block max-w-[100px]" title={projectNameMap.get(insight.project_id) || insight.project_id}>
              {projectNameMap.get(insight.project_id) || insight.project_id.slice(0, 8)}
            </span>
          </CTag>
        )}
        {/* Confidence */}
        <CTag {...cProps} className="py-2 pr-3 w-20 shrink-0">
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
        </CTag>
        {/* Trend */}
        <CTag {...cProps} className="py-2 pr-3 w-14 shrink-0">
          {insight.confidenceHistory && insight.confidenceHistory.length > 0 ? (
            <InsightSparkline history={insight.confidenceHistory} />
          ) : (
            <span className="text-xs text-zinc-600">&mdash;</span>
          )}
        </CTag>
        {/* Evidence */}
        <CTag {...cProps} className="py-2 pr-3 w-16 shrink-0">
          {hasEvidence ? (
            <button
              onClick={() => onToggleExpand(isExpanded ? null : rowKey)}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${insight.evidence.length} evidence link${insight.evidence.length !== 1 ? 's' : ''}`}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded outline-none"
              title={`${insight.evidence.length} evidence link${insight.evidence.length !== 1 ? 's' : ''} - click to expand`}
            >
              <ExpandChevron expanded={isExpanded} className="w-3 h-3" />
              <span>{insight.evidence.length}</span>
            </button>
          ) : (
            <span className="text-xs text-zinc-600">0</span>
          )}
        </CTag>
        {/* Actions */}
        <CTag {...cProps} className="py-2 w-10 shrink-0 text-right">
          <div className="flex items-center justify-end gap-1">
            {onViewLineage && (insight.evolves || insight.evidence.length > 0) && (
              <button
                onClick={() => onViewLineage(insight)}
                aria-label="View insight lineage"
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded text-zinc-600 hover:text-purple-400 hover:bg-purple-500/10 transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                title="View lineage"
              >
                <GitBranch className="w-3.5 h-3.5" />
              </button>
            )}
            {hasConflict && onResolveConflict && (
              <button
                onClick={() => onToggleResolving(isResolvingThis ? null : rowKey)}
                aria-label="Resolve conflict"
                className={`p-1 rounded transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none ${
                  isResolvingThis
                    ? 'bg-red-500/20 text-red-400'
                    : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-red-400/60 hover:text-red-400 hover:bg-red-500/10'
                }`}
                title="Resolve conflict"
              >
                <GitMerge className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(insight)}
              aria-label="Delete insight"
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
              title="Delete insight"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </CTag>
      </RTag>
      {/* Conflict resolution row */}
      {isResolvingThis && hasConflict && !isAutoResolved && onResolveConflict && (
        semantic ? (
          <tr><td colSpan={colCount} className="border-b border-zinc-800/30 bg-red-500/5 py-3 px-4">
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
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-zinc-500/40 bg-zinc-700/50 text-zinc-200 hover:bg-zinc-600/60 hover:border-zinc-400/50 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                  title="Keep both insights (mark as compatible)"
                >
                  <GitMerge className="w-3 h-3" />
                  Keep Both
                </button>
                <button
                  onClick={() => { onResolveConflict(insight, 'keep_this'); onToggleResolving(null); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                  title="Keep this insight, delete the other"
                >
                  <Check className="w-3 h-3" />
                  Keep This
                </button>
                <button
                  onClick={() => { onResolveConflict(insight, 'keep_other'); onToggleResolving(null); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                  title="Keep the other insight, delete this one (destructive)"
                >
                  <Trash2 className="w-3 h-3" />
                  Keep Other
                </button>
                <button
                  onClick={() => onToggleResolving(null)}
                  aria-label="Cancel conflict resolution"
                  className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </td></tr>
        ) : (
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
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-zinc-500/40 bg-zinc-700/50 text-zinc-200 hover:bg-zinc-600/60 hover:border-zinc-400/50 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                  title="Keep both insights (mark as compatible)"
                >
                  <GitMerge className="w-3 h-3" />
                  Keep Both
                </button>
                <button
                  onClick={() => { onResolveConflict(insight, 'keep_this'); onToggleResolving(null); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                  title="Keep this insight, delete the other"
                >
                  <Check className="w-3 h-3" />
                  Keep This
                </button>
                <button
                  onClick={() => { onResolveConflict(insight, 'keep_other'); onToggleResolving(null); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                  title="Keep the other insight, delete this one (destructive)"
                >
                  <Trash2 className="w-3 h-3" />
                  Keep Other
                </button>
                <button
                  onClick={() => onToggleResolving(null)}
                  aria-label="Cancel conflict resolution"
                  className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      )}
      {/* Expanded evidence + annotation row */}
      {isExpanded && (
        semantic ? (
          <tr><td colSpan={colCount} className="border-b border-zinc-800/30 bg-zinc-800/5 py-3 px-4 space-y-4">
            <InsightEvidenceLinks evidence={insight.evidence} />
            {onSaveAnnotation && (
              <div className="border-t border-zinc-800/30 pt-3">
                <AnnotationEditor
                  annotation={insight.annotation}
                  onSave={(note, tags) => onSaveAnnotation(insight.id, note, tags)}
                />
              </div>
            )}
          </td></tr>
        ) : (
          <div className="border-b border-zinc-800/30 bg-zinc-800/5 py-3 px-4 space-y-4">
            <InsightEvidenceLinks evidence={insight.evidence} />
            {onSaveAnnotation && (
              <div className="border-t border-zinc-800/30 pt-3">
                <AnnotationEditor
                  annotation={insight.annotation}
                  onSave={(note, tags) => onSaveAnnotation(insight.id, note, tags)}
                />
              </div>
            )}
          </div>
        )
      )}
    </>
  );
}

const MAX_ANIMATED_ROWS = 15;

export function InsightsTable({ insights, scope, sortField, sortDir, onSort, onDelete, onResolveConflict, onViewLineage, onSaveAnnotation, projectNameMap }: InsightsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(MAX_VISIBLE_ROWS * ROW_HEIGHT);
  const prefersReducedMotion = useReducedMotion();

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
  const colCount = scope === 'global' ? 7 : 6;

  const listHeight = shouldVirtualize
    ? Math.min(containerHeight, MAX_VISIBLE_ROWS * ROW_HEIGHT)
    : undefined;

  const rowProps = useCallback((insight: InsightWithMeta, idx: number) => ({
    insight,
    rowKey: getRowKey(insight, idx),
    scope,
    expandedRow,
    resolvingConflict,
    onToggleExpand: setExpandedRow,
    onToggleResolving: setResolvingConflict,
    onDelete,
    onResolveConflict,
    onViewLineage,
    onSaveAnnotation,
    projectNameMap,
  }), [scope, expandedRow, resolvingConflict, onDelete, onResolveConflict, onViewLineage, onSaveAnnotation, projectNameMap, getRowKey]);

  const getSortAriaSort = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? 'ascending' as const : 'descending' as const) : 'none' as const;

  // Virtualized path: div-based with ARIA roles (react-window manages layout)
  if (shouldVirtualize) {
    return (
      <div className="overflow-x-auto" ref={containerRef} role="table" aria-label="Insights table">
        <div role="rowgroup">
          <div role="row" className="flex items-center border-b border-zinc-800/60 pb-2">
            <div className="pr-3 w-24 shrink-0">
              <SortHeader field="type" label="Type" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            </div>
            <div className="pr-3 flex-1">
              <SortHeader field="title" label="Title" sortField={sortField} sortDir={sortDir} onSort={onSort} />
            </div>
            {scope === 'global' && (
              <div role="columnheader" className="pr-3 w-28 shrink-0">
                <span className="text-xs font-medium text-zinc-500">Project</span>
              </div>
            )}
            <div className="pr-3 w-20 shrink-0">
              <SortHeader field="confidence" label="Conf." sortField={sortField} sortDir={sortDir} onSort={onSort} />
            </div>
            <div role="columnheader" className="pr-3 w-14 shrink-0">
              <span className="text-xs font-medium text-zinc-500">Trend</span>
            </div>
            <div className="pr-3 w-16 shrink-0">
              <SortHeader field="evidence" label="Evid." sortField={sortField} sortDir={sortDir} onSort={onSort} />
            </div>
            <div role="columnheader" className="w-10 shrink-0">
              <span className="sr-only">Actions</span>
            </div>
          </div>
        </div>
        <div role="rowgroup">
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
                <InsightRow key={getRowKey(insights[index], index)} {...rowProps(insights[index], index)} />
              </div>
            )}
          </ReactWindowList>
        </div>
      </div>
    );
  }

  // Non-virtualized path: semantic HTML table
  return (
    <table className="block overflow-x-auto w-full" ref={containerRef as React.RefObject<HTMLTableElement>} aria-label="Insights table">
      <thead className="block">
        <tr className="flex items-center border-b border-zinc-800/60 pb-2">
          <th className="pr-3 w-24 shrink-0 font-normal text-left" aria-sort={getSortAriaSort('type')}>
            <SortHeader semantic field="type" label="Type" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          </th>
          <th className="pr-3 flex-1 font-normal text-left" aria-sort={getSortAriaSort('title')}>
            <SortHeader semantic field="title" label="Title" sortField={sortField} sortDir={sortDir} onSort={onSort} />
          </th>
          {scope === 'global' && (
            <th className="pr-3 w-28 shrink-0 font-normal text-left">
              <span className="text-xs font-medium text-zinc-500">Project</span>
            </th>
          )}
          <th className="pr-3 w-20 shrink-0 font-normal text-left" aria-sort={getSortAriaSort('confidence')}>
            <SortHeader semantic field="confidence" label="Conf." sortField={sortField} sortDir={sortDir} onSort={onSort} />
          </th>
          <th className="pr-3 w-14 shrink-0 font-normal text-left">
            <span className="text-xs font-medium text-zinc-500">Trend</span>
          </th>
          <th className="pr-3 w-16 shrink-0 font-normal text-left" aria-sort={getSortAriaSort('evidence')}>
            <SortHeader semantic field="evidence" label="Evid." sortField={sortField} sortDir={sortDir} onSort={onSort} />
          </th>
          <th className="w-10 shrink-0 font-normal text-left">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="block">
        {insights.map((insight, idx) => {
          const shouldAnimate = !prefersReducedMotion && idx < MAX_ANIMATED_ROWS;
          return (
            <InsightRow
              key={getRowKey(insight, idx)}
              {...rowProps(insight, idx)}
              semantic
              colCount={colCount}
              animationDelay={shouldAnimate ? idx * 0.02 : undefined}
            />
          );
        })}
      </tbody>
    </table>
  );
}
