'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lightbulb, Filter, RefreshCw } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { InsightsTable } from './InsightsTable';
import type { InsightWithMeta, InsightType, SortField, SortDir } from './InsightsTable';

interface Props {
  scope?: 'project' | 'global';
}

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

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

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Learning Insights</h2>
          <span className="text-xs text-zinc-500 ml-1">
            {displayed.length}{typeFilter !== 'all' ? ` / ${insights.length}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
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
        <InsightsTable
          insights={displayed}
          scope={scope}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          onDelete={handleDelete}
          projectNameMap={projectNameMap}
        />
      )}
    </div>
  );
}
