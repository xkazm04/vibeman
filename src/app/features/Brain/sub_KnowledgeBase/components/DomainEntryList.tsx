'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, X, Filter } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DbKnowledgeEntry, KnowledgeDomain, KnowledgePatternType } from '@/app/db/models/knowledge.types';
import { KNOWLEDGE_DOMAIN_LABELS } from '@/app/db/models/knowledge.types';
import { transition } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SimpleSpinner } from '@/components/ui';
import EntryCard from './EntryCard';

type SortField = 'confidence' | 'created_at' | 'times_applied' | 'title';

interface DomainEntryListProps {
  entries: DbKnowledgeEntry[];
  selectedDomain: KnowledgeDomain | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectEntry: (entry: DbKnowledgeEntry) => void;
  isLoading: boolean;
}

const PATTERN_FILTERS: { value: KnowledgePatternType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'best_practice', label: 'Best Practices' },
  { value: 'anti_pattern', label: 'Anti-Patterns' },
  { value: 'convention', label: 'Conventions' },
  { value: 'gotcha', label: 'Gotchas' },
  { value: 'optimization', label: 'Optimizations' },
];

export default function DomainEntryList({
  entries,
  selectedDomain,
  searchQuery,
  onSearchChange,
  onSelectEntry,
  isLoading,
}: DomainEntryListProps) {
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [patternFilter, setPatternFilter] = useState<KnowledgePatternType | 'all'>('all');
  const prefersReduced = useReducedMotion();

  const filtered = useMemo(() => {
    let result = [...entries];
    if (selectedDomain) {
      result = result.filter(e => e.domain === selectedDomain);
    }
    if (patternFilter !== 'all') {
      result = result.filter(e => e.pattern_type === patternFilter);
    }
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [entries, selectedDomain, patternFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const title = selectedDomain
    ? KNOWLEDGE_DOMAIN_LABELS[selectedDomain]
    : 'All Entries';

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.deliberate}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200">
          {title}
          <span className="ml-2 text-2xs text-zinc-500 font-normal">
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleSort('confidence')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-2xs transition-colors ${
              sortField === 'confidence' ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ArrowUpDown className="w-3 h-3" />
            Confidence
          </button>
          <button
            onClick={() => toggleSort('created_at')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-2xs transition-colors ${
              sortField === 'created_at' ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ArrowUpDown className="w-3 h-3" />
            Recent
          </button>
          <button
            onClick={() => toggleSort('times_applied')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-2xs transition-colors ${
              sortField === 'times_applied' ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ArrowUpDown className="w-3 h-3" />
            Usage
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search patterns..."
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Pattern type filters */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto">
        <Filter className="w-3 h-3 text-zinc-500 flex-shrink-0" />
        {PATTERN_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setPatternFilter(f.value)}
            className={`px-2 py-1 rounded text-2xs font-medium whitespace-nowrap transition-colors ${
              patternFilter === f.value
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Entry list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <SimpleSpinner size="md" color="purple" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-zinc-500">No entries found</p>
          <p className="text-xs text-zinc-600 mt-1">
            {searchQuery ? 'Try a different search term' : 'Run a pattern scan to populate the knowledge base'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((entry, i) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onClick={() => onSelectEntry(entry)}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
