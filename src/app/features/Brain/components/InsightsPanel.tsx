'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Filter, RefreshCw, AlertOctagon, Search, Zap, Sparkles } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useBrainStore } from '@/stores/brainStore';
import { InsightsTable } from './InsightsTable';
import type { InsightWithMeta, InsightType, SortField, SortDir } from './InsightsTable';
import GlowCard from './GlowCard';

interface Props {
  scope?: 'project' | 'global';
}

const ACCENT_COLOR = '#f59e0b'; // Amber
const GLOW_COLOR = 'rgba(245, 158, 11, 0.15)';

function BrainSvg() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Brain outline */}
      <path
        d="M40 12C30 12 22 18 20 26C16 27 12 32 12 38C12 43 14 47 18 49C18 56 24 62 32 64C34 66 37 68 40 68C43 68 46 66 48 64C56 62 62 56 62 49C66 47 68 43 68 38C68 32 64 27 60 26C58 18 50 12 40 12Z"
        stroke={ACCENT_COLOR}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
      {/* Center dividing line */}
      <path
        d="M40 18V62"
        stroke={ACCENT_COLOR}
        strokeWidth="0.8"
        opacity="0.2"
        strokeDasharray="2 3"
      />
      {/* Neural pulse paths — left hemisphere */}
      <motion.path
        d="M28 30C32 28 36 32 40 30"
        stroke={ACCENT_COLOR}
        strokeWidth="1.2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.7, 0.7, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M22 40C28 38 34 42 40 40"
        stroke={ACCENT_COLOR}
        strokeWidth="1.2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.6, 0.6, 0] }}
        transition={{ duration: 3, delay: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M26 52C30 48 35 52 40 50"
        stroke={ACCENT_COLOR}
        strokeWidth="1.2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.5, 0.5, 0] }}
        transition={{ duration: 3, delay: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Neural pulse paths — right hemisphere */}
      <motion.path
        d="M52 34C48 32 44 36 40 34"
        stroke="#a855f7"
        strokeWidth="1.2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.7, 0.7, 0] }}
        transition={{ duration: 3, delay: 0.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M58 44C52 42 46 46 40 44"
        stroke="#a855f7"
        strokeWidth="1.2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.6, 0.6, 0] }}
        transition={{ duration: 3, delay: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M54 56C50 52 44 54 40 52"
        stroke="#a855f7"
        strokeWidth="1.2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.5, 0.5, 0] }}
        transition={{ duration: 3, delay: 2.0, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Neural nodes */}
      {[
        [28, 30], [22, 40], [26, 52],
        [52, 34], [58, 44], [54, 56],
        [40, 30], [40, 40], [40, 50],
      ].map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          r="1.5"
          fill={i < 3 ? ACCENT_COLOR : i < 6 ? '#a855f7' : '#10b981'}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}

function InsightsEmptyState({ scope }: { scope: 'project' | 'global' }) {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const triggerReflection = useBrainStore((s) => s.triggerReflection);
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTrigger = async () => {
    if (!activeProject?.id || !activeProject?.name || !activeProject?.path) return;
    setIsTriggering(true);
    try {
      await triggerReflection(activeProject.id, activeProject.name, activeProject.path);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="text-center py-10">
      <motion.div
        className="mx-auto mb-5 w-24 h-24 rounded-2xl flex items-center justify-center relative"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
        }}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BrainSvg />
        {/* Subtle ambient ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{ border: '1px solid rgba(168, 85, 247, 0.1)' }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.div>

      <h3 className="text-zinc-300 text-sm font-medium mb-1">No Learning Insights Yet</h3>
      <p className="text-zinc-600 text-xs max-w-xs mx-auto mb-5 leading-relaxed">
        Insights are patterns, preferences, and recommendations discovered when the Brain
        reflects on your development decisions.
      </p>

      {scope === 'project' && activeProject?.id && (
        <motion.button
          onClick={handleTrigger}
          disabled={isTriggering}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${ACCENT_COLOR}18 0%, rgba(168, 85, 247, 0.08) 100%)`,
            border: `1px solid ${ACCENT_COLOR}30`,
            color: ACCENT_COLOR,
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {isTriggering ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {isTriggering ? 'REFLECTING...' : 'TRIGGER REFLECTION'}
        </motion.button>
      )}
    </div>
  );
}

export default function InsightsPanel({ scope = 'project' }: Props) {
  const [insights, setInsights] = useState<InsightWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [typeFilter, setTypeFilter] = useState<InsightType | 'all' | 'conflicts'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(searchTimerRef.current);
  }, []);

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
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
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
  }, [insights, typeFilter, sortField, sortDir, debouncedSearch]);

  return (
    <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-amber-500/20">
      <div className="p-6">
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
              {displayed.length}{typeFilter !== 'all' || debouncedSearch.trim() ? ` / ${insights.length}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
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
          <InsightsEmptyState scope={scope} />
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
    </GlowCard>
  );
}
