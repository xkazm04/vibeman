'use client';

import { useState, useCallback } from 'react';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import type { DbKnowledgeEntry } from '@/app/db/models/knowledge.types';
import { KNOWLEDGE_CATEGORY_LABELS, KNOWLEDGE_LAYER_LABELS } from '@/app/db/models/knowledge.types';
import type { KnowledgeCategory, KnowledgeLayer } from '@/app/db/models/knowledge.types';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useKnowledgeBase } from './lib/useKnowledgeBase';
import type { KBTree, TreeSelection } from './lib/useKnowledgeBase';
import EntryDetailPanel from './components/EntryDetailPanel';
import CreateEntryModal from './components/CreateEntryModal';
import {
  GridPanel, GridHeader, GridRow, GridTag, GridMetric,
  GridSidebarLayout, GridToolbar, GridButton, GridTable,
} from '../components/variants/GridPrimitives';

const PATTERN_TYPE_ABBR: Record<string, { label: string; color: string }> = {
  best_practice: { label: 'BP', color: 'green' },
  anti_pattern:  { label: 'AP', color: 'red' },
  convention:    { label: 'CV', color: 'cyan' },
  gotcha:        { label: 'GT', color: 'amber' },
  optimization:  { label: 'OP', color: 'blue' },
};

export default function KnowledgeBaseLayout() {
  const activeProject = useClientProjectStore(s => s.activeProject);
  const {
    entries, stats, tree, isLoading,
    selection, setSelection,
    searchQuery, setSearchQuery,
    breadcrumb,
    createEntry, deleteEntry, recordFeedback, exportEntries,
  } = useKnowledgeBase();

  const [selectedEntry, setSelectedEntry] = useState<DbKnowledgeEntry | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleExport = useCallback(() => {
    if (activeProject?.path) exportEntries(activeProject.path);
  }, [activeProject, exportEntries]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <GridToolbar
        left={
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
            <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">knowledge_base</span>
            {stats && (
              <span className="text-2xs font-mono text-cyan-500/70 tabular-nums">[{stats.total}]</span>
            )}
          </div>
        }
        right={
          <div className="flex items-center gap-1.5">
            <GridButton onClick={() => alert('Run /identify-patterns from the CLI')}>scan</GridButton>
            <GridButton onClick={handleExport}>export</GridButton>
            <GridButton onClick={() => setShowCreateModal(true)} variant="primary">+ add</GridButton>
          </div>
        }
      />

      <GridSidebarLayout
        sidebarWidth="w-52"
        sidebar={
          <div className="py-1">
            <GridHeader title="browse" />
            <KBTree tree={tree} selection={selection} onSelect={setSelection} />
          </div>
        }
        content={
          <KBEntryList
            entries={entries}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            breadcrumb={breadcrumb}
            isLoading={isLoading}
            onSelect={setSelectedEntry}
          />
        }
      />

      <EntryDetailPanel
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onFeedback={recordFeedback}
        onDelete={deleteEntry}
      />
      <CreateEntryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createEntry}
      />
    </div>
  );
}

// ── Tree ──────────────────────────────────────────────────────────────────────

