'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Loader2 } from 'lucide-react';
import { DbIdea } from '@/app/db';
import IdeaStickyNote from './IdeaStickyNote';
import { GroupedIdeas } from '../lib/ideasUtils';

interface IdeasContentProps {
  loading: boolean;
  ideas: DbIdea[];
  groupedIdeas: GroupedIdeas;
  getProjectName: (projectId: string) => string;
  getContextName: (contextId: string) => string;
  onIdeaClick: (idea: DbIdea) => void;
}

export default function IdeasContent({
  loading,
  ideas,
  groupedIdeas,
  getProjectName,
  getContextName,
  onIdeaClick,
}: IdeasContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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

  return (
    <div className="space-y-12">
      {Object.entries(groupedIdeas).map(([projectId, contexts]) => (
        <motion.div
          key={projectId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full" />
            <span>{getProjectName(projectId)}</span>
          </h2>

          <div className="space-y-8">
            {Object.entries(contexts).map(([contextId, contextIdeas]) => (
              <div key={contextId}>
                {contextId !== 'no-context' && (
                  <h3 className="text-sm font-medium text-gray-400 mb-4 ml-4">
                    📂 {getContextName(contextId)}
                  </h3>
                )}

                {/* Sticky Notes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {contextIdeas.map((idea, index) => (
                    <IdeaStickyNote
                      key={idea.id}
                      idea={idea}
                      index={index}
                      onClick={() => onIdeaClick(idea)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
