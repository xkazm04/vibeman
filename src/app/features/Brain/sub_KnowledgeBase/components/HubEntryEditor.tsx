'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, GripVertical, Trash2, Map, Plus, ExternalLink,
  BookOpen, FileText,
} from 'lucide-react';
import type { DbKnowledgeEntry, HubLinkedEntry } from '@/app/db/models/knowledge.types';
import { KNOWLEDGE_CATEGORY_LABELS, KNOWLEDGE_LAYER_LABELS } from '@/app/db/models/knowledge.types';
import type { KnowledgeCategory, KnowledgeLayer } from '@/app/db/models/knowledge.types';
import { fadeOnly } from '@/lib/motion';
import { fullDrawer, fullDrawerTransition } from '../../lib/motionPresets';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import ConfidenceBar from './ConfidenceBar';

const PATTERN_TYPE_STYLES: Record<string, { label: string; cls: string }> = {
  best_practice: { label: 'BP', cls: 'bg-emerald-500/15 text-emerald-400' },
  anti_pattern:  { label: 'AP', cls: 'bg-red-500/15 text-red-400' },
  convention:    { label: 'CV', cls: 'bg-blue-500/15 text-blue-400' },
  gotcha:        { label: 'GT', cls: 'bg-amber-500/15 text-amber-400' },
  optimization:  { label: 'OP', cls: 'bg-cyan-500/15 text-cyan-400' },
  hub:           { label: 'HB', cls: 'bg-purple-500/15 text-purple-400' },
};

interface HubEntryEditorProps {
  entry: DbKnowledgeEntry;
  onClose: () => void;
  onSelectEntry: (entry: DbKnowledgeEntry) => void;
  fetchHubLinks: (hubEntryId: string) => Promise<HubLinkedEntry[]>;
  addHubLink: (hubEntryId: string, linkedEntryId: string) => Promise<boolean>;
  removeHubLink: (linkId: string) => Promise<boolean>;
  reorderHubLinks: (hubEntryId: string, linkIds: string[]) => Promise<boolean>;
  searchEntries: (query: string) => Promise<DbKnowledgeEntry[]>;
}