function KBTree({ tree, selection, onSelect }: { tree: KBTree | null; selection: TreeSelection; onSelect: (s: TreeSelection) => void }) {
  if (!tree) return (
    <div className="flex flex-col items-center gap-2 py-6 px-3">
      <BookOpen className="w-5 h-5 text-cyan-500/40" />
      <p className="text-2xs font-mono text-zinc-600 text-center">no entries yet</p>
      <p className="text-2xs font-mono text-zinc-700 text-center">run /identify-patterns or click + add</p>
    </div>
  );

  const languages = Object.entries(tree).sort(([, a], [, b]) => {
    const sumA = Object.values(a).reduce((s, c) => s + Object.values(c).reduce((ss, v) => ss + v, 0), 0);
    const sumB = Object.values(b).reduce((s, c) => s + Object.values(c).reduce((ss, v) => ss + v, 0), 0);
    return sumB - sumA;
  });

  return (
    <div>
      <GridRow onClick={() => onSelect({})} active={!selection.language}>
        <span className="text-zinc-400">* all</span>
      </GridRow>
      {languages.map(([lang, layers]) => {
        const total = Object.values(layers).reduce((s, c) => s + Object.values(c).reduce((ss, v) => ss + v, 0), 0);
        return (
          <div key={lang}>
            <GridRow onClick={() => onSelect({ language: lang as any })} active={selection.language === lang && !selection.layer}>
              <div className="flex items-center justify-between">
                <span className="text-zinc-300">{lang}</span>
                <span className="text-zinc-600 tabular-nums">{total}</span>
              </div>
            </GridRow>
            {selection.language === lang && Object.entries(layers).map(([layer, cats]) => {
              const layerTotal = Object.values(cats).reduce((s, v) => s + v, 0);
              return (
                <div key={layer}>
                  <GridRow onClick={() => onSelect({ language: lang as any, layer: layer as any })} active={selection.layer === layer && !selection.category} className="pl-5">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">{layer}</span>
                      <span className="text-zinc-700 tabular-nums">{layerTotal}</span>
                    </div>
                  </GridRow>
                  {selection.layer === layer && Object.entries(cats).map(([cat, count]) => (
                    <GridRow key={cat} onClick={() => onSelect({ language: lang as any, layer: layer as any, category: cat as any })} active={selection.category === cat} className="pl-9">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-600">{cat}</span>
                        <span className="text-zinc-700 tabular-nums">{count}</span>
                      </div>
                    </GridRow>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Entry List ────────────────────────────────────────────────────────────────

function KBEntryList({ entries, searchQuery, onSearchChange, breadcrumb, isLoading, onSelect }: {
  entries: DbKnowledgeEntry[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  breadcrumb: string[];
  isLoading: boolean;
  onSelect: (e: DbKnowledgeEntry) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/70 bg-zinc-950/60">
        <span className="text-2xs font-mono text-zinc-600">$</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="grep pattern..."
          className="flex-1 bg-transparent text-xs font-mono text-zinc-300 placeholder:text-zinc-700 outline-none"
        />
        <span className="text-2xs font-mono text-zinc-700 tabular-nums">{entries.length} rows</span>
      </div>

      {breadcrumb.length > 0 && (
        <div className="px-3 py-1 border-b border-zinc-800/50 bg-zinc-950/40">
          <span className="text-2xs font-mono text-cyan-500/60">/{breadcrumb.join('/')}</span>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4">
            <Loader2 className="w-3.5 h-3.5 text-cyan-500/60 animate-spin" />
            <span className="text-2xs font-mono text-zinc-600">loading entries...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-10 px-4">
            <Search className="w-5 h-5 text-cyan-500/40" />
            <p className="text-2xs font-mono text-zinc-500 text-center">
              {searchQuery ? 'no matches found' : 'no entries in this category'}
            </p>
            <p className="text-2xs font-mono text-zinc-700 text-center">
              {searchQuery ? 'try a different search term' : 'run /identify-patterns from the CLI or click + add'}
            </p>
          </div>
        ) : (
          <GridTable headers={['type', 'title', 'category', 'conf', 'used']}>
            {entries.map(entry => {
              const pt = PATTERN_TYPE_ABBR[entry.pattern_type] ?? PATTERN_TYPE_ABBR.convention;
              return (
                <tr key={entry.id} onClick={() => onSelect(entry)} className="cursor-pointer hover:bg-cyan-500/5 transition-colors">
                  <td className="px-3 py-1.5"><GridTag color={pt.color as any}>{pt.label}</GridTag></td>
                  <td className="px-3 py-1.5 text-zinc-300 truncate max-w-xs">{entry.title}</td>
                  <td className="px-3 py-1.5 text-zinc-600">{entry.domain}</td>
                  <td className="px-3 py-1.5 text-zinc-500 tabular-nums text-right">{entry.confidence}</td>
                  <td className="px-3 py-1.5 text-zinc-600 tabular-nums text-right">{entry.times_applied || '-'}</td>
                </tr>
              );
            })}
          </GridTable>
        )}
      </div>
    </div>
  );
}
