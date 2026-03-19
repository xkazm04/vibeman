'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Lightbulb, Filter, RefreshCw, AlertOctagon, Search, Zap, Sparkles } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BrainPanelHeader from './BrainPanelHeader';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { InsightsTable } from './InsightsTable';
import type { InsightWithMeta, InsightType, SortField, SortDir } from './InsightsTable';
import GlowCard from './GlowCard';
import { useReflectionTrigger } from '@/hooks/useReflectionTrigger';
import { subscribeToReflectionCompletion } from '@/stores/reflectionCompletionEmitter';
import { brainKeys, useInvalidateBrain } from '../lib/queries';
import { CACHE_PRESETS } from '@/lib/cache/cache-config';

interface Props {
  scope?: 'project' | 'global';
}

const ACCENT_COLOR = '#f59e0b'; // Amber
const GLOW_COLOR = 'rgba(245, 158, 11, 0.15)';

function BrainSvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  const leftPaths = [
    { d: 'M28 30C32 28 36 32 40 30', peakOpacity: 0.7, delay: 0 },
    { d: 'M22 40C28 38 34 42 40 40', peakOpacity: 0.6, delay: 0.8 },
    { d: 'M26 52C30 48 35 52 40 50', peakOpacity: 0.5, delay: 1.6 },
  ];
  const rightPaths = [
    { d: 'M52 34C48 32 44 36 40 34', peakOpacity: 0.7, delay: 0.4 },
    { d: 'M58 44C52 42 46 46 40 44', peakOpacity: 0.6, delay: 1.2 },
    { d: 'M54 56C50 52 44 54 40 52', peakOpacity: 0.5, delay: 2.0 },
  ];
  const nodes = [
    [28, 30], [22, 40], [26, 52],
    [52, 34], [58, 44], [54, 56],
    [40, 30], [40, 40], [40, 50],
  ];

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
      {leftPaths.map((p, i) =>
        reducedMotion ? (
          <path key={i} d={p.d} stroke={ACCENT_COLOR} strokeWidth="1.2" strokeLinecap="round" opacity={p.peakOpacity} />
        ) : (
          <motion.path
            key={i} d={p.d} stroke={ACCENT_COLOR} strokeWidth="1.2" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1, 0], opacity: [0, p.peakOpacity, p.peakOpacity, 0] }}
            transition={{ duration: 3, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}
      {/* Neural pulse paths — right hemisphere */}
      {rightPaths.map((p, i) =>
        reducedMotion ? (
          <path key={i} d={p.d} stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round" opacity={p.peakOpacity} />
        ) : (
          <motion.path
            key={i} d={p.d} stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1, 0], opacity: [0, p.peakOpacity, p.peakOpacity, 0] }}
            transition={{ duration: 3, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}
      {/* Neural nodes */}
      {nodes.map(([cx, cy], i) =>
        reducedMotion ? (
          <circle key={i} cx={cx} cy={cy} r="1.5" fill={i < 3 ? ACCENT_COLOR : i < 6 ? '#a855f7' : '#10b981'} opacity="0.8" />
        ) : (
          <motion.circle
            key={i} cx={cx} cy={cy} r="1.5"
            fill={i < 3 ? ACCENT_COLOR : i < 6 ? '#a855f7' : '#10b981'}
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
          />
        )
      )}
    </svg>
  );
}

