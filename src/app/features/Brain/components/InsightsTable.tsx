'use client';

import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Star,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import type { LearningInsight } from '@/app/db/models/brain.types';

export interface InsightWithMeta extends LearningInsight {
  project_id: string;
  reflection_id: string;
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

export function InsightsTable({ insights, scope, sortField, sortDir, onSort, onDelete, projectNameMap }: InsightsTableProps) {
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
            return (
              <tr key={`${insight.reflection_id}-${idx}`} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 group">
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
                  <span className="text-xs text-zinc-500">{insight.evidence.length}</span>
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => onDelete(insight)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete insight"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
