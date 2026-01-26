'use client';
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import { useProjectContexts } from '@/lib/queries/contextsQueries';

// Components
import IdeasHeaderWithFilter from '@/app/features/Ideas/components/IdeasHeaderWithFilter';
import BufferView, { useInvalidateIdeas } from '@/app/features/Ideas/sub_Buffer/BufferView';
import IdeaDetailModal from '@/app/features/Ideas/components/IdeaDetailModal';
import { ScanType } from '@/app/features/Ideas/sub_IdeasSetup/ScanTypeSelector';
import ScanInitiator from '@/app/features/Ideas/sub_IdeasSetup/ScanInitiator';
import LazyContentSection from '@/components/Navigation/LazyContentSection';

// Handlers and utilities
import { getProjectName } from '@/app/features/Ideas/lib/ideasUtils';
import { getContextName } from '@/app/features/Ideas/lib/contextLoader';

interface IdeasLayoutProps {
  selectedProjectId?: string;
}

const IdeasLayout = ({ selectedProjectId: propSelectedProjectId }: IdeasLayoutProps) => {
  const [selectedIdea, setSelectedIdea] = React.useState<DbIdea | null>(null);
  const [filterContextIds, setFilterContextIds] = React.useState<string[]>([]);
  const [selectedScanTypes, setSelectedScanTypes] = React.useState<ScanType[]>([]);

  const { projects, initializeProjects, getProject } = useProjectConfigStore();
  const { setActiveProject } = useActiveProjectStore();
  const { selectedProjectId: storeSelectedProjectId, setSelectedProjectId } = useUnifiedProjectStore();
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

  const handleIdeaUpdate = React.useCallback(async (updatedIdea: DbIdea) => {
    setSelectedIdea(updatedIdea);
    // Cache invalidation is handled by IdeaDetailModal via useInvalidateIdeas
  }, []);

  const handleIdeaDelete = React.useCallback(async (deletedIdeaId: string) => {
    setSelectedIdea(null);
    // Cache invalidation is handled by IdeaDetailModal via useInvalidateIdeas
  }, []);

  const handleIdeaClose = React.useCallback(() => {
    setSelectedIdea(null);
  }, []);

  const handleScanComplete = React.useCallback(() => {
    // Invalidate React Query cache to refetch ideas
    invalidateIdeas();
  }, [invalidateIdeas]);

  const handleProjectSelect = React.useCallback((projectId: string) => {
    // Update unified store
    setSelectedProjectId(projectId);
    setFilterContextIds([]); // Reset context filter when project changes

    // Update active project in store (skip if 'all' is selected)
    if (projectId !== 'all') {
      const project = getProject(projectId);
      if (project) {
        setActiveProject(project);
      }
    }
  }, [setSelectedProjectId, getProject, setActiveProject]);

  // Get selected project details
  const selectedProject = selectedProjectId !== 'all' ? getProject(selectedProjectId) : null;

  // Helper function to get context name using React Query cached data
  const getContextNameCallback = React.useCallback((contextId: string) => {
    return getContextName(contextId, contextsData?.contexts || []);
  }, [contextsData?.contexts]);

  // Memoize getProjectName callback to prevent re-creating on every render
  const getProjectNameCallback = React.useCallback((projectId: string) => {
    return getProjectName(projectId, projects);
  }, [projects]);


  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        {/* Header with Project Filter */}
        <LazyContentSection delay={0}>
          <IdeasHeaderWithFilter
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleProjectSelect}
            selectedContextIds={filterContextIds}
            onSelectContexts={setFilterContextIds}
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
            />
          </div>
        </LazyContentSection>

        {/* Content - BufferView now uses React Query internally */}
        <LazyContentSection delay={0.2}>
          <div className="w-full px-6 py-8">
            <BufferView
              filterProject={selectedProjectId}
              getProjectName={getProjectNameCallback}
              getContextName={getContextNameCallback}
              onIdeaClick={setSelectedIdea}
            />
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
