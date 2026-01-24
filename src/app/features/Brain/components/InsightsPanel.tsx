/**
 * Insights Panel
 * Compact table view of learning insights with sort, filter, and delete.
 * Fetches from /api/brain/insights for aggregated data across reflections.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Star,
  Trash2,
  ArrowUpDown,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import type { LearningInsight } from '@/app/db/models/brain.types';

// ============================================================================
// TYPES
// ============================================================================

interface InsightWithMeta extends LearningInsight {
  project_id: string;
  reflection_id: string;
}

type InsightType = LearningInsight['type'];
type SortField = 'type' | 'title' | 'confidence' | 'evidence';
type SortDir = 'asc' | 'desc';

interface Props {
  scope?: 'project' | 'global';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TYPE_CONFIG: Record<InsightType, { icon: React.ReactNode; label: string; color: string }> = {
  preference_learned: { icon: <Star className="w-3.5 h-3.5" />, label: 'Preference', color: 'text-cyan-400' },
  pattern_detected: { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Pattern', color: 'text-purple-400' },
  warning: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Warning', color: 'text-amber-400' },
  recommendation: { icon: <Lightbulb className="w-3.5 h-3.5" />, label: 'Recommend', color: 'text-green-400' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function InsightsPanel({ scope = 'project' }: Props) {
  const [insights, setInsights] = useState<InsightWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [typeFilter, setTypeFilter] = useState<InsightType | 'all'>('all');

  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const projects = useServerProjectStore((state) => state.projects);

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  // Fetch insights from API
  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = scope === 'global'
        ? 'scope=global'
        : `projectId=${activeProject?.id}`;
      const response = await fetch(`/api/brain/insights?${params}`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setIsLoading(false);
    }
  }, [scope, activeProject?.id]);

  useEffect(() => {
    if (scope === 'global' || activeProject?.id) {
      fetchInsights();
    }
  }, [scope, activeProject?.id, fetchInsights]);

  // Delete an insight
  const handleDelete = async (insight: InsightWithMeta) => {
    try {
      const response = await fetch('/api/brain/insights', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflectionId: insight.reflection_id,
          insightTitle: insight.title,
        }),
      });
      if (response.ok) {
        setInsights(prev => prev.filter(i =>
          !(i.title === insight.title && i.reflection_id === insight.reflection_id)
        ));
      }
    } catch (err) {
      console.error('Failed to delete insight:', err);
    }
  };

  // Sort handling
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Filtered and sorted insights
  const displayed = useMemo(() => {
    let list = typeFilter === 'all' ? insights : insights.filter(i => i.type === typeFilter);

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'confidence': cmp = a.confidence - b.confidence; break;
        case 'evidence': cmp = a.evidence.length - b.evidence.length; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [insights, typeFilter, sortField, sortDir]);

  // Column header helper
  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors ${className}`}
    >
      {label}
      {sortField === field && (
        <ArrowUpDown className="w-3 h-3 text-purple-400" />
      )}
    </button>
  );

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Learning Insights</h2>
          <span className="text-xs text-zinc-500 ml-1">
            {displayed.length}{typeFilter !== 'all' ? ` / ${insights.length}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as InsightType | 'all')}
              className="bg-zinc-800/80 border border-zinc-700/50 rounded text-xs text-zinc-300 px-2 py-1 outline-none focus:border-purple-500/50"
            >
              <option value="all">All Types</option>
              <option value="preference_learned">Preferences</option>
              <option value="pattern_detected">Patterns</option>
              <option value="warning">Warnings</option>
              <option value="recommendation">Recommendations</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchInsights}
            disabled={isLoading}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
            title="Refresh insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading && insights.length === 0 ? (
        <div className="py-6 text-center">
          <RefreshCw className="w-5 h-5 text-zinc-600 mx-auto mb-2 animate-spin" />
          <p className="text-xs text-zinc-500">Loading insights...</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">No insights yet.</p>
          <p className="text-zinc-600 text-xs mt-1">
            Trigger a reflection to generate learning insights.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="pb-2 pr-3 text-left w-24">
                  <SortHeader field="type" label="Type" />
                </th>
                <th className="pb-2 pr-3 text-left">
                  <SortHeader field="title" label="Title" />
                </th>
                {scope === 'global' && (
                  <th className="pb-2 pr-3 text-left w-28">
                    <span className="text-xs font-medium text-zinc-500">Project</span>
                  </th>
                )}
                <th className="pb-2 pr-3 text-left w-20">
                  <SortHeader field="confidence" label="Conf." />
                </th>
                <th className="pb-2 pr-3 text-left w-16">
                  <SortHeader field="evidence" label="Evid." />
                </th>
                <th className="pb-2 text-right w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((insight, idx) => {
                const config = TYPE_CONFIG[insight.type];
                return (
                  <tr
                    key={`${insight.reflection_id}-${idx}`}
                    className="border-b border-zinc-800/30 hover:bg-zinc-800/20 group"
                  >
                    {/* Type */}
                    <td className="py-2 pr-3">
                      <span className={`flex items-center gap-1.5 ${config.color}`}>
                        {config.icon}
                        <span className="text-xs">{config.label}</span>
                      </span>
                    </td>

                    {/* Title + Description */}
                    <td className="py-2 pr-3">
                      <div className="max-w-md">
                        <p className="text-zinc-200 text-sm truncate" title={insight.title}>
                          {insight.title}
                        </p>
                        <p className="text-zinc-500 text-xs truncate mt-0.5" title={insight.description}>
                          {insight.description}
                        </p>
                        {insight.evolves && (
                          <p className="text-purple-400/60 text-[10px] italic mt-0.5 truncate">
                            Evolved: {insight.evolves}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Project (global mode only) */}
                    {scope === 'global' && (
                      <td className="py-2 pr-3">
                        <span className="text-xs text-zinc-400 truncate block max-w-[100px]" title={projectNameMap.get(insight.project_id) || insight.project_id}>
                          {projectNameMap.get(insight.project_id) || insight.project_id.slice(0, 8)}
                        </span>
                      </td>
                    )}

                    {/* Confidence */}
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${
                          insight.confidence >= 80
                            ? 'bg-green-500/15 text-green-400'
                            : insight.confidence >= 50
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-zinc-700/40 text-zinc-400'
                        }`}
                      >
                        {insight.confidence}%
                      </span>
                    </td>

                    {/* Evidence */}
                    <td className="py-2 pr-3">
                      <span className="text-xs text-zinc-500">
                        {insight.evidence.length}
                      </span>
                    </td>

                    {/* Delete */}
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDelete(insight)}
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
      )}
    </div>
  );
}
