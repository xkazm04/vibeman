import React, { useState, useCallback } from 'react';
import ContextJailCard from '@/components/ContextComponents/ContextJailCard';
import ContextMenu from '../ContextMenu/ContextMenu';
import { useTooltipStore } from '../../../../stores/tooltipStore';

/**
 * Wrapper for ContextJailCard in Context Groups view
 * Adds tooltip toggle on click and context menu on right-click
 */
const ContextJailCardWrapper = React.memo(({
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

  return (
    <>
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
    </>
  );
});

ContextJailCardWrapper.displayName = 'ContextJailCardWrapper';

export default ContextJailCardWrapper;
