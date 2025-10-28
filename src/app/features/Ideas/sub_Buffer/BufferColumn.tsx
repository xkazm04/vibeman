'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DbIdea } from '@/app/db';
import BufferItem from './BufferItem';

interface BufferColumnProps {
  contextName: string;
  ideas: DbIdea[];
  projectName: string;
  onIdeaClick: (idea: DbIdea) => void;
  onIdeaDelete: (ideaId: string) => void;
}

const BufferColumn = React.memo(function BufferColumn({
  contextName,
  ideas,
  projectName,
  onIdeaClick,
  onIdeaDelete,
}: BufferColumnProps) {
  // Sort ideas: First by status (Pending, Accepted, etc.), then by category (type) within each status
  const sortedIdeas = React.useMemo(() => {
    return [...ideas].sort((a, b) => {
      // First sort by status
      const statusOrder = { pending: 0, accepted: 1, implemented: 2, rejected: 3 };
      const statusDiff =
        (statusOrder[a.status as keyof typeof statusOrder] || 99) -
        (statusOrder[b.status as keyof typeof statusOrder] || 99);

      // If same status, sort by category (type)
      if (statusDiff === 0) {
        return a.category.localeCompare(b.category);
      }

      return statusDiff;
    });
  }, [ideas]);

  return (
    <motion.div
      className="flex flex-col bg-gray-900/40 border border-gray-700/40 rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700/40">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-300 truncate" title={contextName}>
            {contextName}
          </h3>
          <span className="text-[10px] text-gray-500 font-mono">
            {ideas.length}
          </span>
        </div>
      </div>

      {/* Ideas List */}
      <div className="flex-1 px-2 py-2 space-y-1 min-h-[100px] max-h-[400px] overflow-y-auto custom-scrollbar">
        {sortedIdeas.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-gray-600">
            No ideas
          </div>
        ) : (
          sortedIdeas.map((idea) => (
            <BufferItem
              key={idea.id}
              idea={idea}
              onClick={() => onIdeaClick(idea)}
              onDelete={onIdeaDelete}
            />
          ))
        )}
      </div>
    </motion.div>
  );
});

export default BufferColumn;
