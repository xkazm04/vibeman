import React from 'react';
import { ContextSectionContentProps } from './types';
import ContextCards from './ContextCards';
import './context-section-animations.css';

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

      {/* Animated Neural Grid - CSS animation instead of Framer Motion */}
      <div
        className="absolute inset-0 opacity-5 rounded-2xl context-neural-grid"
        style={{
          '--grid-color': `${group?.color}30`,
        } as React.CSSProperties}
      />

      {/* Floating Neural Particles - CSS animations instead of Framer Motion */}
      <div
        className="absolute w-1 h-1 rounded-full context-particle context-particle-0"
        style={{ '--particle-color': `${group?.color}60` } as React.CSSProperties}
      />
      <div
        className="absolute w-1 h-1 rounded-full context-particle context-particle-1"
        style={{ '--particle-color': `${group?.color}60` } as React.CSSProperties}
      />
      <div
        className="absolute w-1 h-1 rounded-full context-particle context-particle-2"
        style={{ '--particle-color': `${group?.color}60` } as React.CSSProperties}
      />
      <div
        className="absolute w-1 h-1 rounded-full context-particle context-particle-3"
        style={{ '--particle-color': `${group?.color}60` } as React.CSSProperties}
      />

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