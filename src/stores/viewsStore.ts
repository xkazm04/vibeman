/**
 * Views Store
 * Client state for cross-entity queryable views (Bases-style)
 */

import { create } from 'zustand';
import type { DbSavedView, ViewEntityType, ViewFilters } from '@/app/db/models/types';
import type { ViewResultRow } from '@/app/api/views/execute/route';

interface ViewsState {
  // Saved views list
  views: DbSavedView[];
  loading: boolean;

  // Active view editing state
  activeViewId: string | null;
  editMode: boolean;

  // Query builder state (for new/editing views)
  queryEntityTypes: ViewEntityType[];
  queryFilters: ViewFilters;
  queryVisibleColumns: string[];
  querySortField: string;
  querySortDirection: 'asc' | 'desc';
  queryGroupBy: string | null;
  queryName: string;

  // Execution results
  results: ViewResultRow[];
  resultTotal: number;
  resultGrouped: Record<string, ViewResultRow[]> | null;
  executing: boolean;

  // Actions
  setViews: (views: DbSavedView[]) => void;
  setLoading: (loading: boolean) => void;
  setActiveViewId: (id: string | null) => void;
  setEditMode: (editMode: boolean) => void;
  setQueryEntityTypes: (types: ViewEntityType[]) => void;
  toggleEntityType: (type: ViewEntityType) => void;
  setQueryFilters: (filters: ViewFilters) => void;
  updateFilter: <K extends keyof ViewFilters>(key: K, value: ViewFilters[K]) => void;
  setQueryVisibleColumns: (columns: string[]) => void;
  setQuerySortField: (field: string) => void;
  setQuerySortDirection: (dir: 'asc' | 'desc') => void;
  setQueryGroupBy: (field: string | null) => void;
  setQueryName: (name: string) => void;
  setResults: (rows: ViewResultRow[], total: number, grouped: Record<string, ViewResultRow[]> | null) => void;
  setExecuting: (executing: boolean) => void;
  loadFromView: (view: DbSavedView) => void;
  resetQuery: () => void;
}

const DEFAULT_ENTITY_TYPES: ViewEntityType[] = ['idea', 'goal', 'context'];
const DEFAULT_COLUMNS = ['entity_type', 'title', 'status', 'category', 'effort', 'impact', 'created_at'];

export const useViewsStore = create<ViewsState>()((set, get) => ({
  views: [],
  loading: false,
  activeViewId: null,
  editMode: false,

  queryEntityTypes: DEFAULT_ENTITY_TYPES,
  queryFilters: {},
  queryVisibleColumns: DEFAULT_COLUMNS,
  querySortField: 'created_at',
  querySortDirection: 'desc',
  queryGroupBy: null,
  queryName: '',

  results: [],
  resultTotal: 0,
  resultGrouped: null,
  executing: false,

  setViews: (views) => set({ views }),
  setLoading: (loading) => set({ loading }),
  setActiveViewId: (id) => set({ activeViewId: id }),
  setEditMode: (editMode) => set({ editMode }),

  setQueryEntityTypes: (types) => set({ queryEntityTypes: types }),
  toggleEntityType: (type) => {
    const current = get().queryEntityTypes;
    if (current.includes(type)) {
      if (current.length > 1) set({ queryEntityTypes: current.filter(t => t !== type) });
    } else {
      set({ queryEntityTypes: [...current, type] });
    }
  },

  setQueryFilters: (filters) => set({ queryFilters: filters }),
  updateFilter: (key, value) => set((s) => ({
    queryFilters: { ...s.queryFilters, [key]: value },
  })),

  setQueryVisibleColumns: (columns) => set({ queryVisibleColumns: columns }),
  setQuerySortField: (field) => set({ querySortField: field }),
  setQuerySortDirection: (dir) => set({ querySortDirection: dir }),
  setQueryGroupBy: (field) => set({ queryGroupBy: field }),
  setQueryName: (name) => set({ queryName: name }),

  setResults: (rows, total, grouped) => set({ results: rows, resultTotal: total, resultGrouped: grouped }),
  setExecuting: (executing) => set({ executing }),

  loadFromView: (view) => {
    const entityTypes = JSON.parse(view.entity_types) as ViewEntityType[];
    const filters = JSON.parse(view.filters) as ViewFilters;
    const visibleColumns = JSON.parse(view.visible_columns) as string[];

    set({
      activeViewId: view.id,
      editMode: false,
      queryEntityTypes: entityTypes.length ? entityTypes : DEFAULT_ENTITY_TYPES,
      queryFilters: filters,
      queryVisibleColumns: visibleColumns.length ? visibleColumns : DEFAULT_COLUMNS,
      querySortField: view.sort_field || 'created_at',
      querySortDirection: view.sort_direction || 'desc',
      queryGroupBy: view.group_by || null,
      queryName: view.name,
    });
  },

  resetQuery: () => set({
    activeViewId: null,
    editMode: false,
    queryEntityTypes: DEFAULT_ENTITY_TYPES,
    queryFilters: {},
    queryVisibleColumns: DEFAULT_COLUMNS,
    querySortField: 'created_at',
    querySortDirection: 'desc',
    queryGroupBy: null,
    queryName: '',
    results: [],
    resultTotal: 0,
    resultGrouped: null,
  }),
}));
