/**
 * @fileoverview Reusable drag and drop context hook for @dnd-kit
 *
 * This hook encapsulates the common sensor setup, configuration, and event handling
 * patterns used across the codebase for drag and drop functionality.
 *
 * @example Basic usage
 * ```tsx
 * import { useDragDropContext } from '@/hooks/dnd/useDragDropContext';
 * import { DndContext, DragOverlay } from '@dnd-kit/core';
 *
 * function MyComponent() {
 *   const {
 *     sensors,
 *     activeId,
 *     isDragActive,
 *     handleDragStart,
 *     handleDragEnd,
 *     dropAnimation,
 *   } = useDragDropContext({
 *     onDrop: async (activeId, overId) => {
 *       await moveItem(activeId, overId);
 *     },
 *   });
 *
 *   return (
 *     <DndContext
 *       sensors={sensors}
 *       onDragStart={handleDragStart}
 *       onDragEnd={handleDragEnd}
 *     >
 *       {children}
 *       <DragOverlay dropAnimation={dropAnimation}>
 *         {activeItem && <DragPreview item={activeItem} />}
 *       </DragOverlay>
 *     </DndContext>
 *   );
 * }
 * ```
 *
 * @example With custom sensor configuration
 * ```tsx
 * const { sensors, ...rest } = useDragDropContext({
 *   onDrop: handleDrop,
 *   sensorOptions: {
 *     delay: 300,
 *     tolerance: 10,
 *   },
 * });
 * ```
 */

import { useCallback, useState, useMemo } from 'react';
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragCancelEvent,
  DropAnimation,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Configuration options for pointer sensor activation
 */
export interface PointerSensorOptions {
  /** Delay in milliseconds before drag activates (default: 500ms) */
  delay?: number;
  /** Movement tolerance in pixels before drag activates (default: 5px) */
  tolerance?: number;
}

/**
 * Configuration for the drop animation
 */
export interface DropAnimationConfig {
  /** Whether to apply opacity fade during drop (default: true) */
  fadeOnDrop?: boolean;
  /** Opacity value during active drag (default: 0.5) */
  activeOpacity?: string;
  /** Custom duration in milliseconds */
  duration?: number;
}

/**
 * State transition callback for drag events
 */
export type DragStateTransition = 'start' | 'move' | 'end' | 'cancel';

/**
 * Callback invoked when an item is dropped on a valid target
 */
export type OnDropCallback = (
  activeId: string,
  overId: string | null,
  event: DragEndEvent
) => void | Promise<void>;

/**
 * Callback invoked when drag state changes
 */
export type OnDragStateChangeCallback = (
  transition: DragStateTransition,
  activeId: string | null
) => void;

/**
 * Hook configuration options
 */
export interface UseDragDropContextOptions {
  /** Callback when an item is dropped */
  onDrop: OnDropCallback;
  /** Optional callback when drag starts */
  onDragStart?: (event: DragStartEvent) => void;
  /** Optional callback during drag over */
  onDragOver?: (event: DragOverEvent) => void;
  /** Optional callback when drag is cancelled */
  onDragCancel?: (event: DragCancelEvent) => void;
  /** Optional callback for drag state transitions */
  onStateChange?: OnDragStateChangeCallback;
  /** Pointer sensor configuration */
  sensorOptions?: PointerSensorOptions;
  /** Drop animation configuration */
  dropAnimationConfig?: DropAnimationConfig;
  /** Enable keyboard navigation (default: false) */
  enableKeyboard?: boolean;
  /** Custom validation before drop */
  validateDrop?: (activeId: string, overId: string) => boolean;
}

/**
 * Return value from useDragDropContext hook
 */
export interface UseDragDropContextReturn {
  /** Configured sensors for DndContext */
  sensors: ReturnType<typeof useSensors>;
  /** Currently dragged item ID, or null */
  activeId: string | null;
  /** Whether a drag is currently in progress */
  isDragActive: boolean;
  /** Handler for DndContext onDragStart */
  handleDragStart: (event: DragStartEvent) => void;
  /** Handler for DndContext onDragEnd */
  handleDragEnd: (event: DragEndEvent) => void;
  /** Handler for DndContext onDragOver */
  handleDragOver: (event: DragOverEvent) => void;
  /** Handler for DndContext onDragCancel */
  handleDragCancel: (event: DragCancelEvent) => void;
  /** Pre-configured drop animation */
  dropAnimation: DropAnimation;
  /** Reset drag state programmatically */
  resetDragState: () => void;
}

/**
 * A reusable hook that encapsulates common drag and drop patterns for @dnd-kit.
 *
 * Provides:
 * - Pre-configured pointer sensor with customizable delay/tolerance
 * - Optional keyboard sensor for accessibility
 * - Drag state management (activeId, isDragActive)
 * - Drop animation configuration
 * - State transition callbacks
 * - Drop validation support
 *
 * @param options - Configuration options for the DnD context
 * @returns DnD context state and handlers ready for use with DndContext
 */
export function useDragDropContext(
  options: UseDragDropContextOptions
): UseDragDropContextReturn {
  const {
    onDrop,
    onDragStart: onDragStartCallback,
    onDragOver: onDragOverCallback,
    onDragCancel: onDragCancelCallback,
    onStateChange,
    sensorOptions = {},
    dropAnimationConfig = {},
    enableKeyboard = false,
    validateDrop,
  } = options;

  const {
    delay = 500,
    tolerance = 5,
  } = sensorOptions;

  const {
    fadeOnDrop = true,
    activeOpacity = '0.5',
    duration,
  } = dropAnimationConfig;

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Configure sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      delay,
      tolerance,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(
    pointerSensor,
    ...(enableKeyboard ? [keyboardSensor] : [])
  );

  // Drop animation configuration
  const dropAnimation: DropAnimation = useMemo(() => ({
    ...(duration ? { duration } : {}),
    sideEffects: fadeOnDrop
      ? defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: activeOpacity,
            },
          },
        })
      : undefined,
  }), [fadeOnDrop, activeOpacity, duration]);

  // Event handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    setIsDragActive(true);
    onStateChange?.('start', id);
    onDragStartCallback?.(event);
  }, [onDragStartCallback, onStateChange]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    onStateChange?.('move', activeId);
    onDragOverCallback?.(event);
  }, [activeId, onDragOverCallback, onStateChange]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedId = active.id as string;
    const targetId = over?.id as string | null;

    // Reset state
    setActiveId(null);
    setIsDragActive(false);
    onStateChange?.('end', null);

    // Validate and execute drop
    if (targetId && draggedId !== targetId) {
      const isValid = validateDrop ? validateDrop(draggedId, targetId) : true;
      if (isValid) {
        await onDrop(draggedId, targetId, event);
      }
    }
  }, [onDrop, onStateChange, validateDrop]);

  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    setActiveId(null);
    setIsDragActive(false);
    onStateChange?.('cancel', null);
    onDragCancelCallback?.(event);
  }, [onDragCancelCallback, onStateChange]);

  const resetDragState = useCallback(() => {
    setActiveId(null);
    setIsDragActive(false);
  }, []);

  return {
    sensors,
    activeId,
    isDragActive,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragCancel,
    dropAnimation,
    resetDragState,
  };
}
