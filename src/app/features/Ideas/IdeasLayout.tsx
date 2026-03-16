/**
 * Ideas Layout Component
 *
 * Discovery and triage interface for code-improvement ideas.
 * Supports two workflows:
 *   - **Scan** — run configurable scans across selected contexts to discover ideas
 *   - **Review** — triage ideas in buffer (flat list) or kanban (status columns) view
 *
 * Key state flows:
 * - Project selection sets the active project and resets context filters.
 * - Scan completion invalidates the React Query cache so new ideas appear.
 * - Idea detail modal handles updates/deletes and invalidates cache internally.
 *
 * Views:
 * - **Buffer** — grouped card list with project/context metadata
 * - **Kanban** — status-based column layout for drag-based triage
 */
'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { LayoutGrid, Columns3 } from 'lucide-react';
import { DbIdea } from '@/app/db';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useProjectContexts } from '@/lib/queries/contextsQueries';

import IdeasHeaderWithFilter from '@/app/features/Ideas/components/IdeasHeaderWithFilter';
import BufferView, { useInvalidateIdeas } from '@/app/features/Ideas/sub_Buffer/BufferView';
import KanbanBoard from '@/app/features/Ideas/sub_Kanban/KanbanBoard';
import IdeaDetailModal from '@/app/features/Ideas/components/IdeaDetailModal';
import { ScanType } from '@/app/features/Ideas/sub_IdeasSetup/ScanTypeSelector';
import ScanInitiator from '@/app/features/Ideas/sub_IdeasSetup/ScanInitiator';
import LazyContentSection from '@/components/Navigation/LazyContentSection';
import { getContextName } from '@/app/features/Ideas/lib/contextLoader';

type IdeasViewMode = 'buffer' | 'kanban';

interface IdeasLayoutProps {
  /** Optional project ID override; falls back to the client project store. */
  selectedProjectId?: string;
}

const IdeasLayout = ({ selectedProjectId: propSelectedProjectId }: IdeasLayoutProps) => {
  const [selectedIdea, setSelectedIdea] = React.useState<DbIdea | null>(null);
  const [filterContextIds, setFilterContextIds] = React.useState<string[]>([]);
  const [filterGroupIds, setFilterGroupIds] = React.useState<string[]>([]);
  const [selectedScanTypes, setSelectedScanTypes] = React.useState<ScanType[]>([]);
  const [viewMode, setViewMode] = React.useState<IdeasViewMode>('buffer');

  const { projects, initializeProjects, getProject } = useServerProjectStore();
  const { setActiveProject } = useClientProjectStore();
  const { selectedProjectId: storeSelectedProjectId, setSelectedProjectId } = useClientProjectStore();
  const invalidateIdeas = useInvalidateIdeas();

  // Use prop if provided, otherwise fall back to store
  const selectedProjectId = propSelectedProjectId ?? storeSelectedProjectId;

  // Use React Query for context loading - shared cache with IdeasHeaderWithFilter
  const projectIdForContexts = selectedProjectId !== 'all' ? selectedProjectId : null;
  const { data: contextsData } = useProjectContexts(projectIdForContexts);

  // Initialize projects on mount
  React.useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  const handleIdeaUpdate = React.useCallback(async (updatedIdea: DbIdea): Promise<void> => {
    setSelectedIdea(updatedIdea);
    // Cache invalidation is handled by IdeaDetailModal via useInvalidateIdeas
  }, []);

  const handleIdeaDelete = React.useCallback(async (_deletedIdeaId: string): Promise<void> => {
    setSelectedIdea(null);
    // Cache invalidation is handled by IdeaDetailModal via useInvalidateIdeas
  }, []);

  const handleIdeaClose = React.useCallback((): void => {
    setSelectedIdea(null);
  }, []);

  const handleScanComplete = React.useCallback((): void => {
    // Invalidate React Query cache to refetch ideas
    invalidateIdeas();
  }, [invalidateIdeas]);

  /**
   * Handle project selection from the header filter.
   *
   * Resets context/group filters to avoid stale selections from the
   * previous project. The special value 'all' shows ideas across
   * every project without setting an active project.
   */
  const handleProjectSelect = React.useCallback((projectId: string): void => {
    setSelectedProjectId(projectId);
    setFilterContextIds([]);
    setFilterGroupIds([]);

    if (projectId !== 'all') {
      const project = getProject(projectId);
      if (project) {
        setActiveProject(project);
      }
    }
  }, [setSelectedProjectId, getProject, setActiveProject]);

  // Helper function to get context name using React Query cached data
  const getContextNameCallback = React.useCallback((contextId: string): string => {
    return getContextName(contextId, contextsData?.contexts || []);
  }, [contextsData?.contexts]);

  // Memoize getProjectName callback to prevent re-creating on every render
  const getProjectNameCallback = React.useCallback((projectId: string): string => {
    return projects.find(p => p.id === projectId)?.name || projectId;
  }, [projects]);


  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 via-gray-900/95 to-gray-800">
        {/* Header with Project Filter */}
        <LazyContentSection delay={0}>
          <IdeasHeaderWithFilter
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleProjectSelect}
            selectedContextIds={filterContextIds}
            onSelectContexts={setFilterContextIds}
            selectedGroupIds={filterGroupIds}
            onSelectGroups={setFilterGroupIds}
          />
        </LazyContentSection>

        {/* Scan Initiator - Now includes scan type selector inline */}
        <LazyContentSection delay={0.1}>
          <div className="w-full px-6 py-4">
            <ScanInitiator
              onScanComplete={handleScanComplete}
              selectedScanTypes={selectedScanTypes}
              onScanTypesChange={setSelectedScanTypes}
              selectedContextIds={filterContextIds}
              selectedGroupIds={filterGroupIds}
            />
          </div>
        </LazyContentSection>

        {/* View mode toggle + Content */}
        <LazyContentSection delay={0.2}>
          <div className="w-full px-6 py-8">
            {/* View toggle */}
            <div className="flex items-center gap-1 mb-4">
              <button
                onClick={() => setViewMode('buffer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'buffer'
                    ? 'bg-zinc-700/60 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                }`}
                title="Buffer view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Buffer
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-zinc-700/60 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'
                }`}
                title="Kanban board view"
              >
                <Columns3 className="w-3.5 h-3.5" />
                Kanban
              </button>
            </div>

            {viewMode === 'buffer' ? (
              <BufferView
                filterProject={selectedProjectId}
                getProjectName={getProjectNameCallback}
                getContextName={getContextNameCallback}
                onIdeaClick={setSelectedIdea}
              />
            ) : (
              <KanbanBoard
                filterProject={selectedProjectId}
                onIdeaClick={setSelectedIdea}
              />
            )}
          </div>
        </LazyContentSection>

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedIdea && (
            <IdeaDetailModal
              idea={selectedIdea}
              onClose={handleIdeaClose}
              onUpdate={handleIdeaUpdate}
              onDelete={handleIdeaDelete}
            />
          )}
        </AnimatePresence>
    </div>
  );
};

export default React.memo(IdeasLayout);
