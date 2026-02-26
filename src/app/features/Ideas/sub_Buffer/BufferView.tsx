'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, XCircle } from 'lucide-react';
import { DbIdea } from '@/app/db';
import BufferColumn from './BufferColumn';
import { createIdeaStagingBuffer } from '@/lib/staging-buffer';

const ideaStagingBuffer = createIdeaStagingBuffer<DbIdea>();
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import {
  useBufferIdeas,
  useDeleteIdea,
  useDeleteContextIdeas,
  useInvalidateIdeas,
} from '@/lib/queries/ideaQueries';
import EmptyStateIllustration from '@/components/ui/EmptyStateIllustration';
import IdeasLoadingState from '@/app/features/Ideas/components/IdeasLoadingState';
import { getCategoryConfig } from '@/app/features/Ideas/lib/ideaConfig';

/** Find the dominant category color for a set of ideas */
function getDominantCategoryColor(ideas: DbIdea[]): string | undefined {
  if (ideas.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const idea of ideas) {
    counts.set(idea.category, (counts.get(idea.category) ?? 0) + 1);
  }
  let maxCount = 0;
  let dominant = ideas[0].category;
  for (const [cat, count] of counts) {
    if (count > maxCount) { maxCount = count; dominant = cat; }
  }
  return getCategoryConfig(dominant).color;
}

interface BufferViewProps {
  filterProject?: string;
  getProjectName: (projectId: string) => string;
  getContextName: (contextId: string) => string;
  onIdeaClick: (idea: DbIdea) => void;
}

export default function BufferView({
  filterProject = 'all',
  getProjectName,
  getContextName,
  onIdeaClick,
}: BufferViewProps) {
  const router = useRouter();
  const { getProject } = useProjectConfigStore();

  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  const showError = React.useCallback((msg: string) => {
    setErrorBanner(msg);
    setTimeout(() => setErrorBanner(null), 5000);
  }, []);

  // Use React Query for fetching and caching ideas
  const {
    ideas,
    isLoading,
    refetch,
  } = useBufferIdeas();

  // Mutations with optimistic updates
  const deleteIdeaMutation = useDeleteIdea();
  const deleteContextIdeasMutation = useDeleteContextIdeas();
  const invalidateIdeas = useInvalidateIdeas();

  // Dependency counts for chain icon display
  const [dependencyCounts, setDependencyCounts] = React.useState<Record<string, number>>({});

  // Filter ideas by project if needed
  const filteredIdeas = React.useMemo(() => {
    if (filterProject === 'all') {
      return ideas;
    }
    return ideas.filter((idea) => idea.project_id === filterProject);
  }, [ideas, filterProject]);

  // Load dependency counts for visible ideas
  React.useEffect(() => {
    if (filteredIdeas.length === 0) return;
    const ids = filteredIdeas.map(i => i.id);
    fetch(`/api/ideas/dependencies?ideaIds=${ids.join(',')}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.counts) {
          setDependencyCounts(data.counts);
        }
      })
      .catch(() => {});
  }, [filteredIdeas]);

  // Group and sort ideas using the staging buffer abstraction
  const sortedGroupedIdeas = React.useMemo(() => {
    const projectGroups = ideaStagingBuffer.groupSorted(filteredIdeas);
    // Map to the shape expected by the template (array of [contextId, ideas] tuples)
    return projectGroups.map(({ projectId, contexts }) => ({
      projectId,
      contexts: contexts.map(({ contextId, items }) => [contextId, items] as [string, DbIdea[]]),
    }));
  }, [filteredIdeas]);

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
        showError(
          error instanceof Error
            ? error.message
            : 'Failed to delete ideas. Please refresh the page.'
        );
      }
    },
    [filteredIdeas, getProject, deleteContextIdeasMutation]
  );

  const handleIdeaConvert = React.useCallback(
    async (ideaId: string) => {
      // Find the idea to get its project_id
      const idea = ideas.find((i) => i.id === ideaId);
      if (!idea) {
        console.error('Idea not found:', ideaId);
        return;
      }

      const project = getProject(idea.project_id);
      if (!project?.path) {
        console.error('Project not found for idea:', ideaId);
        return;
      }

      try {
        const response = await fetch('/api/ideas/tinder/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ideaId,
            projectPath: project.path,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to convert idea');
        }

        // Refresh the ideas list to show updated status
        invalidateIdeas();
      } catch (error) {
        console.error('Failed to convert idea:', error);
        showError(
          error instanceof Error
            ? error.message
            : 'Failed to convert idea to requirement.'
        );
      }
    },
    [ideas, getProject, invalidateIdeas]
  );

  const handleIdeaQueueForExecution = React.useCallback(
    async (ideaId: string) => {
      const idea = ideas.find((i) => i.id === ideaId);
      if (!idea) {
        console.error('Idea not found:', ideaId);
        return;
      }

      const project = getProject(idea.project_id);
      if (!project?.path) {
        console.error('Project not found for idea:', ideaId);
        return;
      }

      try {
        const response = await fetch('/api/ideas/tinder/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ideaId,
            projectPath: project.path,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to convert idea');
        }

        invalidateIdeas();
        router.push('/');
      } catch (error) {
        console.error('Failed to queue idea for execution:', error);
        showError(
          error instanceof Error
            ? error.message
            : 'Failed to queue idea for execution.'
        );
      }
    },
    [ideas, getProject, invalidateIdeas, router, showError]
  );

  if (isLoading) {
    return <IdeasLoadingState size="lg" label="Loading ideas..." />;
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
      {/* Inline error banner */}
      <AnimatePresence>
        {errorBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 flex items-center gap-3"
          >
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-300 flex-1">{errorBanner}</span>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
            <div className="w-2 h-2 bg-blue-400 rounded-full shadow-sm shadow-blue-400/50" />
            <h2 className="text-lg font-semibold text-white">
              {getProjectName(projectId)}
            </h2>
            <span className="text-sm text-gray-500 font-mono tabular-nums">
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
                  accentColor={getDominantCategoryColor(contextIdeas)}
                  dependencyCounts={dependencyCounts}
                  onIdeaClick={onIdeaClick}
                  onIdeaDelete={handleIdeaDelete}
                  onContextDelete={handleContextDelete}
                  onIdeaConvert={handleIdeaConvert}
                  onIdeaQueueForExecution={handleIdeaQueueForExecution}
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
