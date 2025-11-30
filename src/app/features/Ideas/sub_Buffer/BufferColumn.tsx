'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { DbIdea } from '@/app/db';
import BufferItem from './BufferItem';

interface BufferColumnProps {
  contextName: string;
  contextId: string | null;
  ideas: DbIdea[];
  projectName: string;
  onIdeaClick: (idea: DbIdea) => void;
  onIdeaDelete: (ideaId: string) => void;
  onContextDelete?: (contextId: string) => void;
}

const BufferColumn = React.memo(function BufferColumn({
  contextName,
  contextId,
  ideas,
  onIdeaClick,
  onIdeaDelete,
  onContextDelete,
}: BufferColumnProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async () => {
    if (!onContextDelete) {
      return;
    }

    if (isDeleting) {
      return;
    }
    
    const confirmed = window.confirm(
      `Delete all ${ideas.length} idea(s) in "${contextName}" context?`
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      // Pass contextId or 'no-context' for General ideas (null context_id)
      await onContextDelete(contextId ?? 'no-context');
    } catch (error) {
      alert('Failed to delete ideas');
    } finally {
      setIsDeleting(false);
    }
  };
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
      className="flex flex-col bg-gray-900/40 border border-gray-700/40 rounded-lg overflow-hidden transition-all duration-200 hover:border-gray-600/60 hover:bg-gray-900/50 hover:shadow-lg hover:shadow-black/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: -100 }}
      transition={{ duration: 0.3 }}
      whileHover={{
        y: -2,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      layout
      data-testid={`buffer-column-${contextId || 'no-context'}`}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-gray-800/60 border-b border-gray-700/40">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-300 truncate" title={contextName}>
            {contextName}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-mono">
              {ideas.length}
            </span>
            {/* Show delete button for any column with ideas (including General/no-context) */}
            {ideas.length > 0 && (
              <motion.button
                data-testid={`buffer-column-delete-all-${contextId || 'no-context'}`}
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="p-1 hover:bg-red-500/20 rounded transition-all duration-200 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={`Delete all ideas in ${contextName}`}
                aria-label={`Delete all ${ideas.length} ideas in ${contextName}`}
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </motion.button>
            )}
          </div>
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
