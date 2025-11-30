import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Context, ContextGroup } from '../../../../stores/contextStore';
import { useGlobalModal } from '../../../../hooks/useGlobalModal';
import ContextSectionEmpty from './ContextSectionEmpty';
import ContextSectionHeader from './ContextSectionHeader';
import ContextSectionContent from './ContextSectionContent';
import { generateGlassGradient } from './lib/gradientUtils';
import { useDroppableZone } from '@/hooks/dnd';

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
  onMoveContext?: (contextId: string, groupId: string | null) => void;
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
  isDragActive = false,
  onMoveContext,
}: ContextSectionProps) => {
  const { showFullScreenModal } = useGlobalModal();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // DnD Droppable - using reusable hook
  const { ref: setNodeRef, isOver, zoneState, testId } = useDroppableZone({
    id: group?.id || 'synthetic-to-group',
    data: { group },
    isDragActive,
    applyStyles: false, // We use custom styling
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

  // Visual state for "Areas Mode" - derived from zoneState
  const showAreaMode = zoneState === 'ready' || zoneState === 'hover';
  const isTargeted = zoneState === 'hover';

  // Generate glass gradient based on group colors
  const glassStyle = useMemo(() => {
    if (!group?.color) return null;
    return generateGlassGradient(group.color, group.accentColor);
  }, [group?.color, group?.accentColor]);

  // Group exists
  return (
    <motion.div
      ref={setNodeRef}
      data-testid={testId}
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
      {/* Dynamic Glass Gradient Effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{
          background: glassStyle?.background || 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)',
        }}
        animate={{
          opacity: isHovered ? 1.2 : 1,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Glass Reflection Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

      {/* Animated Border Glow with Gradient */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 20px ${glassStyle?.shadowColor || group?.color + '20'}`,
          background: group?.accentColor
            ? `linear-gradient(135deg, ${group.color}10 0%, ${group.accentColor}05 100%)`
            : undefined,
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
          onMoveContext={onMoveContext}
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