function InsightsEmptyState({ scope }: { scope: 'project' | 'global' }) {
  const activeProject = useClientProjectStore((s) => s.activeProject);
  const prefersReducedMotion = useReducedMotion();

  // Unified reflection trigger hook
  const { trigger, isActive: isTriggering } = useReflectionTrigger({
    scope: 'project',
    project: activeProject
      ? {
          projectId: activeProject.id,
          projectName: activeProject.name,
          projectPath: activeProject.path,
        }
      : undefined,
  });

  return (
    <div className="text-center py-10">
      <motion.div
        className="mx-auto mb-5 w-24 h-24 rounded-2xl flex items-center justify-center relative"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(168, 85, 247, 0.06) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
        }}
        animate={prefersReducedMotion ? undefined : { scale: [1, 1.02, 1] }}
        transition={prefersReducedMotion ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BrainSvg reducedMotion={prefersReducedMotion} />
        {/* Subtle ambient ring */}
        {prefersReducedMotion ? (
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ border: '1px solid rgba(168, 85, 247, 0.1)', opacity: 0.5 }}
          />
        ) : (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ border: '1px solid rgba(168, 85, 247, 0.1)' }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}
      </motion.div>

      <h3 className="text-zinc-300 text-sm font-medium mb-1">No Learning Insights Yet</h3>
      <p className="text-zinc-600 text-xs max-w-xs mx-auto mb-5 leading-relaxed">
        Insights are patterns, preferences, and recommendations discovered when the Brain
        reflects on your development decisions.
      </p>

      {scope === 'project' && activeProject?.id && (
        <motion.button
          onClick={trigger}
          disabled={isTriggering}
          aria-label={isTriggering ? 'Reflecting in progress' : 'Trigger reflection'}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none"
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

  const activeProject = useClientProjectStore((state) => state.activeProject);
  const projects = useServerProjectStore((state) => state.projects);
  const queryClient = useQueryClient();
  const { invalidateInsights } = useInvalidateBrain();

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    return map;
  }, [projects]);

  // Use useQuery directly to handle global scope (no projectId) correctly
  const insightsQuery = useQuery({
    queryKey: brainKeys.insightsList(activeProject?.id ?? '', scope),
    queryFn: async () => {
      const params = scope === 'global'
        ? 'scope=global'
        : `projectId=${activeProject?.id}`;
      const res = await fetch(`/api/brain/insights?${params}`);
      if (!res.ok) {
        const error = new Error(`Brain API error: ${res.status}`) as Error & { status: number };
        error.status = res.status;
        throw error;
      }
      const json = await res.json();
      if (json.success === false) {
        throw new Error(json.error || 'Brain API request failed');
      }
      return json as { success: boolean; insights: InsightWithMeta[] };
    },
    enabled: scope === 'global' || !!activeProject?.id,
    ...CACHE_PRESETS.brainInsights,
  });

  const insights = insightsQuery.data?.insights ?? [];
  const isLoading = insightsQuery.isLoading;

  // Subscribe to reflection completion events for auto-refresh
  useEffect(() => {
    const unsubscribe = subscribeToReflectionCompletion((_reflectionId, projectId, completionScope) => {
      // Refresh insights when a reflection completes for this project/scope
      if (scope === 'global' && completionScope === 'global') {
        invalidateInsights();
      } else if (scope === 'project' && completionScope === 'project' && projectId === activeProject?.id) {
        invalidateInsights();
      }
    });

    return unsubscribe;
  }, [scope, activeProject?.id, invalidateInsights]);

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
        // Optimistically remove from cache, then invalidate
        queryClient.setQueryData(
          brainKeys.insightsList(activeProject?.id ?? '', scope),
          (old: { success: boolean; insights: InsightWithMeta[] } | undefined) => {
            if (!old) return old;
            return {
              ...old,
              insights: old.insights.filter(i =>
                !(i.title === insight.title && i.reflection_id === insight.reflection_id)
              ),
            };
          }
        );
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
        invalidateInsights();
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

  // Single-pass computation: counts + filtered/sorted list
  const { conflictCount, autoPrunedCount, displayed } = useMemo(() => {
    let conflictCount = 0;
    let autoPrunedCount = 0;
    const filtered: InsightWithMeta[] = [];
    const searchTerm = debouncedSearch.trim().toLowerCase();

    for (const i of insights) {
      // Count in every iteration regardless of filters
      if (i.conflict_with && !i.conflict_resolved) conflictCount++;
      if (i.auto_pruned) autoPrunedCount++;

      // Type filter
      if (typeFilter === 'conflicts') {
        if (!(i.conflict_with && !i.conflict_resolved)) continue;
      } else if (typeFilter !== 'all') {
        if (i.type !== typeFilter) continue;
      }

      // Search filter
      if (searchTerm && !i.title.toLowerCase().includes(searchTerm) && !i.description.toLowerCase().includes(searchTerm)) {
        continue;
      }

      filtered.push(i);
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'confidence': cmp = a.confidence - b.confidence; break;
        case 'evidence': cmp = a.evidence.length - b.evidence.length; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return { conflictCount, autoPrunedCount, displayed: filtered };
  }, [insights, typeFilter, sortField, sortDir, debouncedSearch]);

  return (
    <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-amber-500/20">
      <div className="p-6">
        <BrainPanelHeader
          icon={Lightbulb}
          title="Learning Insights"
          accentColor={ACCENT_COLOR}
          glowColor={GLOW_COLOR}
          glow
          count={`${displayed.length}${typeFilter !== 'all' || debouncedSearch.trim() ? ` / ${insights.length}` : ''}`}
          right={
            <>
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none ${
                    typeFilter === 'conflicts'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-red-500/10 text-red-400/80 border border-red-500/20 hover:bg-red-500/15'
                  }`}
                  aria-label={`${typeFilter === 'conflicts' ? 'Show all insights' : 'Filter to conflicting insights'}`}
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
                  aria-label="Filter insight type"
                  className="rounded-lg text-xs text-zinc-300 px-3 py-1.5 outline-none font-mono focus-visible:ring-2 focus-visible:ring-purple-500/50"
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
                onClick={() => insightsQuery.refetch()}
                disabled={isLoading}
                className="p-2 rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none"
                style={{
                  background: 'rgba(39, 39, 42, 0.5)',
                  border: '1px solid rgba(63, 63, 70, 0.5)'
                }}
                aria-label="Refresh insights"
                title="Refresh insights"
              >
                <RefreshCw className={`w-4 h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </>
          }
        />

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
