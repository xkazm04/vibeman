import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ContextJailCard from '@/components/ContextComponents/ContextJailCard';
import ContextMenu from '../ContextMenu/ContextMenu';
import { useTooltipStore } from '../../../../stores/tooltipStore';
import { Context, ContextGroup } from '../../../../stores/contextStore';
import MoveToGroupMenu from './components/MoveToGroupMenu';
import { useDraggableItem } from '@/hooks/dnd';

// DnD activation delay in milliseconds - must match ContextLayout.tsx sensorOptions.delay
const DND_ACTIVATION_DELAY = 300;

interface ContextJailCardWrapperProps {
  context: Context;
  group?: ContextGroup;
  index: number;
  fontSize: string;
  availableGroups: ContextGroup[];
  onMoveContext?: (contextId: string, groupId: string | null) => void;
}

/**
 * Wrapper for ContextJailCard in Context Groups view
 * Adds tooltip toggle on click, context menu on right-click, Drag & Drop,
 * and full keyboard accessibility support
 *
 * Keyboard shortcuts:
 * - Enter/Space: Toggle tooltip (select)
 * - M: Open move-to-group menu
 * - Context Menu key: Open context menu
 */
const ContextJailCardWrapper = React.memo<ContextJailCardWrapperProps>(({
  context,
  group,
  index,
  fontSize,
  availableGroups,
  onMoveContext,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
  }>({
    isVisible: false,
    position: { x: 0, y: 0 }
  });

  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [moveMenuPosition, setMoveMenuPosition] = useState({ x: 0, y: 0 });
  const [isPendingDrag, setIsPendingDrag] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const pendingDragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toggleTooltip } = useTooltipStore();

  // DnD Draggable - using reusable hook
  const {
    ref: setNodeRef,
    attributes,
    listeners,
    isDragging,
    ghostStyle,
  } = useDraggableItem({
    id: context.id,
    data: { item: context, type: 'context', sourceId: group?.id },
    ariaRole: 'button',
    ariaDescription: `context-card-help-${context.id}`,
    showGhostWhenDragging: true,
    ghostOpacity: 0.3,
    ghostGrayscale: true,
  });

  // Clear pending drag state when dragging actually starts
  useEffect(() => {
    if (isDragging) {
      setIsPendingDrag(false);
      if (pendingDragTimeoutRef.current) {
        clearTimeout(pendingDragTimeoutRef.current);
        pendingDragTimeoutRef.current = null;
      }
    }
  }, [isDragging]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pendingDragTimeoutRef.current) {
        clearTimeout(pendingDragTimeoutRef.current);
      }
    };
  }, []);

  // Cancel pending drag animation
  const cancelPendingDrag = useCallback(() => {
    setIsPendingDrag(false);
    if (pendingDragTimeoutRef.current) {
      clearTimeout(pendingDragTimeoutRef.current);
      pendingDragTimeoutRef.current = null;
    }
  }, []);

  // Combined pointer down handler - starts animation AND calls DnD-kit's handler
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only for primary button (left click)
    if (e.button === 0) {
      setIsPendingDrag(true);

      // Clear pending state after the activation delay
      pendingDragTimeoutRef.current = setTimeout(() => {
        setIsPendingDrag(false);
      }, DND_ACTIVATION_DELAY);
    }

    // Call DnD-kit's original handler
    if (listeners?.onPointerDown) {
      (listeners.onPointerDown as (e: React.PointerEvent) => void)(e);
    }
  }, [listeners]);

  // Handle pointer up to cancel pending drag animation
  const handlePointerUp = useCallback(() => {
    cancelPendingDrag();
  }, [cancelPendingDrag]);

  // Handle pointer leave to cancel pending drag animation
  const handlePointerLeave = useCallback(() => {
    cancelPendingDrag();
  }, [cancelPendingDrag]);

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

  // Open move menu at card position
  const openMoveMenu = useCallback(() => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setMoveMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
      setShowMoveMenu(true);
    }
  }, []);

  // Close move menu
  const closeMoveMenu = useCallback(() => {
    setShowMoveMenu(false);
  }, []);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        toggleTooltip(context, group?.color || '#06b6d4');
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        e.stopPropagation();
        openMoveMenu();
        break;
      case 'ContextMenu':
      case 'F10':
        if (e.shiftKey || e.key === 'ContextMenu') {
          e.preventDefault();
          e.stopPropagation();
          if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            setContextMenu({
              isVisible: true,
              position: { x: rect.right, y: rect.top }
            });
          }
        }
        break;
      case 'Escape':
        if (showMoveMenu) {
          e.preventDefault();
          closeMoveMenu();
        }
        break;
    }
  }, [context, group?.color, toggleTooltip, openMoveMenu, showMoveMenu, closeMoveMenu]);

  // Handle move to group
  const handleMoveToGroup = useCallback((groupId: string | null) => {
    if (onMoveContext) {
      onMoveContext(context.id, groupId);
    }
    closeMoveMenu();
  }, [context.id, onMoveContext, closeMoveMenu]);

  // Combine refs
  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [setNodeRef]);

  // Show ghost placeholder when dragging - using hook's ghostStyle
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...ghostStyle, height: '100%' }}
        data-testid={`context-card-ghost-${context.id}`}
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

  // Spread listeners but exclude onPointerDown which we handle manually
  const { onPointerDown: _dndPointerDown, ...otherListeners } = listeners || {};

  return (
    <div
      ref={combinedRef}
      {...otherListeners}
      {...attributes}
      style={{ height: '100%', position: 'relative' }}
      tabIndex={0}
      role="button"
      aria-label={`Context: ${context.name}. Press M to move, Enter to select, or right-click for more options.`}
      aria-describedby={`context-card-help-${context.id}`}
      data-context-card
      data-context-id={context.id}
      data-testid={`context-card-${context.id}`}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className="focus:outline-none rounded-lg"
    >
      {/* Scan Line Animation - appears during DnD activation delay */}
      <AnimatePresence>
        {isPendingDrag && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
          >
            {/* Scanning line that moves from left to right */}
            <motion.div
              className="absolute top-0 bottom-0 w-1"
              style={{
                background: `linear-gradient(to bottom, transparent, ${group?.color || '#06b6d4'}, transparent)`,
                boxShadow: `0 0 12px 2px ${group?.color || '#06b6d4'}`,
              }}
              initial={{ left: 0 }}
              animate={{ left: '100%' }}
              transition={{
                duration: DND_ACTIVATION_DELAY / 1000,
                ease: 'linear',
              }}
            />
            {/* Subtle overlay glow following the scan line */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, ${group?.color || '#06b6d4'}15, transparent)`,
              }}
              initial={{ opacity: 0.5, scaleX: 0 }}
              animate={{ opacity: 0, scaleX: 1 }}
              transition={{
                duration: DND_ACTIVATION_DELAY / 1000,
                ease: 'linear',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen reader help text */}
      <span id={`context-card-help-${context.id}`} className="sr-only">
        Use arrow keys to navigate between cards. Press M to move to another group.
        Press Enter or Space to select. Press Context Menu key or Shift+F10 for more options.
      </span>

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

      {/* Move to Group Menu (keyboard accessible) */}
      <MoveToGroupMenu
        isOpen={showMoveMenu}
        position={moveMenuPosition}
        groups={availableGroups}
        currentGroupId={context.groupId}
        onMoveToGroup={handleMoveToGroup}
        onClose={closeMoveMenu}
      />
    </div>
  );
});

ContextJailCardWrapper.displayName = 'ContextJailCardWrapper';

export default ContextJailCardWrapper;
