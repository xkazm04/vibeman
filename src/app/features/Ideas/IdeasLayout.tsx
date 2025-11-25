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
import BufferView from '@/app/features/Ideas/sub_Buffer/BufferView';
import IdeaDetailModal from '@/app/features/Ideas/components/IdeaDetailModal';
import { ScanType } from '@/app/features/Ideas/sub_IdeasSetup/ScanTypeSelector';
import ScanInitiator from '@/app/features/Ideas/sub_IdeasSetup/ScanInitiator';
import LazyContentSection from '@/components/Navigation/LazyContentSection';

// Handlers and utilities
import { fetchIdeas, deleteIdea } from '@/app/features/Ideas/lib/ideasHandlers';
import {
  getProjectName,
  groupIdeasByProjectAndContext,
  calculateIdeaStats
} from '@/app/features/Ideas/lib/ideasUtils';
import {
  fetchContextsForProjects,
  getContextNameFromMap
} from '@/app/features/Ideas/lib/contextLoader';
import { ProcessingIdeaProvider } from '@/app/features/Ideas/lib/ProcessingIdeaContext';

const IdeasLayout = () => {
  const [ideas, setIdeas] = React.useState<DbIdea[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedIdea, setSelectedIdea] = React.useState<DbIdea | null>(null);
  const [filterContext, setFilterContext] = React.useState<string | null>(null);
  const [selectedScanTypes, setSelectedScanTypes] = React.useState<ScanType[]>([]);
  const [contextsMap, setContextsMap] = React.useState<Record<string, Context[]>>({});

  const { projects, initializeProjects, getProject } = useProjectConfigStore();
  const { setActiveProject } = useActiveProjectStore();
  const { selectedProjectId, setSelectedProjectId } = useUnifiedProjectStore();

  // Initialize projects on mount
  React.useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Fetch ideas on mount
  React.useEffect(() => {
    loadIdeas();
  }, []);

  // Load contexts for all projects when ideas change
  React.useEffect(() => {
    const loadContextsForIdeas = async () => {
      // Get unique project IDs from ideas
      const projectIds = [...new Set(ideas.map(idea => idea.project_id))];

      if (projectIds.length > 0) {
        const contexts = await fetchContextsForProjects(projectIds);
        setContextsMap(contexts);
      }
    };

    if (ideas.length > 0) {
      loadContextsForIdeas();
    }
  }, [ideas]);

  const loadIdeas = async () => {
    setLoading(true);
    const fetchedIdeas = await fetchIdeas();
    setIdeas(fetchedIdeas);
    setLoading(false);
  };

  const handleIdeaUpdate = React.useCallback(async (updatedIdea: DbIdea) => {
    setIdeas(prevIdeas => prevIdeas.map(idea => idea.id === updatedIdea.id ? updatedIdea : idea));
    setSelectedIdea(updatedIdea);
  }, []);

  const handleIdeaDelete = React.useCallback(async (deletedIdeaId: string) => {
    setIdeas(prevIdeas => prevIdeas.filter(idea => idea.id !== deletedIdeaId));
    setSelectedIdea(null);
  }, []);

  const handleQuickDelete = React.useCallback(async (ideaId: string) => {
    const success = await deleteIdea(ideaId);
    if (success) {
      setIdeas(prevIdeas => prevIdeas.filter(idea => idea.id !== ideaId));
    }
  }, []);

  const handleIdeaClose = React.useCallback(() => {
    setSelectedIdea(null);
  }, []);

  const handleScanComplete = React.useCallback(() => {
    loadIdeas();
  }, []);

  const handleProjectSelect = React.useCallback((projectId: string) => {
    // Update unified store
    setSelectedProjectId(projectId);
    setFilterContext(null); // Reset context filter when project changes

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

  // Filter ideas to only show Pending and Accepted
  const filteredIdeas = React.useMemo(() =>
    ideas.filter(idea => idea.status === 'pending' || idea.status === 'accepted'),
    [ideas]
  );

  // Compute grouped ideas and stats
  const groupedIdeas = React.useMemo(() =>
    groupIdeasByProjectAndContext(filteredIdeas, 'all', selectedProjectId),
    [filteredIdeas, selectedProjectId]
  );

  const stats = React.useMemo(() => calculateIdeaStats(ideas), [ideas]);

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
            selectedContextId={filterContext}
            onSelectContext={setFilterContext}
            selectedProjectPath={selectedProject?.path}
            onIdeaImplemented={loadIdeas}
          />
        </LazyContentSection>

        {/* Scan Initiator - Now includes scan type selector inline */}
        <LazyContentSection delay={0.1}>
          <div className="w-full px-6 py-4">
            <ScanInitiator
              onScanComplete={handleScanComplete}
              selectedScanTypes={selectedScanTypes}
              onScanTypesChange={setSelectedScanTypes}
              selectedContextId={filterContext}
            />
          </div>
        </LazyContentSection>

        {/* Content */}
        <LazyContentSection delay={0.2}>
          <div className="w-full px-6 py-8">
            {/* Ideas Display */}
            <BufferView
              loading={loading}
              ideas={filteredIdeas}
              groupedIdeas={groupedIdeas}
              getProjectName={getProjectNameCallback}
              getContextName={getContextName}
              onIdeaClick={setSelectedIdea}
              onIdeaDelete={handleQuickDelete}
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
    </ProcessingIdeaProvider>
  );
};

export default React.memo(IdeasLayout);
