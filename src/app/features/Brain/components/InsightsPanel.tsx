'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Filter, RefreshCw, AlertOctagon, Search, Zap } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { InsightsTable } from './InsightsTable';
import type { InsightWithMeta, InsightType, SortField, SortDir } from './InsightsTable';

interface Props {
  scope?: 'project' | 'global';
}

const ACCENT_COLOR = '#f59e0b'; // Amber
const GLOW_COLOR = 'rgba(245, 158, 11, 0.15)';

export default function InsightsPanel({ scope = 'project' }: Props) {
  const [insights, setInsights] = useState<InsightWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [typeFilter, setTypeFilter] = useState<InsightType | 'all' | 'conflicts'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleResolveConflict = async (
    insight: InsightWithMeta,
    resolution: 'keep_both' | 'keep_this' | 'keep_other'
  ) => {
    try {
      const response = await fetch('/api/brain/insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflectionId: insight.reflection_id,
          insightTitle: insight.title,
          resolution,
          conflictingInsightTitle: insight.conflict_with,
        }),
      });
      if (response.ok) {
        // Refresh insights to get updated state
        fetchInsights();
      }
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
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

  // Count manual unresolved conflicts (exclude auto-resolved)
  const conflictCount = useMemo(() => {
    return insights.filter(i => i.conflict_with && !i.conflict_resolved).length;
  }, [insights]);

  // Count auto-pruned insights
  const autoPrunedCount = useMemo(() => {
    return insights.filter(i => i.auto_pruned).length;
  }, [insights]);

  const displayed = useMemo(() => {
    let list: InsightWithMeta[];
    if (typeFilter === 'all') {
      list = insights;
    } else if (typeFilter === 'conflicts') {
      list = insights.filter(i => i.conflict_with && !i.conflict_resolved);
    } else {
      list = insights.filter(i => i.type === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
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
  }, [insights, typeFilter, sortField, sortDir, searchQuery]);

  const baseCardStyle = {
    background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)',
    boxShadow: `0 0 40px ${GLOW_COLOR}, inset 0 1px 0 rgba(255,255,255,0.05)`
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-amber-500/20 backdrop-blur-xl"
      style={baseCardStyle}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${ACCENT_COLOR} 1px, transparent 1px), linear-gradient(90deg, ${ACCENT_COLOR} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute -top-1/2 -right-1/2 w-full h-full blur-3xl pointer-events-none opacity-20"
        style={{ background: `radial-gradient(circle, ${ACCENT_COLOR} 0%, transparent 70%)` }}
      />

      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: ACCENT_COLOR }} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: ACCENT_COLOR }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: ACCENT_COLOR }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: ACCENT_COLOR }} />

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 rounded-xl border"
              style={{
                backgroundColor: `${ACCENT_COLOR}15`,
                borderColor: `${ACCENT_COLOR}40`,
                boxShadow: `0 0 20px ${GLOW_COLOR}`
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Lightbulb className="w-5 h-5" style={{ color: ACCENT_COLOR }} />
            </motion.div>
            <h2 className="text-lg font-semibold text-zinc-200">Learning Insights</h2>
            <span
              className="text-sm font-mono px-2 py-0.5 rounded"
              style={{
                color: ACCENT_COLOR,
                background: `${ACCENT_COLOR}15`,
                textShadow: `0 0 10px ${GLOW_COLOR}`
              }}
            >
              {displayed.length}{typeFilter !== 'all' || searchQuery.trim() ? ` / ${insights.length}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search insights..."
                className="rounded-lg text-xs text-zinc-300 pl-8 pr-3 py-1.5 outline-none font-mono w-44 placeholder:text-zinc-600 focus:ring-1 focus:ring-amber-500/40 transition-all"
                style={{
                  background: 'rgba(39, 39, 42, 0.8)',
                  border: '1px solid rgba(63, 63, 70, 0.5)'
                }}
              />
            </div>

            {/* Auto-pruned indicator */}
            {autoPrunedCount > 0 && (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-amber-500/10 text-amber-400/80 border border-amber-500/20"
                title={`${autoPrunedCount} insight${autoPrunedCount !== 1 ? 's' : ''} auto-pruned by effectiveness analysis`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{autoPrunedCount} AUTO-PRUNED</span>
              </span>
            )}

            {/* Conflicts button - only for unresolved manual conflicts */}
            {conflictCount > 0 && (
              <button
                onClick={() => setTypeFilter(typeFilter === 'conflicts' ? 'all' : 'conflicts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  typeFilter === 'conflicts'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-red-500/10 text-red-400/80 border border-red-500/20 hover:bg-red-500/15'
                }`}
                title="View conflicting insights needing manual resolution"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>{conflictCount} CONFLICTS</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={typeFilter === 'conflicts' ? 'all' : typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as InsightType | 'all' | 'conflicts')}
                className="rounded-lg text-xs text-zinc-300 px-3 py-1.5 outline-none font-mono"
                style={{
                  background: 'rgba(39, 39, 42, 0.8)',
                  border: '1px solid rgba(63, 63, 70, 0.5)'
                }}
              >
                <option value="all">ALL_TYPES</option>
                <option value="preference_learned">PREFERENCES</option>
                <option value="pattern_detected">PATTERNS</option>
                <option value="warning">WARNINGS</option>
                <option value="recommendation">RECOMMENDATIONS</option>
              </select>
            </div>

            <button
              onClick={fetchInsights}
              disabled={isLoading}
              className="p-2 rounded-lg transition-all"
              style={{
                background: 'rgba(39, 39, 42, 0.5)',
                border: '1px solid rgba(63, 63, 70, 0.5)'
              }}
              title="Refresh insights"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoading && insights.length === 0 ? (
          <div className="py-12 text-center">
            <RefreshCw className="w-6 h-6 text-amber-400 mx-auto mb-3 animate-spin" />
            <p className="text-xs text-zinc-500 font-mono">LOADING_INSIGHTS...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-12">
            <motion.div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{
                background: `${ACCENT_COLOR}10`,
                border: `1px solid ${ACCENT_COLOR}20`
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Lightbulb className="w-8 h-8" style={{ color: `${ACCENT_COLOR}60` }} />
            </motion.div>
            <p className="text-zinc-500 text-sm">No insights yet.</p>
            <p className="text-zinc-600 text-xs mt-1 font-mono">
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
            onResolveConflict={handleResolveConflict}
            projectNameMap={projectNameMap}
          />
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${ACCENT_COLOR}, transparent)` }}
      />
    </motion.div>
  );
}
