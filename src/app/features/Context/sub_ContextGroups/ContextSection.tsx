import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
}

const ContextSection = React.memo(({
  group,
  contexts,
  projectId,
  className = '',
  isEmpty = false,
  onCreateGroup,
  availableGroups,
  openGroupDetail
}: ContextSectionProps) => {
  const { moveContext } = useContextStore();
  const { showFullScreenModal } = useGlobalModal();

  const [isDragOver, setIsDragOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (group) {
      setIsDragOver(true);
    }
  }, [group]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!group) return;

    const contextId = e.dataTransfer.getData('text/plain');
    if (contextId) {
      try {
        await moveContext(contextId, group.id);
      } catch (error) {
        console.error('Failed to move context:', error);
      }
    }
  }, [group, moveContext]);

  // Empty slot - show create group button
  if (isEmpty) {
    return (
      <ContextSectionEmpty 
        onCreateGroup={onCreateGroup}
        className={className}
      />
    );
  }

  // Group exists
  return (
    <motion.div
      className={`${className} relative overflow-hidden rounded-2xl border transition-all duration-300 ${isDragOver
        ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20'
        : 'border-gray-700/30 hover:border-gray-600/50'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated Border Glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0"
        style={{
          background: `linear-gradient(45deg, ${group?.color}40, transparent, ${group?.color}40)`,
          filter: 'blur(1px)',
        }}
        animate={{ opacity: isHovered ? 0.3 : 0 }}
        transition={{ duration: 0.3 }}
      />

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
        />
      </AnimatePresence>

      {/* Hover Effect Overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${group?.color}05 0%, transparent 50%, ${group?.color}05 100%)`,
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
});

ContextSection.displayName = 'ContextSection';

export default ContextSection;