export default function HubEntryEditor({
  entry,
  onClose,
  onSelectEntry,
  fetchHubLinks,
  addHubLink,
  removeHubLink,
  reorderHubLinks,
  searchEntries,
}: HubEntryEditorProps) {
  const prefersReduced = useReducedMotion();
  const [links, setLinks] = useState<HubLinkedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DbKnowledgeEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Load hub links
  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchHubLinks(entry.id);
    setLinks(data);
    setIsLoading(false);
  }, [entry.id, fetchHubLinks]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchEntries(searchQuery);
      // Filter out entries already linked and the hub itself
      const linkedIds = new Set(links.map(l => l.linked_entry_id));
      linkedIds.add(entry.id);
      setSearchResults(results.filter(e => !linkedIds.has(e.id) && e.pattern_type !== 'hub'));
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, links, entry.id, searchEntries]);

  // Focus search input when search panel opens
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showSearch]);

  const handleAddLink = async (linkedEntry: DbKnowledgeEntry) => {
    const success = await addHubLink(entry.id, linkedEntry.id);
    if (success) {
      await loadLinks();
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    const success = await removeHubLink(linkId);
    if (success) {
      setLinks(prev => prev.filter(l => l.id !== linkId));
    }
  };

  // Native drag-and-drop handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const reordered = [...links];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    setLinks(reordered);
    dragItem.current = null;
    dragOverItem.current = null;

    await reorderHubLinks(entry.id, reordered.map(l => l.id));
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showSearch) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        onClose();
      }
    }
  }, [onClose, showSearch]);

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          variants={fadeOnly}
          initial={prefersReduced ? false : 'hidden'}
          animate="visible"
          exit="exit"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Hub editor: ${entry.title}`}
          onKeyDown={handleKeyDown}
          variants={fullDrawer}
          initial={prefersReduced ? false : 'initial'}
          animate="animate"
          exit="exit"
          transition={fullDrawerTransition}
          className="fixed right-0 top-0 bottom-0 w-full max-w-xl z-50 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800/50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-zinc-800/50 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 bg-purple-500/10">
                  <Map className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-zinc-100 truncate">{entry.title}</h2>
                  <p className="text-xs text-zinc-500">
                    Map of Content
                    <span className="mx-1.5">·</span>
                    {KNOWLEDGE_LAYER_LABELS[entry.layer as KnowledgeLayer] ?? entry.layer}
                    <span className="mx-1">{'>'}</span>
                    {KNOWLEDGE_CATEGORY_LABELS[entry.domain as KnowledgeCategory] ?? entry.domain}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close hub editor"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            {entry.pattern && (
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{entry.pattern}</p>
            )}

            {/* Actions bar */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showSearch
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-zinc-400 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Entry
              </button>
              <span className="text-2xs text-zinc-600 tabular-nums ml-auto">
                {links.length} {links.length === 1 ? 'entry' : 'entries'} linked
              </span>
            </div>
          </div>

          {/* Inline search panel */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 border-b border-zinc-800/50 overflow-hidden"
              >
                <div className="px-6 py-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search entries to add..."
                      className="w-full pl-8 pr-8 py-2 rounded-lg bg-zinc-950/50 border border-zinc-800/50 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Search results */}
                  {isSearching && (
                    <p className="text-2xs text-zinc-500 px-1">Searching...</p>
                  )}
                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {searchResults.map(result => {
                        const pt = PATTERN_TYPE_STYLES[result.pattern_type] ?? PATTERN_TYPE_STYLES.convention;
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleAddLink(result)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-zinc-800/50 transition-colors group"
                          >
                            <span className={`px-1 py-0.5 text-2xs font-mono font-medium rounded flex-shrink-0 ${pt.cls}`}>
                              {pt.label}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-zinc-300 truncate group-hover:text-white">{result.title}</p>
                              <p className="text-2xs text-zinc-600 truncate">{result.pattern}</p>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-zinc-600 group-hover:text-purple-400 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {searchQuery && !isSearching && searchResults.length === 0 && (
                    <p className="text-2xs text-zinc-500 px-1">No matching entries found.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Linked entries list */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-lg bg-zinc-800/30 animate-pulse" />
                ))}
              </div>
            ) : links.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="w-10 h-10 text-zinc-700 mb-3" />
                <p className="text-sm text-zinc-400 font-medium mb-1">No linked entries yet</p>
                <p className="text-xs text-zinc-600 max-w-xs">
                  Click "Add Entry" above to search and link knowledge entries to this hub.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {links.map((link, index) => {
                  const e = link.entry;
                  const pt = PATTERN_TYPE_STYLES[e.pattern_type] ?? PATTERN_TYPE_STYLES.convention;

                  return (
                    <div
                      key={link.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={ev => ev.preventDefault()}
                      className="group flex items-start gap-2 p-3 rounded-lg bg-zinc-800/20 border border-zinc-800/40 hover:border-zinc-700/50 hover:bg-zinc-800/30 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      {/* Drag handle */}
                      <div className="flex-shrink-0 pt-0.5 text-zinc-700 group-hover:text-zinc-500 transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Entry content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1 py-0.5 text-2xs font-mono font-medium rounded flex-shrink-0 ${pt.cls}`}>
                            {pt.label}
                          </span>
                          <span className="text-xs font-medium text-zinc-200 truncate">{e.title}</span>
                        </div>
                        <p className="text-2xs text-zinc-500 line-clamp-2 leading-relaxed">{e.pattern}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-2xs text-zinc-600">
                            {KNOWLEDGE_CATEGORY_LABELS[e.domain as KnowledgeCategory] ?? e.domain}
                          </span>
                          <ConfidenceBar value={e.confidence} size="sm" />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); onSelectEntry(e); }}
                          title="View entry details"
                          className="p-1 rounded text-zinc-600 hover:text-cyan-400 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); handleRemoveLink(link.id); }}
                          title="Remove from hub"
                          className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
