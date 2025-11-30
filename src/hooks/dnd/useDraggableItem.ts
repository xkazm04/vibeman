/**
 * @fileoverview Draggable item wrapper hook for @dnd-kit
 *
 * This hook wraps @dnd-kit's useDraggable with common patterns and
 * additional features like keyboard support and visual state management.
 *
 * @example Basic usage
 * ```tsx
 * import { useDraggableItem } from '@/hooks/dnd/useDraggableItem';
 *
 * function DraggableCard({ item }: { item: Item }) {
 *   const {
 *     ref,
 *     attributes,
 *     listeners,
 *     isDragging,
 *     dragStyle,
 *   } = useDraggableItem({
 *     id: item.id,
 *     data: { item, type: 'card' },
 *   });
 *
 *   return (
 *     <div
 *       ref={ref}
 *       {...attributes}
 *       {...listeners}
 *       style={dragStyle}
 *       className={isDragging ? 'opacity-50' : ''}
 *     >
 *       {item.name}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With ghost placeholder
 * ```tsx
 * const { isDragging, GhostPlaceholder } = useDraggableItem({
 *   id: item.id,
 *   showGhostWhenDragging: true,
 * });
 *
 * return (
 *   <>
 *     {isDragging && <GhostPlaceholder />}
 *     <DraggableCard />
 *   </>
 * );
 * ```
 */

import { useCallback, useMemo, CSSProperties, RefCallback } from 'react';
import { useDraggable, DraggableAttributes } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

/**
 * Data passed to the draggable
 */
export interface DraggableData<T = unknown> {
  /** The item being dragged */
  item?: T;
  /** Type identifier for the draggable */
  type?: string;
  /** Source container ID */
  sourceId?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Hook configuration options
 */
export interface UseDraggableItemOptions<T = unknown> {
  /** Unique identifier for the draggable */
  id: string;
  /** Data to pass with the draggable */
  data?: DraggableData<T>;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** ARIA role for accessibility (default: 'button') */
  ariaRole?: string;
  /** ARIA description for the item */
  ariaDescription?: string;
  /** Whether to show a ghost placeholder when dragging */
  showGhostWhenDragging?: boolean;
  /** Ghost placeholder opacity (default: 0.3) */
  ghostOpacity?: number;
  /** Whether to apply grayscale to ghost (default: true) */
  ghostGrayscale?: boolean;
}

/**
 * Return value from useDraggableItem hook
 */
export interface UseDraggableItemReturn {
  /** Ref callback to attach to the draggable element */
  ref: RefCallback<HTMLElement>;
  /** Draggable attributes for accessibility */
  attributes: DraggableAttributes;
  /** Event listeners for drag events */
  listeners: ReturnType<typeof useDraggable>['listeners'];
  /** Whether the item is currently being dragged */
  isDragging: boolean;
  /** Transform style for the drag preview */
  transform: ReturnType<typeof useDraggable>['transform'];
  /** Pre-computed CSS transform string */
  dragStyle: CSSProperties;
  /** Ghost placeholder style for when item is dragging */
  ghostStyle: CSSProperties;
  /** Whether to show the ghost placeholder */
  showGhost: boolean;
}

/**
 * A wrapper hook for @dnd-kit's useDraggable with common patterns.
 *
 * Provides:
 * - Simplified ref + listeners + attributes binding
 * - Pre-computed drag styles
 * - Ghost placeholder support
 * - Accessibility attributes
 *
 * @param options - Configuration options
 * @returns Draggable state and props
 */
export function useDraggableItem<T = unknown>(
  options: UseDraggableItemOptions<T>
): UseDraggableItemReturn {
  const {
    id,
    data,
    disabled = false,
    ariaRole = 'button',
    ariaDescription,
    showGhostWhenDragging = false,
    ghostOpacity = 0.3,
    ghostGrayscale = true,
  } = options;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data,
    disabled,
  });

  // Compute drag transform style
  const dragStyle: CSSProperties = useMemo(() => {
    if (!transform) return {};
    return {
      transform: CSS.Translate.toString(transform),
    };
  }, [transform]);

  // Ghost placeholder style
  const ghostStyle: CSSProperties = useMemo(() => ({
    opacity: ghostOpacity,
    ...(ghostGrayscale ? { filter: 'grayscale(100%)' } : {}),
    pointerEvents: 'none' as const,
  }), [ghostOpacity, ghostGrayscale]);

  // Enhanced attributes with accessibility
  const enhancedAttributes: DraggableAttributes = useMemo(() => ({
    ...attributes,
    role: ariaRole,
    ...(ariaDescription ? { 'aria-describedby': ariaDescription } : {}),
  }), [attributes, ariaRole, ariaDescription]);

  const showGhost = showGhostWhenDragging && isDragging;

  return {
    ref: setNodeRef,
    attributes: enhancedAttributes,
    listeners,
    isDragging,
    transform,
    dragStyle,
    ghostStyle,
    showGhost,
  };
}
