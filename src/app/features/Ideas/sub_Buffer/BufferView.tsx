'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Loader2 } from 'lucide-react';
import { DbIdea } from '@/app/db';
import BufferColumn from './BufferColumn';
import { GroupedIdeas } from '../lib/ideasUtils';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

interface BufferViewProps {
  loading: boolean;
  ideas: DbIdea[];
  groupedIdeas: GroupedIdeas;
  getProjectName: (projectId: string) => string;
  getContextName: (contextId: string) => string;
  onIdeaClick: (idea: DbIdea) => void;
  onIdeaDelete: (ideaId: string) => void;
  onContextDelete?: (contextId: string) => void;
}

export default function BufferView({
  loading,
  ideas,
  groupedIdeas,
  getProjectName,
  getContextName,
  onIdeaClick,
  onIdeaDelete,
  onContextDelete,
}: BufferViewProps) {
  const [localIdeas, setLocalIdeas] = useState<DbIdea[]>(ideas);
  const { getProject } = useProjectConfigStore();

  // Sync local state with props
  React.useEffect(() => {
    setLocalIdeas(ideas);
  }, [ideas]);

  // Create a derived groupedIdeas from localIdeas that filters out empty contexts
  const localGroupedIdeas = React.useMemo(() => {
    const grouped: GroupedIdeas = {};

    localIdeas.forEach((idea) => {
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
  }, [localIdeas]);

  const handleIdeaDelete = async (ideaId: string) => {
    // Optimistically update local state
    setLocalIdeas(prev => prev.filter(idea => idea.id !== ideaId));

    // Call parent handler
    try {
      await onIdeaDelete(ideaId);
    } catch (error) {
      console.error('Error deleting idea:', error);
      // Revert on error - find the idea from the original ideas prop
      const deletedIdea = ideas.find(idea => idea.id === ideaId);
      if (deletedIdea) {
        setLocalIdeas(prev => [...prev, deletedIdea]);
      }
    }
  };

  const handleContextDelete = async (contextId: string) => {
    // If parent provided a handler, use it
    if (onContextDelete) {
      await onContextDelete(contextId);
      return;
    }

    // Otherwise, handle it ourselves
    const contextIdeas = localIdeas.filter(idea => idea.context_id === contextId);
    const projectId = contextIdeas[0]?.project_id;
    const project = projectId ? getProject(projectId) : null;

    // Optimistically update UI
    setLocalIdeas(prev => prev.filter(idea => idea.context_id !== contextId));

    try {
      const response = await fetch(
        `/api/contexts/ideas?contextId=${encodeURIComponent(contextId)}${project?.path ? `&projectPath=${encodeURIComponent(project.path)}` : ''}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`Deleted ${data.deletedCount} idea(s) from context`);
      } else {
        const errorData = await response.json();
        console.error('Failed to delete context ideas:', errorData.error);
        // Revert on error
        setLocalIdeas(prev => [...prev, ...contextIdeas]);
        alert(`Failed to delete ideas: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting context ideas:', error);
      // Revert on error
      setLocalIdeas(prev => [...prev, ...contextIdeas]);
      alert('Failed to delete ideas. Please refresh the page.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-blue-400" />
        </motion.div>
      </div>
    );
  }

  if (localIdeas.length === 0) {
    return (
      <motion.div
        className="text-center py-24"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Lightbulb className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-400 mb-2">No ideas yet</h3>
        <p className="text-gray-500">
          Use the Generate Ideas button above to analyze your codebase
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Project Sections */}
      {Object.entries(localGroupedIdeas).map(([projectId, contexts]) => (
        <motion.div
          key={projectId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Project Header */}
          <div className="mb-4 flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full" />
            <h2 className="text-lg font-semibold text-white">
              {getProjectName(projectId)}
            </h2>
            <span className="text-sm text-gray-500 font-mono">
              ({Object.values(contexts).flat().length} ideas)
            </span>
          </div>

          {/* Buffer Grid - 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {Object.entries(contexts)
                .sort(([, ideasA], [, ideasB]) => ideasB.length - ideasA.length)
                .map(([contextId, contextIdeas]) => (
                  <BufferColumn
                    key={`${projectId}-${contextId}`}
                    contextName={contextId === 'no-context' ? 'General' : getContextName(contextId)}
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
