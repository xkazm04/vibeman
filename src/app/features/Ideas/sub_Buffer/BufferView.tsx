'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { DbIdea } from '@/app/db';
import BufferColumn from './BufferColumn';
import { GroupedIdeas } from '../lib/ideasUtils';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import {
  useBufferIdeas,
  useDeleteIdea,
  useDeleteContextIdeas,
  useInvalidateIdeas,
} from '@/lib/queries/ideaQueries';
import { useTaskRunnerStore } from '@/app/features/TaskRunner/store/taskRunnerStore';
import EmptyStateIllustration from '@/components/ui/EmptyStateIllustration';
import { FullPageSpinner } from '@/components/ui/Spinner';

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
  const { reserveBatchSlot, releaseBatchReservation, createSessionBatch } = useTaskRunnerStore();

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
        alert(
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

      // Atomically reserve a batch slot BEFORE any async operations
      // This prevents race conditions from double-clicks or concurrent requests
      const reservedBatchId = reserveBatchSlot();
      if (!reservedBatchId) {
        alert('All batch slots are full. Please clear a batch in Task Runner first.');
        return;
      }

      try {
        // Step 1: Accept the idea (creates requirement file)
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

        const data = await response.json();
        const requirementName = data.requirementName;

        // Step 2: Create a batch in TaskRunner with this requirement
        // This also clears the reservation atomically
        const taskId = `${idea.project_id}:${requirementName}`;
        const batchName = idea.title.substring(0, 30);

        createSessionBatch(
          reservedBatchId,
          idea.project_id,
          project.path,
          batchName,
          taskId,
          requirementName
        );

        // Refresh the ideas list to show updated status
        invalidateIdeas();

        // Step 3: Navigate to TaskRunner (home page)
        router.push('/');
      } catch (error) {
        // Release the reservation if the async operation failed
        releaseBatchReservation(reservedBatchId);
        console.error('Failed to queue idea for execution:', error);
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to queue idea for execution.'
        );
      }
    },
    [ideas, getProject, reserveBatchSlot, releaseBatchReservation, createSessionBatch, invalidateIdeas, router]
  );

  if (isLoading) {
    return <FullPageSpinner label="Loading ideas..." />;
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
