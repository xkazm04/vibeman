'use client';
import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { Context } from '@/lib/queries/contextQueries';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';

// Components
import IdeasHeaderWithFilter from '@/app/features/Ideas/components/IdeasHeaderWithFilter';
import BufferView, { useInvalidateIdeas } from '@/app/features/Ideas/sub_Buffer/BufferView';
import IdeaDetailModal from '@/app/features/Ideas/components/IdeaDetailModal';
import { ScanType } from '@/app/features/Ideas/sub_IdeasSetup/ScanTypeSelector';
import ScanInitiator from '@/app/features/Ideas/sub_IdeasSetup/ScanInitiator';
import LazyContentSection from '@/components/Navigation/LazyContentSection';

// Handlers and utilities
import { getProjectName } from '@/app/features/Ideas/lib/ideasUtils';
import {
  fetchContextsForProjects,
  getContextNameFromMap
} from '@/app/features/Ideas/lib/contextLoader';
import { ProcessingIdeaProvider } from '@/app/features/Ideas/lib/ProcessingIdeaContext';

// Developer Mind-Meld integration
import { MindMeldToggle, InsightsPanel } from '@/app/features/DeveloperMindMeld';
import { useDeveloperMindMeldStore } from '@/stores/developerMindMeldStore';

const IdeasLayout = () => {
  const [selectedIdea, setSelectedIdea] = React.useState<DbIdea | null>(null);
  const [filterContextIds, setFilterContextIds] = React.useState<string[]>([]);
  const [selectedScanTypes, setSelectedScanTypes] = React.useState<ScanType[]>([]);
  const [contextsMap, setContextsMap] = React.useState<Record<string, Context[]>>({});
  const [loadedProjectIds, setLoadedProjectIds] = React.useState<string[]>([]);

  const { projects, initializeProjects, getProject } = useProjectConfigStore();
  const { setActiveProject } = useActiveProjectStore();
  const { selectedProjectId, setSelectedProjectId } = useUnifiedProjectStore();
  const invalidateIdeas = useInvalidateIdeas();
  const { fetchProfile } = useDeveloperMindMeldStore();

  // Initialize projects on mount
  React.useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Fetch Mind-Meld profile when project changes
  React.useEffect(() => {
    if (selectedProjectId && selectedProjectId !== 'all') {
      fetchProfile(selectedProjectId);
    }
  }, [selectedProjectId, fetchProfile]);

  // Load contexts when projects change
  React.useEffect(() => {
    const loadContexts = async () => {
      const projectIds = projects.map(p => p.id);

      // Only reload if project list actually changed
      if (JSON.stringify(projectIds.sort()) === JSON.stringify(loadedProjectIds.sort())) {
        return;
      }

      if (projectIds.length > 0) {
        const contexts = await fetchContextsForProjects(projectIds);
        setContextsMap(contexts);
        setLoadedProjectIds(projectIds);
      }
    };

    if (projects.length > 0) {
      loadContexts();
    }
  }, [projects, loadedProjectIds]);

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

  // Helper function to get context name using the loaded contexts map
  const getContextName = React.useCallback((contextId: string) => {
    return getContextNameFromMap(contextId, contextsMap);
  }, [contextsMap]);

  // Memoize getProjectName callback to prevent re-creating on every render
  const getProjectNameCallback = React.useCallback((projectId: string) => {
    return getProjectName(projectId, projects);
  }, [projects]);


  return (
    <ProcessingIdeaProvider>
      <div className="min-h-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        {/* Header with Project Filter */}
        <LazyContentSection delay={0}>
          <IdeasHeaderWithFilter
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleProjectSelect}
            selectedContextIds={filterContextIds}
            onSelectContexts={setFilterContextIds}
            selectedProjectPath={selectedProject?.path}
            onIdeaImplemented={handleScanComplete}
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
              getContextName={getContextName}
              onIdeaClick={setSelectedIdea}
              onScanComplete={handleScanComplete}
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

        {/* Developer Mind-Meld - Insights Panel */}
        {selectedProjectId && selectedProjectId !== 'all' && (
          <InsightsPanel projectId={selectedProjectId} />
        )}
      </div>
    </ProcessingIdeaProvider>
  );
};

export default React.memo(IdeasLayout);
