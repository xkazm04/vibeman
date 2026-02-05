'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import type { LearningInsight } from '@/app/db/models/brain.types';
import InsightEvidenceLinks from './InsightEvidenceLinks';
import InsightSparkline from './InsightSparkline';
import type { ConfidencePoint } from '@/app/api/brain/insights/route';

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

export function InsightsTable({ insights, scope, sortField, sortDir, onSort, onDelete, onResolveConflict, projectNameMap }: InsightsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null);

  const getRowKey = (insight: InsightWithMeta, idx: number) => `${insight.reflection_id}-${idx}`;

  const colCount = scope === 'global' ? 7 : 6;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/60">
            <th className="pb-2 pr-3 text-left w-24">
              <SortHeader field="type" label="Type" sortField={sortField} onSort={onSort} />
            </th>
            <th className="pb-2 pr-3 text-left">
              <SortHeader field="title" label="Title" sortField={sortField} onSort={onSort} />
            </th>
            {scope === 'global' && (
              <th className="pb-2 pr-3 text-left w-28">
                <span className="text-xs font-medium text-zinc-500">Project</span>
              </th>
            )}
            <th className="pb-2 pr-3 text-left w-20">
              <SortHeader field="confidence" label="Conf." sortField={sortField} onSort={onSort} />
            </th>
            <th className="pb-2 pr-3 text-left w-14">
              <span className="text-xs font-medium text-zinc-500">Trend</span>
            </th>
            <th className="pb-2 pr-3 text-left w-16">
              <SortHeader field="evidence" label="Evid." sortField={sortField} onSort={onSort} />
            </th>
            <th className="pb-2 text-right w-10">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {insights.map((insight, idx) => {
            const config = TYPE_CONFIG[insight.type];
            const rowKey = getRowKey(insight, idx);
            const isExpanded = expandedRow === rowKey;
            const hasEvidence = insight.evidence.length > 0;
            const hasConflict = insight.conflict_with && !insight.conflict_resolved;
            const isResolvingThis = resolvingConflict === rowKey;

            return (
              <>
                <tr
                  key={rowKey}
                  className={`border-b border-zinc-800/30 hover:bg-zinc-800/20 group ${isExpanded ? 'bg-zinc-800/10' : ''} ${hasConflict ? 'border-l-2 border-l-red-500/50' : ''}`}
                >
                  <td className="py-2 pr-3">
                    <span className={`flex items-center gap-1.5 ${config.color}`}>
                      {config.icon}
                      <span className="text-xs">{config.label}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="max-w-md">
                      <p className="text-zinc-200 text-sm truncate" title={insight.title}>{insight.title}</p>
                      <p className="text-zinc-500 text-xs truncate mt-0.5" title={insight.description}>{insight.description}</p>
                      {insight.evolves && (
                        <p className="text-purple-400/60 text-[10px] italic mt-0.5 truncate">Evolved: {insight.evolves}</p>
                      )}
                      {/* Conflict indicator */}
                      {hasConflict && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <AlertOctagon className="w-3 h-3 text-red-400" />
                          <span className="text-red-400/80 text-[10px] font-mono truncate" title={`Conflicts with: ${insight.conflict_with}`}>
                            CONFLICT: {insight.conflict_with}
                          </span>
                          <span className="text-zinc-600 text-[10px]">({insight.conflict_type})</span>
                        </div>
                      )}
                    </div>
                  </td>
                  {scope === 'global' && (
                    <td className="py-2 pr-3">
                      <span className="text-xs text-zinc-400 truncate block max-w-[100px]" title={projectNameMap.get(insight.project_id) || insight.project_id}>
                        {projectNameMap.get(insight.project_id) || insight.project_id.slice(0, 8)}
                      </span>
                    </td>
                  )}
                  <td className="py-2 pr-3">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${
                      insight.confidence >= 80 ? 'bg-green-500/15 text-green-400'
                        : insight.confidence >= 50 ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-zinc-700/40 text-zinc-400'
                    }`}>
                      {insight.confidence}%
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {insight.confidenceHistory && insight.confidenceHistory.length > 0 ? (
                      <InsightSparkline history={insight.confidenceHistory} />
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {hasEvidence ? (
                      <button
                        onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
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
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Conflict resolution button */}
                      {hasConflict && onResolveConflict && (
                        <button
                          onClick={() => setResolvingConflict(isResolvingThis ? null : rowKey)}
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
                  </td>
                </tr>
                {/* Conflict resolution row */}
                {isResolvingThis && hasConflict && onResolveConflict && (
                  <tr key={`${rowKey}-conflict`} className="border-b border-zinc-800/30 bg-red-500/5">
                    <td colSpan={colCount} className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertOctagon className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-zinc-300">
                            Resolve conflict with &quot;<span className="text-red-400">{insight.conflict_with}</span>&quot;
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              onResolveConflict(insight, 'keep_both');
                              setResolvingConflict(null);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 transition-colors"
                            title="Keep both insights (mark as compatible)"
                          >
                            <Check className="w-3 h-3" />
                            Keep Both
                          </button>
                          <button
                            onClick={() => {
                              onResolveConflict(insight, 'keep_this');
                              setResolvingConflict(null);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                            title="Keep this insight, delete the other"
                          >
                            <Check className="w-3 h-3" />
                            Keep This
                          </button>
                          <button
                            onClick={() => {
                              onResolveConflict(insight, 'keep_other');
                              setResolvingConflict(null);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                            title="Keep the other insight, delete this one"
                          >
                            <X className="w-3 h-3" />
                            Keep Other
                          </button>
                          <button
                            onClick={() => setResolvingConflict(null)}
                            className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {/* Expanded evidence row */}
                {isExpanded && (
                  <tr key={`${rowKey}-evidence`} className="border-b border-zinc-800/30 bg-zinc-800/5">
                    <td colSpan={colCount} className="py-3 px-4">
                      <InsightEvidenceLinks evidenceIds={insight.evidence} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
