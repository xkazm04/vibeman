import React, { useState, useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import ContextJailCard from '@/components/ContextComponents/ContextJailCard';
import ContextMenu from '../ContextMenu/ContextMenu';
import { useTooltipStore } from '../../../../stores/tooltipStore';
import { Context, ContextGroup } from '../../../../stores/contextStore';

interface ContextJailCardWrapperProps {
  context: Context;
  group?: ContextGroup;
  index: number;
  fontSize: string;
  availableGroups: ContextGroup[];
}

/**
 * Wrapper for ContextJailCard in Context Groups view
 * Adds tooltip toggle on click, context menu on right-click, and Drag & Drop
 */
const ContextJailCardWrapper = React.memo<ContextJailCardWrapperProps>(({
  context,
  group,
  index,
  fontSize,
  availableGroups,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
  }>({
    isVisible: false,
    position: { x: 0, y: 0 }
  });

  const { toggleTooltip } = useTooltipStore();

  // DnD Draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: context.id,
    data: { context, group }
  });

  // Memoized handlers for performance
  const handleRightClick = useCallback((ctx: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      isVisible: true,
      position: { x: e.clientX, y: e.clientY }
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handleClick = useCallback((ctx: any, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTooltip(ctx, group?.color || '#06b6d4');
  }, [group?.color, toggleTooltip]);

  // Hide original when dragging (optional, but good for visual clarity)
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="opacity-30 grayscale"
        style={{ height: '100%' }}
      >
        <ContextJailCard
          context={context}
          group={group}
          index={index}
          fontSize={fontSize}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ height: '100%' }}>
      <ContextJailCard
        context={context}
        group={group}
        index={index}
        fontSize={fontSize}
        onClick={handleClick}
        onRightClick={handleRightClick}
      />

      {/* Context Menu */}
      <ContextMenu
        context={context}
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        onClose={handleCloseContextMenu}
        availableGroups={availableGroups}
      />
    </div>
  );
});

ContextJailCardWrapper.displayName = 'ContextJailCardWrapper';

export default ContextJailCardWrapper;
