'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle } from 'lucide-react';
import { DbIdea } from '@/app/db';
import BufferItem from './BufferItem';
import { createIdeaStagingBuffer } from '@/lib/staging-buffer';

const ideaStagingBuffer = createIdeaStagingBuffer<DbIdea>();

// ── Category accent colors ──────────────────────────────────────────────────
// Maps category color names (from ideaConfig) to Tailwind-compatible border/bg values.
const CATEGORY_ACCENTS: Record<string, { border: string; headerBg: string; dot: string }> = {
  blue:   { border: 'border-l-blue-500/60',   headerBg: 'from-blue-500/10 to-transparent',   dot: 'bg-blue-400' },
  pink:   { border: 'border-l-pink-500/60',   headerBg: 'from-pink-500/10 to-transparent',   dot: 'bg-pink-400' },
  green:  { border: 'border-l-emerald-500/60', headerBg: 'from-emerald-500/10 to-transparent', dot: 'bg-emerald-400' },
  amber:  { border: 'border-l-amber-500/60',  headerBg: 'from-amber-500/10 to-transparent',  dot: 'bg-amber-400' },
  purple: { border: 'border-l-purple-500/60', headerBg: 'from-purple-500/10 to-transparent', dot: 'bg-purple-400' },
  red:    { border: 'border-l-red-500/60',    headerBg: 'from-red-500/10 to-transparent',    dot: 'bg-red-400' },
  gray:   { border: 'border-l-zinc-500/40',   headerBg: 'from-zinc-500/8 to-transparent',    dot: 'bg-zinc-400' },
};

const DEFAULT_ACCENT = CATEGORY_ACCENTS.gray;

interface BufferColumnProps {
  contextName: string;
  contextId: string | null;
  ideas: DbIdea[];
  projectName: string;
  /** Category color name from ideaConfig (e.g. 'blue', 'pink') */
  accentColor?: string;
  onIdeaClick: (idea: DbIdea) => void;
  onIdeaDelete: (ideaId: string) => void;
  onContextDelete?: (contextId: string) => void;
  onIdeaConvert?: (ideaId: string) => void;
  onIdeaQueueForExecution?: (ideaId: string) => void;
}

const BufferColumn = React.memo(function BufferColumn({
  contextName,
  contextId,
  ideas,
  accentColor,
  onIdeaClick,
  onIdeaDelete,
  onContextDelete,
  onIdeaConvert,
  onIdeaQueueForExecution,
}: BufferColumnProps) {
  const accent = (accentColor && CATEGORY_ACCENTS[accentColor]) || DEFAULT_ACCENT;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [scrolledTop, setScrolledTop] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setScrolledTop(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  useEffect(() => {
    handleScroll();
  }, [handleScroll, ideas.length]);

  const handleDeleteAll = () => {
    if (!onContextDelete || isDeleting) return;
    setShowConfirm(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!onContextDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onContextDelete(contextId ?? 'no-context');
      setShowConfirm(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete ideas');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
    setDeleteError(null);
  };
  // Sort ideas by status order then category, using the staging buffer abstraction
  const sortedIdeas = React.useMemo(() => {
    return ideaStagingBuffer.sort(ideas);
  }, [ideas]);

  return (
    <motion.div
      className={`flex flex-col bg-gradient-to-b from-gray-900/50 to-gray-900/30 border border-gray-700/40 border-l-2 ${accent.border} rounded-xl overflow-hidden transition-all duration-300 ease-out hover:border-gray-600/60 hover:bg-gray-900/50 hover:shadow-xl hover:shadow-black/40 backdrop-blur-sm`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: -100 }}
      transition={{ duration: 0.3 }}
      whileHover={{
        y: -3,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      layout
      data-testid={`buffer-column-${contextId || 'no-context'}`}
    >
      {/* Header */}
      <div className={`px-3 py-2.5 bg-gradient-to-r ${accent.headerBg} border-b border-gray-700/40 backdrop-blur-sm`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent.dot}`} />
            <h3 className="text-sm font-semibold text-gray-300 truncate" title={contextName}>
              {contextName}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-mono">
              {ideas.length}
            </span>
            {/* Show delete button for any column with ideas (including General/no-context) */}
            {ideas.length > 0 && !showConfirm && (
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
        {/* Inline delete confirmation */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mt-1">
                <p className="text-[11px] text-red-300 mb-2">
                  Delete {ideas.length} idea{ideas.length !== 1 ? 's' : ''} in &quot;{contextName}&quot;? This cannot be undone.
                </p>
                {deleteError && (
                  <p className="text-[10px] text-red-400 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {deleteError}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-2 py-1 text-[11px] font-medium bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded text-red-300 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                    className="px-2 py-1 text-[11px] font-medium bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/40 rounded text-gray-400 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ideas List */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className={`flex-1 px-2 py-2 space-y-1 min-h-[100px] max-h-[400px] overflow-y-auto custom-scrollbar scroll-smooth transition-shadow duration-200 ${scrolledTop ? 'shadow-[inset_0_8px_6px_-6px_rgba(0,0,0,0.3)]' : ''}`}
        style={{
          maskImage: `linear-gradient(to bottom, ${scrolledTop ? 'transparent' : 'black'}, black 8px, black calc(100% - 8px), ${canScrollDown ? 'transparent' : 'black'})`,
          WebkitMaskImage: `linear-gradient(to bottom, ${scrolledTop ? 'transparent' : 'black'}, black 8px, black calc(100% - 8px), ${canScrollDown ? 'transparent' : 'black'})`,
        }}>
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
              onConvert={onIdeaConvert}
              onQueueForExecution={onIdeaQueueForExecution}
            />
          ))
        )}
      </div>
    </motion.div>
  );
});

export default BufferColumn;
