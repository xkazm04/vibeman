'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  DbKnowledgeEntry,
  HubLinkedEntry,
  KnowledgeCategory,
  KnowledgeLayer,
  KnowledgeLanguage,
  CreateKnowledgeEntryInput,
} from '@/app/db/models/knowledge.types';

export interface KBStats {
  total: number;
  byDomain: Record<string, number>;
  avgConfidence: number;
}

/** Tree structure: language → layer → category → count */
export type KBTree = Record<string, Record<string, Record<string, number>>>;

export interface TreeSelection {
  language?: KnowledgeLanguage;
  layer?: KnowledgeLayer;
  category?: KnowledgeCategory;
}

interface UseKnowledgeBaseReturn {
  entries: DbKnowledgeEntry[];
  stats: KBStats | null;
  tree: KBTree | null;
  isLoading: boolean;
  error: string | null;
  selection: TreeSelection;
  setSelection: (sel: TreeSelection) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  breadcrumb: string[];
  fetchEntries: () => Promise<void>;
  fetchTree: () => Promise<void>;
  createEntry: (input: CreateKnowledgeEntryInput) => Promise<DbKnowledgeEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  recordFeedback: (entryId: string, helpful: boolean) => Promise<void>;
  exportEntries: (projectPath: string) => Promise<void>;
  // Hub (Map of Content) operations
  fetchHubLinks: (hubEntryId: string) => Promise<HubLinkedEntry[]>;
  addHubLink: (hubEntryId: string, linkedEntryId: string, note?: string) => Promise<boolean>;
  removeHubLink: (linkId: string) => Promise<boolean>;
  reorderHubLinks: (hubEntryId: string, linkIds: string[]) => Promise<boolean>;
}

export function useKnowledgeBase(): UseKnowledgeBaseReturn {
  const [entries, setEntries] = useState<DbKnowledgeEntry[]>([]);
  const [stats, setStats] = useState<KBStats | null>(null);
  const [tree, setTree] = useState<KBTree | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<TreeSelection>({});
  const [searchQuery, setSearchQuery] = useState('');

  const breadcrumb = useMemo(() => {
    const parts: string[] = [];
    if (selection.language) parts.push(selection.language);
    if (selection.layer) parts.push(selection.layer);
    if (selection.category) parts.push(selection.category);
    return parts;
  }, [selection]);

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge-base?action=tree');
      const json = await res.json();
      if (json.success) setTree(json.data);
    } catch (e) {
      console.error('[KB] Failed to fetch tree:', e);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge-base?action=stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (e) {
      console.error('[KB] Failed to fetch stats:', e);
    }
  }, []);

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ action: 'query', limit: '200' });
      if (selection.language) params.set('language', selection.language);
      if (selection.layer) params.set('layer', selection.layer);
      if (selection.category) params.set('domain', selection.category);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/knowledge-base?${params}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
      } else {
        setError(json.error || 'Failed to fetch entries');
      }
    } catch (e) {
      setError('Failed to fetch knowledge entries');
      console.error('[KB] Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selection, searchQuery]);

  const createEntry = useCallback(async (input: CreateKnowledgeEntryInput): Promise<DbKnowledgeEntry | null> => {
    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...input }),
      });
      const json = await res.json();
      if (json.success) {
        await Promise.all([fetchEntries(), fetchStats(), fetchTree()]);
        return json.data;
      }
      setError(json.error || 'Failed to create entry');
      return null;
    } catch (e) {
      setError('Failed to create entry');
      console.error('[KB] Create error:', e);
      return null;
    }
  }, [fetchEntries, fetchStats, fetchTree]);

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/knowledge-base?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setEntries(prev => prev.filter(e => e.id !== id));
        await Promise.all([fetchStats(), fetchTree()]);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[KB] Delete error:', e);
      return false;
    }
  }, [fetchStats, fetchTree]);

  const recordFeedback = useCallback(async (entryId: string, helpful: boolean) => {
    try {
      await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feedback', entryId, helpful }),
      });
      setEntries(prev => prev.map(e =>
        e.id === entryId
          ? { ...e, times_applied: e.times_applied + 1, times_helpful: e.times_helpful + (helpful ? 1 : 0) }
          : e
      ));
    } catch (e) {
      console.error('[KB] Feedback error:', e);
    }
  }, []);

  const exportEntries = useCallback(async (projectPath: string) => {
    try {
      await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', projectPath }),
      });
    } catch (e) {
      console.error('[KB] Export error:', e);
    }
  }, []);

  // ── Hub (Map of Content) operations ───────────────────────────────

  const fetchHubLinks = useCallback(async (hubEntryId: string): Promise<HubLinkedEntry[]> => {
    try {
      const res = await fetch(`/api/knowledge-base?action=hub-links&hubEntryId=${hubEntryId}`);
      const json = await res.json();
      if (json.success) return json.data;
      return [];
    } catch (e) {
      console.error('[KB] Failed to fetch hub links:', e);
      return [];
    }
  }, []);

  const addHubLink = useCallback(async (hubEntryId: string, linkedEntryId: string, note?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-hub-link', hubEntryId, linkedEntryId, note }),
      });
      const json = await res.json();
      return json.success;
    } catch (e) {
      console.error('[KB] Add hub link error:', e);
      return false;
    }
  }, []);

  const removeHubLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove-hub-link', linkId }),
      });
      const json = await res.json();
      return json.success;
    } catch (e) {
      console.error('[KB] Remove hub link error:', e);
      return false;
    }
  }, []);

  const reorderHubLinks = useCallback(async (hubEntryId: string, linkIds: string[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder-hub-links', hubEntryId, linkIds }),
      });
      const json = await res.json();
      return json.success;
    } catch (e) {
      console.error('[KB] Reorder hub links error:', e);
      return false;
    }
  }, []);

  // Debounce timer ref for search queries
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load (stats + tree + entries)
  useEffect(() => {
    fetchStats();
    fetchTree();
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStats, fetchTree]);

  // Refetch when selection/search changes (with 300ms debounce for search)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchEntries();
    }, searchQuery ? 300 : 0); // Immediate for selection changes, debounced for search
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [selection, searchQuery, fetchEntries]);

  return {
    entries, stats, tree, isLoading, error,
    selection, setSelection,
    searchQuery, setSearchQuery,
    breadcrumb,
    fetchEntries, fetchTree,
    createEntry, deleteEntry, recordFeedback, exportEntries,
    fetchHubLinks, addHubLink, removeHubLink, reorderHubLinks,
  };
}
