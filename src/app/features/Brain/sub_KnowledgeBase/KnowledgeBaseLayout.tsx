'use client';

import { useState, useCallback } from 'react';
import type { DbKnowledgeEntry } from '@/app/db/models/knowledge.types';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useKnowledgeBase } from './lib/useKnowledgeBase';
import EntryDetailPanel from './components/EntryDetailPanel';
import CreateEntryModal from './components/CreateEntryModal';
import KBEntryTable from './components/KBEntryTable';
import KBTreeSidebar from './components/KBTreeSidebar';
import {
  GridSidebarLayout, GridToolbar, GridButton,
} from '../components/variants/GridPrimitives';

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
        sidebarWidth="w-56"
        sidebar={
          <KBTreeSidebar tree={tree} selection={selection} onSelect={setSelection} />
        }
        content={
          <KBEntryTable
            entries={entries}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectEntry={setSelectedEntry}
            isLoading={isLoading}
            breadcrumb={breadcrumb}
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
