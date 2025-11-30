/**
 * @fileoverview Drag state management hook for @dnd-kit
 *
 * This hook provides centralized drag state management with clear state transitions,
 * making it easier to track and respond to drag operations across components.
 *
 * @example Basic usage
 * ```tsx
 * import { useDragState } from '@/hooks/dnd/useDragState';
 *
 * function DraggableContainer() {
 *   const {
 *     state,
 *     activeId,
 *     isDragging,
 *     isOverTarget,
 *     startDrag,
 *     endDrag,
 *     setOverTarget,
 *   } = useDragState();
 *
 *   return (
 *     <div className={isDragging ? 'dragging' : ''}>
 *       <span>State: {state}</span>
 *       <span>Active: {activeId}</span>
 *       {isOverTarget && <span>Over valid target!</span>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With state change callbacks
 * ```tsx
 * const { state, activeId } = useDragState({
 *   onStateChange: (newState, prevState, activeId) => {
 *     console.log(`State changed: ${prevState} -> ${newState}`);
 *     if (newState === 'dragging') {
 *       // Trigger visual feedback
 *       document.body.classList.add('drag-mode');
 *     } else if (newState === 'idle') {
 *       document.body.classList.remove('drag-mode');
 *     }
 *   },
 * });
 * ```
 *
 * @example With active item data
 * ```tsx
 * const { activeItem, setActiveItem } = useDragState<MyItemType>();
 *
 * const handleDragStart = (event: DragStartEvent) => {
 *   const item = items.find(i => i.id === event.active.id);
 *   if (item) {
 *     setActiveItem(item);
 *   }
 * };
 * ```
 */

import { useCallback, useState, useRef, useMemo } from 'react';

/**
 * Possible drag states
 */
export type DragState = 'idle' | 'dragging' | 'over-target' | 'dropping';

/**
 * Callback for state changes
 */
export type OnDragStateChange<T = unknown> = (
  newState: DragState,
  prevState: DragState,
  activeId: string | null,
  activeItem: T | null
) => void;

/**
 * Hook configuration options
 */
export interface UseDragStateOptions<T = unknown> {
  /** Initial state (default: 'idle') */
  initialState?: DragState;
  /** Callback when state changes */
  onStateChange?: OnDragStateChange<T>;
  /** Debounce time for rapid state changes in ms (default: 0) */
  debounceMs?: number;
}

/**
 * Return value from useDragState hook
 */
export interface UseDragStateReturn<T = unknown> {
  /** Current drag state */
  state: DragState;
  /** Currently dragged item ID */
  activeId: string | null;
  /** Currently dragged item data */
  activeItem: T | null;
  /** Current target ID being hovered */
  targetId: string | null;
  /** Whether a drag is in progress */
  isDragging: boolean;
  /** Whether currently over a valid drop target */
  isOverTarget: boolean;
  /** Whether in the dropping animation phase */
  isDropping: boolean;

  /**
   * Start a drag operation
   * @param id - The ID of the item being dragged
   * @param item - Optional item data
   */
  startDrag: (id: string, item?: T) => void;

  /**
   * End the current drag operation
   * @param success - Whether the drop was successful
   */
  endDrag: (success?: boolean) => void;

  /**
   * Cancel the current drag operation
   */
  cancelDrag: () => void;

  /**
   * Set the current target being hovered
   * @param targetId - The target ID, or null to clear
   */
  setOverTarget: (targetId: string | null) => void;

  /**
   * Set the active item data
   * @param item - The item data
   */
  setActiveItem: (item: T | null) => void;

  /**
   * Begin the dropping animation phase
   */
  beginDrop: () => void;

  /**
   * Reset all state to idle
   */
  reset: () => void;

  /**
   * Get a snapshot of the current state
   */
  getSnapshot: () => {
    state: DragState;
    activeId: string | null;
    targetId: string | null;
    timestamp: number;
  };
}

/**
 * A hook for managing drag state with clear transitions.
 *
 * Provides:
 * - State machine for drag states (idle, dragging, over-target, dropping)
 * - Active item tracking (ID and data)
 * - Target tracking
 * - State change callbacks
 * - State snapshots for debugging
 *
 * State Transitions:
 * - idle -> dragging (startDrag)
 * - dragging -> over-target (setOverTarget with valid target)
 * - over-target -> dragging (setOverTarget with null)
 * - dragging/over-target -> dropping (beginDrop)
 * - dropping -> idle (endDrag)
 * - any -> idle (cancelDrag, reset)
 *
 * @param options - Configuration options
 * @returns Drag state and control functions
 */
export function useDragState<T = unknown>(
  options: UseDragStateOptions<T> = {}
): UseDragStateReturn<T> {
  const {
    initialState = 'idle',
    onStateChange,
    debounceMs = 0,
  } = options;

  const [state, setState] = useState<DragState>(initialState);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItemState] = useState<T | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  const prevStateRef = useRef<DragState>(initialState);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transition state with optional debounce and callback
  const transitionState = useCallback(
    (newState: DragState) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const doTransition = () => {
        const prevState = prevStateRef.current;
        prevStateRef.current = newState;
        setState(newState);
        onStateChange?.(newState, prevState, activeId, activeItem);
      };

      if (debounceMs > 0) {
        debounceTimerRef.current = setTimeout(doTransition, debounceMs);
      } else {
        doTransition();
      }
    },
    [activeId, activeItem, debounceMs, onStateChange]
  );

  // Derived states
  const isDragging = useMemo(
    () => state === 'dragging' || state === 'over-target',
    [state]
  );

  const isOverTarget = useMemo(
    () => state === 'over-target',
    [state]
  );

  const isDropping = useMemo(
    () => state === 'dropping',
    [state]
  );

  // State control functions
  const startDrag = useCallback(
    (id: string, item?: T) => {
      setActiveId(id);
      if (item !== undefined) {
        setActiveItemState(item);
      }
      transitionState('dragging');
    },
    [transitionState]
  );

  const endDrag = useCallback(
    (success?: boolean) => {
      setActiveId(null);
      setActiveItemState(null);
      setTargetId(null);
      transitionState('idle');
    },
    [transitionState]
  );

  const cancelDrag = useCallback(() => {
    setActiveId(null);
    setActiveItemState(null);
    setTargetId(null);
    transitionState('idle');
  }, [transitionState]);

  const setOverTarget = useCallback(
    (newTargetId: string | null) => {
      setTargetId(newTargetId);
      if (newTargetId && state === 'dragging') {
        transitionState('over-target');
      } else if (!newTargetId && state === 'over-target') {
        transitionState('dragging');
      }
    },
    [state, transitionState]
  );

  const setActiveItem = useCallback((item: T | null) => {
    setActiveItemState(item);
  }, []);

  const beginDrop = useCallback(() => {
    transitionState('dropping');
  }, [transitionState]);

  const reset = useCallback(() => {
    setActiveId(null);
    setActiveItemState(null);
    setTargetId(null);
    transitionState('idle');
  }, [transitionState]);

  const getSnapshot = useCallback(() => ({
    state,
    activeId,
    targetId,
    timestamp: Date.now(),
  }), [state, activeId, targetId]);

  return {
    state,
    activeId,
    activeItem,
    targetId,
    isDragging,
    isOverTarget,
    isDropping,
    startDrag,
    endDrag,
    cancelDrag,
    setOverTarget,
    setActiveItem,
    beginDrop,
    reset,
    getSnapshot,
  };
}
