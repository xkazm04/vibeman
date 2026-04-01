'use client';

import { useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Plus, Search, Play, Save, Trash2, Pin, Copy,
  SortAsc, SortDesc, X,
  Lightbulb, Target, Layers, HelpCircle, Compass, BookOpen, Bug,
  Filter, Columns, Eye, EyeOff,
} from 'lucide-react';
import { transition, fadeSlideUp } from '@/lib/motion';
import ExpandChevron from '@/components/ui/ExpandChevron';
import { useViewsStore } from '@/stores/viewsStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useApplicationSession } from '@/lib/session';
import { formatDate } from '@/lib/formatDate';
import EmptyState from '@/components/ui/EmptyState';
import type { DbSavedView, ViewEntityType, ViewFilters } from '@/app/db/models/types';
import type { ViewResultRow } from '@/app/api/views/execute/route';

// ── Entity type configuration ───────────────────────────────────────────
const ENTITY_TYPE_CONFIG: Record<ViewEntityType, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  idea: { label: 'Ideas', icon: Lightbulb, color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
  goal: { label: 'Goals', icon: Target, color: 'text-green-400', bgColor: 'bg-green-500/15' },
  context: { label: 'Contexts', icon: Layers, color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  question: { label: 'Questions', icon: HelpCircle, color: 'text-purple-400', bgColor: 'bg-purple-500/15' },
  direction: { label: 'Directions', icon: Compass, color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
  knowledge_entry: { label: 'Knowledge', icon: BookOpen, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  tech_debt: { label: 'Tech Debt', icon: Bug, color: 'text-red-400', bgColor: 'bg-red-500/15' },
};

const ALL_ENTITY_TYPES = Object.keys(ENTITY_TYPE_CONFIG) as ViewEntityType[];
const ALL_COLUMNS = ['entity_type', 'title', 'status', 'category', 'effort', 'impact', 'context_name', 'description', 'created_at', 'updated_at'] as const;
const COLUMN_LABELS: Record<string, string> = {
  entity_type: 'Type', title: 'Title', status: 'Status', category: 'Category',
  effort: 'Effort', impact: 'Impact', context_name: 'Context', description: 'Description',
  created_at: 'Created', updated_at: 'Updated',
};
const SORT_FIELDS = ['title', 'status', 'created_at', 'updated_at', 'effort', 'impact', 'entity_type', 'category'];
const GROUP_FIELDS = ['entity_type', 'status', 'category'];

export default function ViewsLayout() {
  const { activeProject: sessionProject } = useApplicationSession();
  const legacyProject = useClientProjectStore((s) => s.activeProject);
  const activeProject = sessionProject ?? legacyProject;
  const projectId = activeProject?.id ?? null;

  const store = useViewsStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Fetch saved views
  const fetchViews = useCallback(async () => {
    if (!projectId) return;
    store.setLoading(true);
    try {
      const res = await fetch(`/api/views?projectId=${projectId}`);
      const json = await res.json();
      store.setViews(json.data ?? []);
    } catch { /* ignore */ }
    store.setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchViews(); }, [fetchViews]);

  // Execute the current query
  const executeQuery = useCallback(async () => {
    if (!projectId) return;
    store.setExecuting(true);
    try {
      const res = await fetch('/api/views/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          entity_types: store.queryEntityTypes,
          filters: store.queryFilters,
          sort_field: store.querySortField,
          sort_direction: store.querySortDirection,
          group_by: store.queryGroupBy,
          limit: 200,
        }),
      });
      const json = await res.json();
      store.setResults(json.data?.rows ?? [], json.data?.total ?? 0, json.data?.grouped ?? null);
    } catch { /* ignore */ }
    store.setExecuting(false);
  }, [projectId, store.queryEntityTypes, store.queryFilters, store.querySortField, store.querySortDirection, store.queryGroupBy]);

  // Auto-execute on mount or when query params change
  useEffect(() => {
    if (projectId) executeQuery();
  }, [executeQuery, projectId]);

  // Save current query as a view
  const saveView = useCallback(async () => {
    if (!projectId || !store.queryName.trim()) return;
    const payload = {
      projectId,
      name: store.queryName,
      entity_types: store.queryEntityTypes,
      filters: store.queryFilters,
      visible_columns: store.queryVisibleColumns,
      sort_field: store.querySortField,
      sort_direction: store.querySortDirection,
      group_by: store.queryGroupBy,
    };

    if (store.activeViewId) {
      await fetch('/api/views', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: store.activeViewId, ...payload }),
      });
    } else {
      await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    fetchViews();
  }, [projectId, store.activeViewId, store.queryName, store.queryEntityTypes, store.queryFilters, store.queryVisibleColumns, store.querySortField, store.querySortDirection, store.queryGroupBy, fetchViews]);

  const deleteView = useCallback(async (id: string) => {
    await fetch(`/api/views?id=${id}`, { method: 'DELETE' });
    if (store.activeViewId === id) store.resetQuery();
    fetchViews();
  }, [store.activeViewId, fetchViews]);

  const togglePin = useCallback(async (id: string) => {
    await fetch('/api/views', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pinned: !store.views.find(v => v.id === id)?.pinned }),
    });
    fetchViews();
  }, [store.views, fetchViews]);

  const duplicateView = useCallback(async (view: DbSavedView) => {
    const entityTypes = JSON.parse(view.entity_types) as ViewEntityType[];
    const filters = JSON.parse(view.filters) as ViewFilters;
    const visibleColumns = JSON.parse(view.visible_columns) as string[];
    await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: view.project_id,
        name: `${view.name} (copy)`,
        description: view.description,
        entity_types: entityTypes,
        filters,
        visible_columns: visibleColumns,
        sort_field: view.sort_field,
        sort_direction: view.sort_direction,
        group_by: view.group_by,
        icon: view.icon,
        color: view.color,
      }),
    });
    fetchViews();
  }, [fetchViews]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Status count summary
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of store.results) {
      counts[row.entity_type] = (counts[row.entity_type] || 0) + 1;
    }
    return counts;
  }, [store.results]);

  if (!projectId) {
    return (
      <div className="p-8">
        <EmptyState icon={LayoutGrid} title="Select a project" description="Choose a project to create cross-entity views" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden">
      {/* ── Sidebar: Saved Views + Query Builder ─────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={transition.deliberate}
            className="flex-shrink-0 border-r border-gray-700/40 bg-gray-900/60 backdrop-blur-sm overflow-hidden"
          >
            <div className="w-[320px] h-full flex flex-col overflow-y-auto">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-700/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Views</span>
                </div>
                <button
                  onClick={() => { store.resetQuery(); store.setEditMode(true); }}
                  className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-cyan-400 transition-colors"
                  title="New view"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Saved Views List */}
              <div className="px-3 py-2 space-y-1">
                {store.views.map((view) => (
                  <ViewListItem
                    key={view.id}
                    view={view}
                    isActive={store.activeViewId === view.id}
                    onSelect={() => { store.loadFromView(view); }}
                    onDelete={() => deleteView(view.id)}
                    onPin={() => togglePin(view.id)}
                    onDuplicate={() => duplicateView(view)}
                  />
                ))}
                {store.views.length === 0 && !store.loading && (
                  <p className="text-xs text-gray-500 px-2 py-4 text-center">
                    No saved views yet. Create one below.
                  </p>
                )}
              </div>

              {/* Query Builder */}
              <div className="border-t border-gray-700/40 px-3 py-3 space-y-3 flex-1">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Query Builder</div>

                {/* View Name */}
                <input
                  type="text"
                  value={store.queryName}
                  onChange={(e) => store.setQueryName(e.target.value)}
                  placeholder="View name..."
                  className="w-full px-2.5 py-1.5 text-sm rounded-md bg-gray-800/60 border border-gray-700/50 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-colors"
                />

                {/* Entity Type Toggles */}
                <div>
                  <div className="text-2xs text-gray-500 mb-1.5 px-0.5">Entity Types</div>
                  <div className="flex flex-wrap gap-1">
                    {ALL_ENTITY_TYPES.map((type) => {
                      const cfg = ENTITY_TYPE_CONFIG[type];
                      const Icon = cfg.icon;
                      const active = store.queryEntityTypes.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => store.toggleEntityType(type)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium transition-all ${
                            active
                              ? `${cfg.bgColor} ${cfg.color} ring-1 ring-current/30`
                              : 'bg-gray-800/40 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filters */}
                <QueryFilters filters={store.queryFilters} updateFilter={store.updateFilter} />

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-2xs text-gray-500 mb-1 px-0.5">Sort By</div>
                    <select
                      value={store.querySortField}
                      onChange={(e) => store.setQuerySortField(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 outline-none focus:border-cyan-500/50"
                    >
                      {SORT_FIELDS.map((f) => (
                        <option key={f} value={f}>{COLUMN_LABELS[f] || f}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => store.setQuerySortDirection(store.querySortDirection === 'asc' ? 'desc' : 'asc')}
                    className="mt-4 p-1.5 rounded bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-white transition-colors"
                  >
                    {store.querySortDirection === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Group By */}
                <div>
                  <div className="text-2xs text-gray-500 mb-1 px-0.5">Group By</div>
                  <select
                    value={store.queryGroupBy ?? ''}
                    onChange={(e) => store.setQueryGroupBy(e.target.value || null)}
                    className="w-full px-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 outline-none focus:border-cyan-500/50"
                  >
                    <option value="">None</option>
                    {GROUP_FIELDS.map((f) => (
                      <option key={f} value={f}>{COLUMN_LABELS[f] || f}</option>
                    ))}
                  </select>
                </div>

                {/* Visible Columns */}
                <ColumnVisibilityToggles
                  visibleColumns={store.queryVisibleColumns}
                  setVisibleColumns={store.setQueryVisibleColumns}
                />

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={executeQuery}
                    disabled={store.executing}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" />
                    Run
                  </button>
                  <button
                    onClick={saveView}
                    disabled={!store.queryName.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Toggle sidebar button */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-2 top-32 z-10 p-1.5 rounded-md bg-gray-800/80 border border-gray-700/50 text-gray-400 hover:text-white transition-colors"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      )}

      {/* ── Main Content: Results ──────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Results Header */}
        <div className="px-5 py-3 border-b border-gray-700/40 flex items-center justify-between bg-gray-900/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-medium text-white">
              {store.queryName || 'Untitled View'}
            </h2>
            <span className="text-xs text-gray-500">
              {store.resultTotal} result{store.resultTotal !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Type count badges */}
          <div className="flex items-center gap-1.5">
            {Object.entries(typeCounts).map(([type, count]) => {
              const cfg = ENTITY_TYPE_CONFIG[type as ViewEntityType];
              if (!cfg) return null;
              return (
                <span key={type} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs ${cfg.bgColor} ${cfg.color}`}>
                  {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 overflow-auto">
          {store.executing ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Search className="w-5 h-5 mr-2" />
              </motion.div>
              <span className="text-sm">Querying...</span>
            </div>
          ) : store.results.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={LayoutGrid}
                title="No results"
                description="Adjust entity types or filters in the query builder, then click Run"
              />
            </div>
          ) : store.resultGrouped ? (
            /* Grouped results */
            <div className="p-4 space-y-3">
              {Object.entries(store.resultGrouped).map(([groupKey, rows]) => {
                const collapsed = collapsedGroups.has(groupKey);
                return (
                  <div key={groupKey} className="rounded-lg border border-gray-700/40 overflow-hidden">
                    <button
                      onClick={() => toggleGroup(groupKey)}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-gray-800/40 text-sm text-gray-300 hover:bg-gray-800/60 transition-colors"
                    >
                      <ExpandChevron expanded={!collapsed} className="w-3.5 h-3.5 text-gray-500" />
                      <span className="font-medium text-white">{groupKey}</span>
                      <span className="text-xs text-gray-500">({rows.length})</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          transition={transition.expand}
                          className="overflow-hidden"
                        >
                          <ResultsTable rows={rows} visibleColumns={store.queryVisibleColumns} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Flat results */
            <ResultsTable rows={store.results} visibleColumns={store.queryVisibleColumns} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function ViewListItem({
  view,
  isActive,
  onSelect,
  onDelete,
  onPin,
  onDuplicate,
}: {
  view: DbSavedView;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: () => void;
  onDuplicate: () => void;
}) {
  const entityTypes = JSON.parse(view.entity_types) as ViewEntityType[];

  return (
    <motion.div
      layout
      className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-cyan-600/15 border border-cyan-500/30' : 'hover:bg-gray-800/50 border border-transparent'
      }`}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {view.pinned ? <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" /> : null}
          <span className={`text-sm truncate ${isActive ? 'text-cyan-300' : 'text-gray-300'}`}>
            {view.name}
          </span>
        </div>
        <div className="flex gap-0.5 mt-0.5">
          {entityTypes.slice(0, 4).map((type) => {
            const cfg = ENTITY_TYPE_CONFIG[type];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return <Icon key={type} className={`w-2.5 h-2.5 ${cfg.color} opacity-60`} />;
          })}
          {entityTypes.length > 4 && (
            <span className="text-2xs text-gray-500">+{entityTypes.length - 4}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          className="p-0.5 rounded hover:bg-gray-700/60 text-gray-500 hover:text-amber-400"
          title="Pin"
        >
          <Pin className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="p-0.5 rounded hover:bg-gray-700/60 text-gray-500 hover:text-cyan-400"
          title="Duplicate"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-0.5 rounded hover:bg-gray-700/60 text-gray-500 hover:text-red-400"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

function QueryFilters({ filters, updateFilter }: { filters: ViewFilters; updateFilter: <K extends keyof ViewFilters>(key: K, val: ViewFilters[K]) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-2xs text-gray-500 px-0.5">Filters</div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
        <input
          type="text"
          value={filters.searchQuery ?? ''}
          onChange={(e) => updateFilter('searchQuery', e.target.value || undefined)}
          placeholder="Search title/description..."
          className="w-full pl-7 pr-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 placeholder-gray-600 outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Status filter */}
      <div>
        <div className="text-2xs text-gray-600 mb-0.5 px-0.5">Statuses (comma-sep)</div>
        <input
          type="text"
          value={filters.statuses?.join(', ') ?? ''}
          onChange={(e) => {
            const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            updateFilter('statuses', val.length ? val : undefined);
          }}
          placeholder="e.g. pending, open"
          className="w-full px-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 placeholder-gray-600 outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Effort/Impact Range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-2xs text-gray-600 mb-0.5 px-0.5">Effort Min</div>
          <input
            type="number"
            min={1}
            max={10}
            value={filters.effortMin ?? ''}
            onChange={(e) => updateFilter('effortMin', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <div className="text-2xs text-gray-600 mb-0.5 px-0.5">Effort Max</div>
          <input
            type="number"
            min={1}
            max={10}
            value={filters.effortMax ?? ''}
            onChange={(e) => updateFilter('effortMax', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <div className="text-2xs text-gray-600 mb-0.5 px-0.5">Impact Min</div>
          <input
            type="number"
            min={1}
            max={10}
            value={filters.impactMin ?? ''}
            onChange={(e) => updateFilter('impactMin', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <div className="text-2xs text-gray-600 mb-0.5 px-0.5">Impact Max</div>
          <input
            type="number"
            min={1}
            max={10}
            value={filters.impactMax ?? ''}
            onChange={(e) => updateFilter('impactMax', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-2xs text-gray-600 mb-0.5 px-0.5">From</div>
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
            className="w-full px-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <div className="text-2xs text-gray-600 mb-0.5 px-0.5">To</div>
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
            className="w-full px-2 py-1 text-xs rounded bg-gray-800/60 border border-gray-700/50 text-gray-300 outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>
    </div>
  );
}

function ResultsTable({ rows, visibleColumns }: { rows: ViewResultRow[]; visibleColumns: string[] }) {
  const cols = visibleColumns.length ? visibleColumns : ALL_COLUMNS.slice();

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700/50 bg-gray-900/50">
            {cols.map((col) => (
              <th
                key={col}
                className="py-2 px-3 text-2xs font-semibold text-gray-400 uppercase tracking-wider text-left"
              >
                {COLUMN_LABELS[col] || col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <motion.tr
              key={`${row.entity_type}-${row.id}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(idx * 0.015, 0.3) }}
              className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors"
            >
              {cols.map((col) => (
                <td key={col} className="py-2 px-3 text-xs text-gray-300">
                  <CellRenderer row={row} column={col} />
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellRenderer({ row, column }: { row: ViewResultRow; column: string }) {
  switch (column) {
    case 'entity_type': {
      const cfg = ENTITY_TYPE_CONFIG[row.entity_type];
      if (!cfg) return <span>{row.entity_type}</span>;
      const Icon = cfg.icon;
      return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${cfg.bgColor} ${cfg.color} text-2xs font-medium`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      );
    }
    case 'title':
      return <span className="text-white font-medium">{row.title}</span>;
    case 'status':
      return row.status ? (
        <span className={`px-1.5 py-0.5 rounded text-2xs font-medium ${getStatusColor(row.status)}`}>
          {row.status}
        </span>
      ) : <span className="text-gray-600">-</span>;
    case 'category':
      return row.category ? (
        <span className="text-gray-400">{row.category}</span>
      ) : <span className="text-gray-600">-</span>;
    case 'effort':
      return row.effort != null ? (
        <span className="tabular-nums">{row.effort}/10</span>
      ) : <span className="text-gray-600">-</span>;
    case 'impact':
      return row.impact != null ? (
        <span className="tabular-nums">{row.impact}/10</span>
      ) : <span className="text-gray-600">-</span>;
    case 'context_name':
      return row.context_name ? (
        <span className="text-blue-400/80">{row.context_name}</span>
      ) : <span className="text-gray-600">-</span>;
    case 'description':
      return row.description ? (
        <span className="text-gray-400 max-w-[240px] truncate block" title={row.description}>
          {row.description.length > 80 ? row.description.slice(0, 80) + '...' : row.description}
        </span>
      ) : <span className="text-gray-600">-</span>;
    case 'created_at':
    case 'updated_at': {
      const val = column === 'created_at' ? row.created_at : row.updated_at;
      return <span className="text-gray-500 tabular-nums">{formatDate(val)}</span>;
    }
    default:
      return <span>{String((row as unknown as Record<string, unknown>)[column] ?? '-')}</span>;
  }
}

function ColumnVisibilityToggles({
  visibleColumns,
  setVisibleColumns,
}: {
  visibleColumns: string[];
  setVisibleColumns: (cols: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = (col: string) => {
    if (visibleColumns.includes(col)) {
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter(c => c !== col));
      }
    } else {
      setVisibleColumns([...visibleColumns, col]);
    }
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-2xs text-gray-500 hover:text-gray-300 transition-colors px-0.5 mb-1"
      >
        <Columns className="w-3 h-3" />
        <span>Columns ({visibleColumns.length}/{ALL_COLUMNS.length})</span>
        <ExpandChevron expanded={expanded} className="w-3 h-3 text-gray-500" />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1 pb-1">
              {ALL_COLUMNS.map((col) => {
                const active = visibleColumns.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => toggle(col)}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs transition-all ${
                      active
                        ? 'bg-gray-700/60 text-gray-200 ring-1 ring-gray-600/50'
                        : 'bg-gray-800/30 text-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {active ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                    {COLUMN_LABELS[col] || col}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'done': case 'implemented': case 'accepted': case 'resolved': case 'active': return 'bg-green-500/15 text-green-400';
    case 'open': case 'pending': case 'detected': case 'queued': return 'bg-amber-500/15 text-amber-400';
    case 'in_progress': case 'processing': case 'planned': case 'acknowledged': return 'bg-blue-500/15 text-blue-400';
    case 'rejected': case 'dismissed': case 'failed': return 'bg-red-500/15 text-red-400';
    case 'answered': return 'bg-cyan-500/15 text-cyan-400';
    default: return 'bg-gray-500/15 text-gray-400';
  }
}

