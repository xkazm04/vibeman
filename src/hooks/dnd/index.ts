/**
 * @fileoverview Reusable Drag and Drop Hook Library
 *
 * This library provides a set of composable hooks for implementing drag and drop
 * functionality with @dnd-kit. The hooks are designed to work together or independently,
 * eliminating code duplication and establishing consistent DnD patterns across the codebase.
 *
 * ## Available Hooks
 *
 * - `useDragDropContext` - Sensor setup, event handling, and DnD configuration
 * - `useDropZoneValidator` - Drop validation logic with whitelist/blacklist support
 * - `useDragState` - Centralized drag state management with clear transitions
 * - `useDraggableItem` - Wrapper for @dnd-kit's useDraggable with common patterns
 * - `useDroppableZone` - Wrapper for @dnd-kit's useDroppable with common patterns
 *
 * ## Quick Start
 *
 * ```tsx
 * import {
 *   useDragDropContext,
 *   useDropZoneValidator,
 *   useDragState,
 *   DEFAULT_TARGET_TRANSFORMS,
 * } from '@/hooks/dnd';
 *
 * function MyDragDropContainer() {
 *   // State management
 *   const { activeId, isDragging, startDrag, endDrag } = useDragState();
 *
 *   // Validation
 *   const { canDrop, transformTarget } = useDropZoneValidator({
 *     targetTransforms: DEFAULT_TARGET_TRANSFORMS.UNGROUPED,
 *   });
 *
 *   // DnD context setup
 *   const { sensors, handleDragStart, handleDragEnd, dropAnimation } = useDragDropContext({
 *     onDrop: async (activeId, overId) => {
 *       const targetId = transformTarget(overId);
 *       await moveItem(activeId, targetId);
 *     },
 *     validateDrop: canDrop,
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
 *         {activeId && <DragPreview id={activeId} />}
 *       </DragOverlay>
 *     </DndContext>
 *   );
 * }
 * ```
 *
 * @module hooks/dnd
 */

// Main hooks
export {
  useDragDropContext,
  type UseDragDropContextOptions,
  type UseDragDropContextReturn,
  type PointerSensorOptions,
  type DropAnimationConfig,
  type DragStateTransition,
  type OnDropCallback,
  type OnDragStateChangeCallback,
} from './useDragDropContext';

export {
  useDropZoneValidator,
  DEFAULT_TARGET_TRANSFORMS,
  type UseDropZoneValidatorOptions,
  type UseDropZoneValidatorReturn,
  type DropValidationContext,
  type CustomDropValidator,
} from './useDropZoneValidator';

export {
  useDragState,
  type UseDragStateOptions,
  type UseDragStateReturn,
  type DragState,
  type OnDragStateChange,
} from './useDragState';

export {
  useDraggableItem,
  type UseDraggableItemOptions,
  type UseDraggableItemReturn,
} from './useDraggableItem';

export {
  useDroppableZone,
  type UseDroppableZoneOptions,
  type UseDroppableZoneReturn,
  type DropZoneState,
} from './useDroppableZone';
