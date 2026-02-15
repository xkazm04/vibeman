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
}, (prevProps, nextProps) => {
  if (prevProps.group?.id !== nextProps.group?.id) return false;
  if (prevProps.group?.color !== nextProps.group?.color) return false;
  if (prevProps.isExpanded !== nextProps.isExpanded) return false;
  if (prevProps.onMoveContext !== nextProps.onMoveContext) return false;

  // Compare contexts by length + IDs
  if (prevProps.contexts.length !== nextProps.contexts.length) return false;
  for (let i = 0; i < prevProps.contexts.length; i++) {
    const prev = prevProps.contexts[i];
    const next = nextProps.contexts[i];
    if (prev.id !== next.id || prev.groupId !== next.groupId || prev.updatedAt !== next.updatedAt) return false;
  }

  // Compare availableGroups by length + IDs
  if (prevProps.availableGroups.length !== nextProps.availableGroups.length) return false;
  for (let i = 0; i < prevProps.availableGroups.length; i++) {
    if (prevProps.availableGroups[i].id !== nextProps.availableGroups[i].id) return false;
  }

  return true;
});

ContextSectionContent.displayName = 'ContextSectionContent';

export default ContextSectionContent;