'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Loader2 } from 'lucide-react';
import { DbIdea } from '@/app/db';
import BufferColumn from './BufferColumn';
import { GroupedIdeas } from '../lib/ideasUtils';

interface BufferViewProps {
  loading: boolean;
  ideas: DbIdea[];
  groupedIdeas: GroupedIdeas;
  getProjectName: (projectId: string) => string;
  getContextName: (contextId: string) => string;
  onIdeaClick: (idea: DbIdea) => void;
  onIdeaDelete: (ideaId: string) => void;
}

export default function BufferView({
  loading,
  ideas,
  groupedIdeas,
  getProjectName,
  getContextName,
  onIdeaClick,
  onIdeaDelete,
}: BufferViewProps) {
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

  if (ideas.length === 0) {
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

  // Flatten grouped ideas into a list of buffers/columns
  const buffers: Array<{
    key: string;
    projectId: string;
    contextId: string;
    projectName: string;
    contextName: string;
    ideas: DbIdea[];
  }> = [];

  Object.entries(groupedIdeas).forEach(([projectId, contexts]) => {
    Object.entries(contexts).forEach(([contextId, contextIdeas]) => {
      buffers.push({
        key: `${projectId}-${contextId}`,
        projectId,
        contextId,
        projectName: getProjectName(projectId),
        contextName: contextId === 'no-context' ? 'General' : getContextName(contextId),
        ideas: contextIdeas,
      });
    });
  });

  return (
    <div className="space-y-8">
      {/* Project Sections */}
      {Object.entries(groupedIdeas).map(([projectId, contexts]) => (
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
            <span className="text-xs text-gray-500 font-mono">
              ({Object.values(contexts).flat().length} ideas)
            </span>
          </div>

          {/* Buffer Grid - 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(contexts).map(([contextId, contextIdeas]) => (
              <BufferColumn
                key={`${projectId}-${contextId}`}
                contextName={contextId === 'no-context' ? 'General' : getContextName(contextId)}
                projectName={getProjectName(projectId)}
                ideas={contextIdeas}
                onIdeaClick={onIdeaClick}
                onIdeaDelete={onIdeaDelete}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
