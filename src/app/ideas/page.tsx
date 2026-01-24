'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { DbIdea } from '@/app/db';
import { Context } from '@/lib/queries/contextQueries';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

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

export default function IdeasPage() {
  const [selectedIdea, setSelectedIdea] = React.useState<DbIdea | null>(null);
  const [filterProject, setFilterProject] = React.useState<string>('all');
  const [filterContextIds, setFilterContextIds] = React.useState<string[]>([]);
  const [selectedScanTypes, setSelectedScanTypes] = React.useState<ScanType[]>([]);
  const [contextsMap, setContextsMap] = React.useState<Record<string, Context[]>>({});
  const [loadedProjectIds, setLoadedProjectIds] = React.useState<string[]>([]);

  const { projects, initializeProjects, getProject } = useProjectConfigStore();
  const { setActiveProject } = useActiveProjectStore();
  const invalidateIdeas = useInvalidateIdeas();

  // Initialize projects on mount
  React.useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

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
    // Update local filter state
    setFilterProject(projectId);
    setFilterContextIds([]); // Reset context filter when project changes

    // Update active project in store (skip if 'all' is selected)
    if (projectId !== 'all') {
      const project = getProject(projectId);
      if (project) {
        setActiveProject(project);
      }
    }
  }, [getProject, setActiveProject]);

  // Get selected project details
  const selectedProject = filterProject !== 'all' ? getProject(filterProject) : null;

  // Helper function to get context name using the loaded contexts map
  const getContextName = React.useCallback((contextId: string) => {
    return getContextNameFromMap(contextId, contextsMap);
  }, [contextsMap]);

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
            selectedProjectId={filterProject}
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
              filterProject={filterProject}
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
    </div>
  );
}
