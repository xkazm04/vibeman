import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import ContextSectionEmpty from './ContextSectionEmpty';
import ContextSectionHeader from './ContextSectionHeader';
import ContextSectionContent from './ContextSectionContent';

interface ContextSectionProps {
  group?: ContextGroup;
  contexts: Context[];
  projectId: string;
  className?: string;
  isEmpty?: boolean;
  onCreateGroup?: () => void;
  availableGroups: ContextGroup[];
  openGroupDetail: (groupId: string) => void;
  isDragActive?: boolean;
}

const ContextSection = React.memo(({
  group,
  contexts,
  projectId,
  className = '',
  isEmpty = false,
  onCreateGroup,
  availableGroups,
  openGroupDetail,
  isDragActive = false
}: ContextSectionProps) => {
  const { showFullScreenModal } = useGlobalModal();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // DnD Droppable
  const { setNodeRef, isOver } = useDroppable({
    id: group?.id || 'synthetic-to-group',
    data: { group }
  });

  // Empty slot - show create group button
  if (isEmpty) {
    return (
      <ContextSectionEmpty
        onCreateGroup={onCreateGroup}
        className={className}
      />
    );
  }

  // Visual state for "Areas Mode"
  const showAreaMode = isDragActive;
  const isTargeted = isOver;

  // Group exists
  return (
    <motion.div
      ref={setNodeRef}
      className={`${className} relative overflow-hidden rounded-2xl border transition-all duration-300 
        ${isTargeted
          ? 'border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.3)] scale-[1.02]'
          : showAreaMode
            ? 'border-cyan-500/30 bg-cyan-500/5 border-dashed scale-[0.98] opacity-80'
            : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
        }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isTargeted ? 1.02 : showAreaMode ? 0.98 : 1
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Glass Reflection Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

      {/* Animated Border Glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 20px ${group?.color}20`,
        }}
        animate={{ opacity: isHovered || isTargeted ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Area Mode Label */}
      <AnimatePresence>
        {showAreaMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {isTargeted && (
              <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-cyan-500/50 text-cyan-300 font-bold tracking-wider shadow-xl">
                DROP HERE
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Neural Group Header */}
      <ContextSectionHeader
        group={group}
        contexts={contexts}
        openGroupDetail={openGroupDetail}
      />

      {/* Context Cards */}
      <AnimatePresence>
        <ContextSectionContent
          group={group}
          contexts={contexts}
          availableGroups={availableGroups}
          showFullScreenModal={showFullScreenModal}
          isExpanded={isExpanded}
          selectedFilePaths={[]}
        />
      </AnimatePresence>

      {/* Hover Highlight Line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      />
    </motion.div>
  );
});

ContextSection.displayName = 'ContextSection';

export default ContextSection;