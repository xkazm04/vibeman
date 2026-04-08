'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Lightbulb, Filter, RefreshCw, AlertOctagon, Search, Zap, Sparkles, Tag, X, Bookmark, BookmarkPlus, Share2, RotateCcw, Trash2, LayoutGrid, GitFork } from 'lucide-react';
import { toast } from '@/stores/messageStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BrainPanelHeader from './BrainPanelHeader';
import BrainEmptyState from './BrainEmptyState';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import dynamic from 'next/dynamic';
import { InsightsTable } from './InsightsTable';
import type { InsightWithMeta, InsightType, SortField, SortDir } from './InsightsTable';

const CausalInsightGraph = dynamic(() => import('./CausalInsightGraph'), { ssr: false });
import InsightLineageDrawer from './InsightLineageDrawer';
import GlowCard from './GlowCard';
import { useReflectionTrigger } from '@/hooks/useReflectionTrigger';
import { brainKeys, useInvalidateBrain, useReflectionRevalidation, useProjectTags, useUpsertAnnotation } from '../lib/queries';
import { CACHE_PRESETS } from '@/lib/cache/cache-config';
import { BRAIN_CHART } from '../lib/brainChartColors';
import { useInsightFilterViews } from '../lib/useInsightFilterViews';

interface Props {
  scope?: 'project' | 'global';
}

