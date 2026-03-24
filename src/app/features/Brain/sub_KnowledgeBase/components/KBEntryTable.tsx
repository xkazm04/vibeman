'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, X, Filter } from 'lucide-react';
import KBGridPulseLoader from './KBGridPulseLoader';
import BrainEmptyState from '../../components/BrainEmptyState';
import KBNoResultsSvg from './KBNoResultsSvg';
import KBEmptyBookSvg from './KBEmptyBookSvg';
import { KBErrorBanner } from './KBErrorStates';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { DbKnowledgeEntry, KnowledgePatternType } from '@/app/db/models/knowledge.types';
import { KNOWLEDGE_CATEGORY_LABELS, KNOWLEDGE_LAYER_LABELS } from '@/app/db/models/knowledge.types';
import type { KnowledgeCategory, KnowledgeLayer } from '@/app/db/models/knowledge.types';

type SortField = 'confidence' | 'created_at' | 'times_applied' | 'title';

const PATTERN_TYPE_STYLES: Record<string, { label: string; cls: string }> = {
  best_practice: { label: 'BP', cls: 'bg-emerald-500/15 text-emerald-400' },
  anti_pattern:  { label: 'AP', cls: 'bg-red-500/15 text-red-400' },
  convention:    { label: 'CV', cls: 'bg-blue-500/15 text-blue-400' },
  gotcha:        { label: 'GT', cls: 'bg-amber-500/15 text-amber-400' },
  optimization:  { label: 'OP', cls: 'bg-cyan-500/15 text-cyan-400' },
};

const PATTERN_FILTERS: { value: KnowledgePatternType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'best_practice', label: 'Best Practices' },
  { value: 'anti_pattern', label: 'Anti-Patterns' },
  { value: 'convention', label: 'Conventions' },
  { value: 'gotcha', label: 'Gotchas' },
  { value: 'optimization', label: 'Optimizations' },
];

interface KBEntryTableProps {
  entries: DbKnowledgeEntry[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectEntry: (entry: DbKnowledgeEntry) => void;
  isLoading: boolean;
  breadcrumb: string[];
  error?: string | null;
  onRetry?: () => void;
}

export default function KBEntryTable({
  entries,
  searchQuery,
  onSearchChange,
  onSelectEntry,
  isLoading,
  breadcrumb,
  error,
  onRetry,
}: KBEntryTableProps) {
  const [sortField, setSortField] = useState<SortField>('confidence');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [patternFilter, setPatternFilter] = useState<KnowledgePatternType | 'all'>('all');
  const prefersReduced = useReducedMotion();

  const filtered = useMemo(() => {
    let result = [...entries];
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
  }, [entries, patternFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const title = breadcrumb.length > 0
    ? breadcrumb.map(p => {
        return (KNOWLEDGE_LAYER_LABELS as Record<string, string>)[p]
          ?? (KNOWLEDGE_CATEGORY_LABELS as Record<string, string>)[p]
          ?? p;
      }).join(' > ')
    : 'All Entries';

  return (
    <div className="flex-1 overflow-auto">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/50 px-4 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
            <span className="text-2xs text-zinc-500 tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {(['confidence', 'created_at', 'times_applied'] as SortField[]).map(field => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs transition-colors ${
                  sortField === field ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <ArrowUpDown className="w-2.5 h-2.5" />
                {field === 'confidence' ? 'Conf' : field === 'created_at' ? 'Date' : 'Usage'}
              </button>
            ))}
          </div>
        </div>

        {/* Search + filters row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-7 py-1.5 rounded-md bg-zinc-900/50 border border-zinc-800/50 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            {PATTERN_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setPatternFilter(f.value)}
                className={`px-1.5 py-0.5 rounded text-2xs font-medium whitespace-nowrap transition-colors ${
                  patternFilter === f.value
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="py-10 px-6 flex justify-center">
          <KBErrorBanner
            error={error}
            context="fetch"
            reducedMotion={prefersReduced}
            onRetry={onRetry}
          />
        </div>
      ) : isLoading ? (
        <KBGridPulseLoader />
      ) : filtered.length === 0 ? (
        <div className="py-10 flex justify-center">
          <BrainEmptyState
            icon={searchQuery ? <KBNoResultsSvg reducedMotion={prefersReduced} /> : <KBEmptyBookSvg reducedMotion={prefersReduced} />}
            title={searchQuery ? 'No matches found' : 'No entries yet'}
            description={searchQuery ? 'Try a different search term.' : 'Run /identify-patterns from the CLI or click + add to create your first entry.'}
          />
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/30">
          {filtered.map(entry => {
            const pt = PATTERN_TYPE_STYLES[entry.pattern_type] ?? PATTERN_TYPE_STYLES.convention;
            const helpRate = entry.times_applied > 0
              ? Math.round((entry.times_helpful / entry.times_applied) * 100)
              : null;

            return (
              <button
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800/30 transition-colors group"
              >
                {/* Type badge */}
                <span className={`px-1 py-0.5 text-2xs font-mono font-medium rounded flex-shrink-0 ${pt.cls}`}>
                  {pt.label}
                </span>

                {/* Title + preview */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-white">
                    {entry.title}
                  </p>
                  <p className="text-2xs text-zinc-500 truncate">{entry.pattern}</p>
                </div>

                {/* Category */}
                <span className="text-2xs text-zinc-600 flex-shrink-0 hidden sm:block">
                  {KNOWLEDGE_CATEGORY_LABELS[entry.domain as KnowledgeCategory] ?? entry.domain}
                </span>

                {/* Confidence */}
                <div className="flex items-center gap-1 flex-shrink-0 w-14">
                  <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        entry.confidence >= 80 ? 'bg-emerald-500' :
                        entry.confidence >= 60 ? 'bg-cyan-500' :
                        entry.confidence >= 30 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${entry.confidence}%` }}
                    />
                  </div>
                  <span className="text-2xs text-zinc-500 tabular-nums w-6 text-right">{entry.confidence}</span>
                </div>

                {/* Usage */}
                {entry.times_applied > 0 && (
                  <span className="text-2xs text-zinc-600 tabular-nums flex-shrink-0 w-8 text-right">
                    {helpRate !== null ? `${helpRate}%` : '—'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
