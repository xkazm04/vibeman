'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { DbIdea } from '@/app/db';
import BufferColumn from './BufferColumn';
import { GroupedIdeas } from '../lib/ideasUtils';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import {
  useBufferIdeas,
  useDeleteIdea,
  useDeleteContextIdeas,
} from '@/lib/queries/ideaQueries';
import EmptyStateIllustration from '@/components/ui/EmptyStateIllustration';

interface BufferViewProps {
  filterProject?: string;
  getProjectName: (projectId: string) => string;
  getContextName: (contextId: string) => string;
  onIdeaClick: (idea: DbIdea) => void;
  onScanComplete?: () => void;
}

export default function BufferView({
  filterProject = 'all',
  getProjectName,
  getContextName,
  onIdeaClick,
  onScanComplete,
}: BufferViewProps) {
  const { getProject } = useProjectConfigStore();

  // Use React Query for fetching and caching ideas
  const {
    ideas,
    isLoading,
    refetch,
  } = useBufferIdeas();

  // Mutations with optimistic updates
  const deleteIdeaMutation = useDeleteIdea();
  const deleteContextIdeasMutation = useDeleteContextIdeas();

  // Refetch when scan completes
  React.useEffect(() => {
    if (onScanComplete) {
      // The parent can call refetch after scan completion
    }
  }, [onScanComplete]);

  // Filter ideas by project if needed
  const filteredIdeas = React.useMemo(() => {
    if (filterProject === 'all') {
      return ideas;
    }
    return ideas.filter((idea) => idea.project_id === filterProject);
  }, [ideas, filterProject]);

  // Group ideas by project and context
  const groupedIdeas = React.useMemo(() => {
    const grouped: GroupedIdeas = {};

    filteredIdeas.forEach((idea) => {
      const projectId = idea.project_id;
      const contextId = idea.context_id || 'no-context';

      if (!grouped[projectId]) {
        grouped[projectId] = {};
      }

      if (!grouped[projectId][contextId]) {
        grouped[projectId][contextId] = [];
      }

      grouped[projectId][contextId].push(idea);
    });

    return grouped;
  }, [filteredIdeas]);

  // Memoize sorted context entries
  const sortedGroupedIdeas = React.useMemo(() => {
    return Object.entries(groupedIdeas).map(([projectId, contexts]) => ({
      projectId,
      contexts: Object.entries(contexts).sort(
        ([, ideasA], [, ideasB]) => ideasB.length - ideasA.length
      ),
    }));
  }, [groupedIdeas]);

  const handleIdeaDelete = React.useCallback(
    async (ideaId: string) => {
      try {
        await deleteIdeaMutation.mutateAsync(ideaId);
      } catch (error) {
        // Error handling is done in the mutation hook with rollback
        console.error('Failed to delete idea:', error);
      }
    },
    [deleteIdeaMutation]
  );

  const handleContextDelete = React.useCallback(
    async (contextId: string) => {
      // Handle 'no-context' for General ideas (null context_id)
      const isGeneralContext = contextId === 'no-context';
      
      // Find the project for this context
      const contextIdeas = filteredIdeas.filter((idea) =>
        isGeneralContext
          ? idea.context_id === null
          : idea.context_id === contextId
      );
      const projectId = contextIdeas[0]?.project_id;
      const project = projectId ? getProject(projectId) : null;

      try {
        await deleteContextIdeasMutation.mutateAsync({
          contextId,
          projectPath: project?.path,
        });
      } catch (error) {
        // Error handling is done in the mutation hook with rollback
        console.error('Failed to delete context ideas:', error);
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to delete ideas. Please refresh the page.'
        );
      }
    },
    [filteredIdeas, getProject, deleteContextIdeasMutation]
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-24"
        data-testid="buffer-loading"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-blue-400" />
        </motion.div>
      </div>
    );
  }

  if (filteredIdeas.length === 0) {
    return (
      <EmptyStateIllustration
        type="ideas"
        headline="Your idea buffer is empty"
        description="Generate AI-powered insights by scanning your codebase. Our specialized agents will analyze your code and suggest improvements, optimizations, and new features."
        action={{
          label: 'Generate Ideas',
          onClick: () => {
            // Scroll to or focus the scan initiator button
            const scanBtn = document.querySelector('[data-testid="ideas-scan-btn"]');
            if (scanBtn instanceof HTMLElement) {
              scanBtn.focus();
              scanBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          },
          icon: Sparkles,
        }}
        testId="buffer-empty"
      />
    );
  }

  return (
    <div className="space-y-8" data-testid="buffer-view">
      {/* Project Sections */}
      {sortedGroupedIdeas.map(({ projectId, contexts }) => (
        <motion.div
          key={projectId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          data-testid={`buffer-project-${projectId}`}
        >
          {/* Project Header */}
          <div className="mb-4 flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full" />
            <h2 className="text-lg font-semibold text-white">
              {getProjectName(projectId)}
            </h2>
            <span className="text-sm text-gray-500 font-mono">
              ({contexts.reduce((sum, [, ideas]) => sum + ideas.length, 0)}{' '}
              ideas)
            </span>
          </div>

          {/* Buffer Grid - 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {contexts.map(([contextId, contextIdeas]) => (
                <BufferColumn
                  key={`${projectId}-${contextId}`}
                  contextName={
                    contextId === 'no-context'
                      ? 'General'
                      : getContextName(contextId)
                  }
                  contextId={contextId === 'no-context' ? null : contextId}
                  projectName={getProjectName(projectId)}
                  ideas={contextIdeas}
                  onIdeaClick={onIdeaClick}
                  onIdeaDelete={handleIdeaDelete}
                  onContextDelete={handleContextDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Export refetch hook for parent components
export { useBufferIdeas, useInvalidateIdeas } from '@/lib/queries/ideaQueries';