const ACCENT_COLOR = BRAIN_CHART.panel.insights;
const GLOW_COLOR = BRAIN_CHART.panel.insightsGlow;

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
          <path key={i} d={p.d} stroke={BRAIN_CHART.brand.accent} strokeWidth="1.2" strokeLinecap="round" opacity={p.peakOpacity} />
        ) : (
          <motion.path
            key={i} d={p.d} stroke={BRAIN_CHART.brand.accent} strokeWidth="1.2" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1, 0], opacity: [0, p.peakOpacity, p.peakOpacity, 0] }}
            transition={{ duration: 3, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}
      {/* Neural nodes */}
      {nodes.map(([cx, cy], i) =>
        reducedMotion ? (
          <circle key={i} cx={cx} cy={cy} r="1.5" fill={i < 3 ? ACCENT_COLOR : i < 6 ? BRAIN_CHART.brand.accent : BRAIN_CHART.positive} opacity="0.8" />
        ) : (
          <motion.circle
            key={i} cx={cx} cy={cy} r="1.5"
            fill={i < 3 ? ACCENT_COLOR : i < 6 ? BRAIN_CHART.brand.accent : BRAIN_CHART.positive}
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
    <div className="py-8 flex justify-center">
      <BrainEmptyState
        icon={<Lightbulb className="w-10 h-10 text-zinc-600" />}
        title="No Learning Insights Yet"
        description="Insights are patterns, preferences, and recommendations discovered when the Brain reflects on your development decisions."
        action={
          scope === 'project' && activeProject?.id ? (
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
          ) : undefined
        }
      />
    </div>
  );
}

export default function InsightsPanel({ scope = 'project' }: Props) {
  const {
    filters,
    updateFilters,
    resetFilters,
    allViews,
    activeViewId,
    applyView,
    saveCurrentView,
    deleteView,
    getShareableUrl,
    hasActiveFilters,
  } = useInsightFilterViews();

  const { typeFilter, sortField, sortDir, searchQuery, tagFilter } = filters;

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const [lineageTarget, setLineageTarget] = useState<{ id: string; title: string } | null>(null);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [savingView, setSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateFilters({ searchQuery: value });
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, [updateFilters]);

  // Sync debouncedSearch when searchQuery changes from view application
  useEffect(() => {
    if (searchQuery !== debouncedSearch) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    }
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

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
  useReflectionRevalidation(scope, activeProject?.id, invalidateInsights);

  // Tags for filter chips
  const tagsQuery = useProjectTags(activeProject?.id, scope);
  const availableTags = tagsQuery.data?.tags ?? [];

  // Annotation mutation
  const upsertMutation = useUpsertAnnotation(activeProject?.id, scope);
  const handleSaveAnnotation = useCallback((insightId: string, note: string | null, tags: string[]) => {
    upsertMutation.mutate({ insightId, note, tags });
  }, [upsertMutation]);

  // Track pending undo-able deletions so we can cancel them
  const pendingDeleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleDelete = useCallback((insight: InsightWithMeta) => {
    const deleteKey = `${insight.reflection_id}::${insight.title}`;

    // If there's already a pending delete for this insight, skip
    if (pendingDeleteTimers.current.has(deleteKey)) return;

    // Optimistically remove from cache immediately
    const cacheKey = brainKeys.insightsList(activeProject?.id ?? '', scope);
    queryClient.setQueryData(
      cacheKey,
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

    // Schedule the actual DELETE after 5 seconds
    const timer = setTimeout(async () => {
      pendingDeleteTimers.current.delete(deleteKey);
      try {
        await fetch('/api/brain/insights', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reflectionId: insight.reflection_id,
            insightTitle: insight.title,
          }),
        });
      } catch (err) {
        console.error('Failed to delete insight:', err);
        // Restore on failure by refetching
        invalidateInsights();
      }
    }, 5000);

    pendingDeleteTimers.current.set(deleteKey, timer);

    // Show undo toast
    toast.custom({
      type: 'warning',
      title: 'Insight deleted',
      message: insight.title,
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          // Cancel the pending DELETE
          const t = pendingDeleteTimers.current.get(deleteKey);
          if (t) {
            clearTimeout(t);
            pendingDeleteTimers.current.delete(deleteKey);
          }
          // Restore the insight in cache
          queryClient.setQueryData(
            cacheKey,
            (old: { success: boolean; insights: InsightWithMeta[] } | undefined) => {
              if (!old) return old;
              return { ...old, insights: [...old.insights, insight] };
            }
          );
        },
      },
    });
  }, [activeProject?.id, scope, queryClient, invalidateInsights]);

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
      updateFilters({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      updateFilters({ sortField: field, sortDir: 'desc' });
    }
  };

  // Close view menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setShowViewMenu(false);
        setSavingView(false);
      }
    };
    if (showViewMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showViewMenu]);

  const handleSaveView = () => {
    const name = newViewName.trim();
    if (!name) return;
    saveCurrentView(name);
    setNewViewName('');
    setSavingView(false);
  };

  const handleCopyShareUrl = () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url);
    toast.success('URL copied', 'Shareable filter URL copied to clipboard');
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

      // Tag filter
      if (tagFilter && !(i.annotation?.tags ?? []).includes(tagFilter)) {
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
  }, [insights, typeFilter, sortField, sortDir, debouncedSearch, tagFilter]);

  return (
    <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-amber-500/20">
      <div className="p-6">
        <BrainPanelHeader
          icon={Lightbulb}
          title="Learning Insights"
          accentColor={ACCENT_COLOR}
          glowColor={GLOW_COLOR}
          glow
          count={`${displayed.length}${typeFilter !== 'all' || debouncedSearch.trim() || tagFilter ? ` / ${insights.length}` : ''}`}
          right={
            <>
              {/* Saved Views */}
              <div className="relative" ref={viewMenuRef}>
                <button
                  onClick={() => setShowViewMenu(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all focus-visible:ring-2 focus-visible:ring-amber-500/40 outline-none ${
                    activeViewId
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-zinc-400 border border-zinc-700/40 hover:bg-zinc-800/60 hover:text-zinc-300'
                  }`}
                  style={{ background: activeViewId ? undefined : 'rgba(39, 39, 42, 0.5)' }}
                  aria-label="Saved filter views"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {activeViewId ? allViews.find(v => v.id === activeViewId)?.name ?? 'View' : 'Views'}
                  </span>
                </button>

                {showViewMenu && (
                  <div
                    className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-lg border border-zinc-700/50 bg-zinc-900/95 backdrop-blur-sm shadow-xl font-mono"
                  >
                    {/* Preset views */}
                    <div className="px-2 pt-2 pb-1">
                      <span className="text-2xs text-zinc-600 uppercase tracking-wider px-1">Presets</span>
                    </div>
                    {allViews.filter(v => v.isPreset).map(view => (
                      <button
                        key={view.id}
                        onClick={() => { applyView(view.id); setShowViewMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-zinc-800/80 flex items-center gap-2 ${
                          activeViewId === view.id ? 'text-amber-300 bg-amber-500/10' : 'text-zinc-300'
                        }`}
                      >
                        <Bookmark className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{view.name}</span>
                      </button>
                    ))}

                    {/* User saved views */}
                    {allViews.some(v => !v.isPreset) && (
                      <>
                        <div className="border-t border-zinc-800/60 mx-2 my-1" />
                        <div className="px-2 pb-1">
                          <span className="text-2xs text-zinc-600 uppercase tracking-wider px-1">Saved</span>
                        </div>
                        {allViews.filter(v => !v.isPreset).map(view => (
                          <div
                            key={view.id}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-800/80 ${
                              activeViewId === view.id ? 'text-amber-300 bg-amber-500/10' : 'text-zinc-300'
                            }`}
                          >
                            <button
                              onClick={() => { applyView(view.id); setShowViewMenu(false); }}
                              className="flex-1 text-left truncate flex items-center gap-2"
                            >
                              <Bookmark className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{view.name}</span>
                            </button>
                            <button
                              onClick={() => deleteView(view.id)}
                              className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                              aria-label={`Delete view: ${view.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Actions */}
                    <div className="border-t border-zinc-800/60 mx-2 my-1" />
                    {savingView ? (
                      <div className="px-3 py-2 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newViewName}
                          onChange={e => setNewViewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveView(); if (e.key === 'Escape') setSavingView(false); }}
                          placeholder="View name..."
                          className="flex-1 rounded text-xs text-zinc-300 px-2 py-1 outline-none font-mono bg-zinc-800/80 border border-zinc-700/50 focus:ring-1 focus:ring-amber-500/40"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveView}
                          disabled={!newViewName.trim()}
                          className="px-2 py-1 text-2xs text-amber-300 hover:bg-amber-500/15 rounded transition-colors disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="px-1 py-1 flex flex-col gap-0.5">
                        {hasActiveFilters && (
                          <button
                            onClick={() => setSavingView(true)}
                            className="w-full text-left px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors flex items-center gap-2"
                          >
                            <BookmarkPlus className="w-3 h-3" />
                            Save current filters
                          </button>
                        )}
                        {hasActiveFilters && (
                          <button
                            onClick={handleCopyShareUrl}
                            className="w-full text-left px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors flex items-center gap-2"
                          >
                            <Share2 className="w-3 h-3" />
                            Copy shareable URL
                          </button>
                        )}
                        {hasActiveFilters && (
                          <button
                            onClick={() => { resetFilters(); setShowViewMenu(false); }}
                            className="w-full text-left px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors flex items-center gap-2"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* View mode toggle */}
              <div className="flex items-center rounded-lg overflow-hidden border border-zinc-700/40" style={{ background: 'rgba(39, 39, 42, 0.5)' }}>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-amber-500/15 text-amber-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                  aria-label="Table view"
                  title="Table view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  className={`p-1.5 transition-colors ${viewMode === 'graph' ? 'bg-amber-500/15 text-amber-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                  aria-label="Causal graph view"
                  title="Causal graph view"
                >
                  <GitFork className="w-3.5 h-3.5" />
                </button>
              </div>

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

              {/* Tag filter chips */}
              {availableTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3 h-3 text-zinc-500 shrink-0" />
                  {availableTags.slice(0, 8).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => updateFilters({ tagFilter: tagFilter === tag ? null : tag })}
                      className={`px-2 py-0.5 rounded-full text-2xs font-mono transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 outline-none ${
                        tagFilter === tag
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                          : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:bg-zinc-700/60 hover:text-zinc-300'
                      }`}
                      aria-label={`${tagFilter === tag ? 'Remove' : 'Filter by'} tag: ${tag}`}
                    >
                      {tag}
                      {tagFilter === tag && <X className="w-2.5 h-2.5 ml-1 inline" />}
                    </button>
                  ))}
                </div>
              )}

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
                  onClick={() => updateFilters({ typeFilter: typeFilter === 'conflicts' ? 'all' : 'conflicts' })}
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
                  onChange={(e) => updateFilters({ typeFilter: e.target.value as InsightType | 'all' | 'conflicts' })}
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
        ) : viewMode === 'graph' ? (
          <CausalInsightGraph
            insights={displayed}
            onViewLineage={(insight) => setLineageTarget({ id: insight.id, title: insight.title })}
          />
        ) : (
          <InsightsTable
            insights={displayed}
            scope={scope}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onDelete={handleDelete}
            onResolveConflict={handleResolveConflict}
            onViewLineage={(insight) => setLineageTarget({ id: insight.id, title: insight.title })}
            onSaveAnnotation={handleSaveAnnotation}
            projectNameMap={projectNameMap}
          />
        )}
      </div>

      <InsightLineageDrawer
        insightId={lineageTarget?.id ?? null}
        insightTitle={lineageTarget?.title}
        onClose={() => setLineageTarget(null)}
      />
    </GlowCard>
  );
}
