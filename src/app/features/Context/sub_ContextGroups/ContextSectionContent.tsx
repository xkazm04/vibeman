import React from 'react';
import { motion } from 'framer-motion';
import { Context, ContextGroup } from '../../../../stores/contextStore';
import ContextCards from './ContextCards';

interface ContextSectionContentProps {
  group?: ContextGroup;
  contexts: Context[];
  availableGroups: ContextGroup[];
  selectedFilePaths: string[];
  showFullScreenModal: (title: string, content: React.ReactNode, options?: any) => void;
  isExpanded: boolean;
  onMoveContext?: (contextId: string, groupId: string | null) => void;
}

const ContextSectionContent = React.memo(({
  group,
  contexts,
  availableGroups,
  showFullScreenModal,
  isExpanded,
  onMoveContext,
}: ContextSectionContentProps) => {
  return (
    <>
      {/* Neural Background Effects */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: `linear-gradient(135deg, ${group?.color}20 0%, transparent 50%, ${group?.color}10 100%)`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />
      
      {/* Animated Neural Grid */}
      <motion.div
        className="absolute inset-0 opacity-5 rounded-2xl"
        style={{
          backgroundImage: `
            linear-gradient(${group?.color}30 1px, transparent 1px),
            linear-gradient(90deg, ${group?.color}30 1px, transparent 1px)
          `,
          backgroundSize: '12px 12px'
        }}
        animate={{
          backgroundPosition: ['0px 0px', '12px 12px'],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Floating Neural Particles */}
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            backgroundColor: `${group?.color}60`,
            left: `${20 + i * 20}%`,
            top: `${20 + i * 15}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Context Cards */}
      {isExpanded && (
        <ContextCards
          contexts={contexts}
          group={group}
          availableGroups={availableGroups}
          showFullScreenModal={showFullScreenModal}
          onMoveContext={onMoveContext}
        />
      )}
    </>
  );
});

ContextSectionContent.displayName = 'ContextSectionContent';

export default ContextSectionContent;