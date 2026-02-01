'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

/**
 * Generic focus target representing a relationship between elements.
 * Can represent node-to-node connections, single element focus, or multi-element selection.
 */
export interface FocusTarget {
  /** Primary element ID (e.g., source node) */
  primaryId: string;
  /** Secondary element ID (e.g., target node, optional for single-element focus) */
  secondaryId?: string;
  /** Optional metadata for the focus target */
  metadata?: Record<string, unknown>;
}

/**
 * Focus state combining selection and hover
 */
export interface FocusState {
  /** Currently selected target (persists until explicitly cleared) */
  selected: FocusTarget | null;
  /** Currently hovered target (clears on mouse leave) */
  hovered: FocusTarget | null;
}

/**
 * Focus context value providing state and actions
 */
export interface FocusContextValue {
  /** Current focus state */
  state: FocusState;
  /** Active focus target (selected takes precedence over hovered) */
  activeTarget: FocusTarget | null;
  /** Whether any element is currently focused */
  hasActiveFocus: boolean;
  /** Set the selected target */
  select: (target: FocusTarget | null) => void;
  /** Set the hovered target */
  hover: (target: FocusTarget | null) => void;
  /** Toggle selection (select if not selected, deselect if already selected) */
  toggleSelect: (target: FocusTarget) => void;
  /** Clear all focus (both selection and hover) */
  clearAll: () => void;
  /** Check if an element is highlighted based on current focus */
  isHighlighted: (id: string, role: HighlightRole, secondaryId?: string) => boolean;
  /** Check if an element should be dimmed (has active focus but element is not highlighted) */
  isDimmed: (id: string, role: HighlightRole, secondaryId?: string) => boolean;
}

/**
 * Role types for highlight checking
 * - 'node': Element is highlighted if it matches primaryId OR secondaryId
 * - 'edge': Element is highlighted if it matches BOTH primaryId AND secondaryId
 * - 'primary': Element is highlighted if it matches primaryId only
 * - 'secondary': Element is highlighted if it matches secondaryId only
 */
export type HighlightRole = 'node' | 'edge' | 'primary' | 'secondary';

const FocusContext = createContext<FocusContextValue | null>(null);

/**
 * Provider component for the focus highlight system
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FocusState>({
    selected: null,
    hovered: null,
  });

  const select = useCallback((target: FocusTarget | null) => {
    setState((prev) => ({ ...prev, selected: target }));
  }, []);

  const hover = useCallback((target: FocusTarget | null) => {
    setState((prev) => ({ ...prev, hovered: target }));
  }, []);

  const toggleSelect = useCallback((target: FocusTarget) => {
    setState((prev) => {
      const isCurrentlySelected =
        prev.selected?.primaryId === target.primaryId &&
        prev.selected?.secondaryId === target.secondaryId;
      return {
        ...prev,
        selected: isCurrentlySelected ? null : target,
      };
    });
  }, []);

  const clearAll = useCallback(() => {
    setState({ selected: null, hovered: null });
  }, []);

  // Active target: selection takes precedence over hover
  const activeTarget = state.selected || state.hovered;
  const hasActiveFocus = activeTarget !== null;

  const isHighlighted = useCallback(
    (id: string, role: HighlightRole, secondaryId?: string): boolean => {
      if (!activeTarget) return false;

      switch (role) {
        case 'node':
          // Node is highlighted if it matches either end of the focus target
          return activeTarget.primaryId === id || activeTarget.secondaryId === id;

        case 'edge':
          // Edge is highlighted if both ends match exactly
          return (
            activeTarget.primaryId === id && activeTarget.secondaryId === secondaryId
          );

        case 'primary':
          // Only highlighted if it's the primary element
          return activeTarget.primaryId === id;

        case 'secondary':
          // Only highlighted if it's the secondary element
          return activeTarget.secondaryId === id;

        default:
          return false;
      }
    },
    [activeTarget]
  );

  const isDimmed = useCallback(
    (id: string, role: HighlightRole, secondaryId?: string): boolean => {
      // Only dimmed if there's an active focus AND this element is not highlighted
      return hasActiveFocus && !isHighlighted(id, role, secondaryId);
    },
    [hasActiveFocus, isHighlighted]
  );

  const value = useMemo<FocusContextValue>(
    () => ({
      state,
      activeTarget,
      hasActiveFocus,
      select,
      hover,
      toggleSelect,
      clearAll,
      isHighlighted,
      isDimmed,
    }),
    [state, activeTarget, hasActiveFocus, select, hover, toggleSelect, clearAll, isHighlighted, isDimmed]
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

/**
 * Hook to access the focus highlight system
 *
 * @example
 * ```tsx
 * function MyNode({ id }: { id: string }) {
 *   const { isHighlighted, isDimmed, hover, toggleSelect } = useFocusHighlight();
 *
 *   return (
 *     <div
 *       className={isHighlighted(id, 'node') ? 'highlighted' : isDimmed(id, 'node') ? 'dimmed' : ''}
 *       onMouseEnter={() => hover({ primaryId: id })}
 *       onMouseLeave={() => hover(null)}
 *       onClick={() => toggleSelect({ primaryId: id })}
 *     >
 *       Node {id}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusHighlight(): FocusContextValue {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error('useFocusHighlight must be used within a FocusProvider');
  }
  return context;
}

/**
 * Hook to use focus highlighting without requiring a provider.
 * Useful for standalone components that manage their own focus state.
 *
 * @example
 * ```tsx
 * function StandaloneGraph() {
 *   const focus = useLocalFocusHighlight();
 *   // Use focus.isHighlighted, focus.select, etc.
 * }
 * ```
 */
export function useLocalFocusHighlight(): FocusContextValue {
  const [state, setState] = useState<FocusState>({
    selected: null,
    hovered: null,
  });

  const select = useCallback((target: FocusTarget | null) => {
    setState((prev) => ({ ...prev, selected: target }));
  }, []);

  const hover = useCallback((target: FocusTarget | null) => {
    setState((prev) => ({ ...prev, hovered: target }));
  }, []);

  const toggleSelect = useCallback((target: FocusTarget) => {
    setState((prev) => {
      const isCurrentlySelected =
        prev.selected?.primaryId === target.primaryId &&
        prev.selected?.secondaryId === target.secondaryId;
      return {
        ...prev,
        selected: isCurrentlySelected ? null : target,
      };
    });
  }, []);

  const clearAll = useCallback(() => {
    setState({ selected: null, hovered: null });
  }, []);

  const activeTarget = state.selected || state.hovered;
  const hasActiveFocus = activeTarget !== null;

  const isHighlighted = useCallback(
    (id: string, role: HighlightRole, secondaryId?: string): boolean => {
      if (!activeTarget) return false;

      switch (role) {
        case 'node':
          return activeTarget.primaryId === id || activeTarget.secondaryId === id;
        case 'edge':
          return activeTarget.primaryId === id && activeTarget.secondaryId === secondaryId;
        case 'primary':
          return activeTarget.primaryId === id;
        case 'secondary':
          return activeTarget.secondaryId === id;
        default:
          return false;
      }
    },
    [activeTarget]
  );

  const isDimmed = useCallback(
    (id: string, role: HighlightRole, secondaryId?: string): boolean => {
      return hasActiveFocus && !isHighlighted(id, role, secondaryId);
    },
    [hasActiveFocus, isHighlighted]
  );

  return useMemo(
    () => ({
      state,
      activeTarget,
      hasActiveFocus,
      select,
      hover,
      toggleSelect,
      clearAll,
      isHighlighted,
      isDimmed,
    }),
    [state, activeTarget, hasActiveFocus, select, hover, toggleSelect, clearAll, isHighlighted, isDimmed]
  );
}

/**
 * Utility to convert legacy selectedCell/hoveredCell format to FocusTarget
 */
export function cellToFocusTarget(
  cell: { sourceId: string; targetId: string } | null
): FocusTarget | null {
  if (!cell) return null;
  return {
    primaryId: cell.sourceId,
    secondaryId: cell.targetId,
  };
}

/**
 * Utility to convert FocusTarget back to legacy cell format
 */
export function focusTargetToCell(
  target: FocusTarget | null
): { sourceId: string; targetId: string } | null {
  if (!target || !target.secondaryId) return null;
  return {
    sourceId: target.primaryId,
    targetId: target.secondaryId,
  };
}

// ============================================================================
// LINKED VIEWS PATTERN
// ============================================================================

/**
 * View registration for linked views pattern
 */
export interface LinkedView {
  /** Unique view identifier */
  id: string;
  /** Human-readable view name */
  name: string;
  /** View type for categorization */
  type: 'matrix' | 'diagram' | 'table' | 'timeline' | 'custom';
}

/**
 * Linked views context providing shared state across multiple coordinated views
 */
export interface LinkedViewsContextValue extends FocusContextValue {
  /** Registered views */
  views: LinkedView[];
  /** Register a new view */
  registerView: (view: LinkedView) => void;
  /** Unregister a view */
  unregisterView: (viewId: string) => void;
  /** Active view IDs (visible/enabled) */
  activeViewIds: Set<string>;
  /** Toggle view visibility */
  toggleView: (viewId: string) => void;
  /** Set active views */
  setActiveViews: (viewIds: string[]) => void;
}

const LinkedViewsContext = createContext<LinkedViewsContextValue | null>(null);

/**
 * Props for LinkedViewsContainer
 */
export interface LinkedViewsContainerProps {
  /** Child views to render */
  children: ReactNode;
  /** Initial active view IDs */
  initialActiveViews?: string[];
  /** Callback when focus changes */
  onFocusChange?: (target: FocusTarget | null) => void;
  /** Callback when active views change */
  onActiveViewsChange?: (viewIds: string[]) => void;
  /** Additional className for the container */
  className?: string;
}

/**
 * LinkedViewsContainer - Implements the Linked Views pattern from information visualization
 *
 * Provides coordinated interaction across multiple views of the same data:
 * - Shared selection/hover state (via FocusProvider)
 * - View registration and visibility management
 * - Extensible for adding new view types without rewriting coordination logic
 *
 * @example
 * ```tsx
 * <LinkedViewsContainer>
 *   <MatrixView />
 *   <DiagramView />
 *   <TableView />
 * </LinkedViewsContainer>
 * ```
 *
 * Inside child components:
 * ```tsx
 * function MatrixView() {
 *   const { isHighlighted, hover, registerView } = useLinkedViews();
 *
 *   useEffect(() => {
 *     registerView({ id: 'matrix', name: 'Matrix', type: 'matrix' });
 *     return () => unregisterView('matrix');
 *   }, []);
 *
 *   // Use isHighlighted, hover, etc. for coordinated interactions
 * }
 * ```
 */
export function LinkedViewsContainer({
  children,
  initialActiveViews = [],
  onFocusChange,
  onActiveViewsChange,
  className = '',
}: LinkedViewsContainerProps) {
  const [views, setViews] = useState<LinkedView[]>([]);
  const [activeViewIds, setActiveViewIds] = useState<Set<string>>(
    new Set(initialActiveViews)
  );

  // Use the local focus highlight for state management
  const focus = useLocalFocusHighlight();

  // Notify parent of focus changes
  const wrappedSelect = useCallback(
    (target: FocusTarget | null) => {
      focus.select(target);
      onFocusChange?.(target);
    },
    [focus, onFocusChange]
  );

  const wrappedToggleSelect = useCallback(
    (target: FocusTarget) => {
      focus.toggleSelect(target);
      // Determine if we're selecting or deselecting
      const willBeSelected =
        !(
          focus.state.selected?.primaryId === target.primaryId &&
          focus.state.selected?.secondaryId === target.secondaryId
        );
      onFocusChange?.(willBeSelected ? target : null);
    },
    [focus, onFocusChange]
  );

  // View management
  const registerView = useCallback((view: LinkedView) => {
    setViews((prev) => {
      // Don't add duplicates
      if (prev.some((v) => v.id === view.id)) return prev;
      return [...prev, view];
    });
  }, []);

  const unregisterView = useCallback((viewId: string) => {
    setViews((prev) => prev.filter((v) => v.id !== viewId));
  }, []);

  const toggleView = useCallback(
    (viewId: string) => {
      setActiveViewIds((prev) => {
        const next = new Set(prev);
        if (next.has(viewId)) {
          next.delete(viewId);
        } else {
          next.add(viewId);
        }
        onActiveViewsChange?.(Array.from(next));
        return next;
      });
    },
    [onActiveViewsChange]
  );

  const setActiveViews = useCallback(
    (viewIds: string[]) => {
      setActiveViewIds(new Set(viewIds));
      onActiveViewsChange?.(viewIds);
    },
    [onActiveViewsChange]
  );

  const value = useMemo<LinkedViewsContextValue>(
    () => ({
      // Spread focus context values
      state: focus.state,
      activeTarget: focus.activeTarget,
      hasActiveFocus: focus.hasActiveFocus,
      select: wrappedSelect,
      hover: focus.hover,
      toggleSelect: wrappedToggleSelect,
      clearAll: focus.clearAll,
      isHighlighted: focus.isHighlighted,
      isDimmed: focus.isDimmed,
      // Linked views specific
      views,
      registerView,
      unregisterView,
      activeViewIds,
      toggleView,
      setActiveViews,
    }),
    [
      focus,
      wrappedSelect,
      wrappedToggleSelect,
      views,
      registerView,
      unregisterView,
      activeViewIds,
      toggleView,
      setActiveViews,
    ]
  );

  return (
    <LinkedViewsContext.Provider value={value}>
      <div className={className}>{children}</div>
    </LinkedViewsContext.Provider>
  );
}

/**
 * Hook to access the linked views context
 *
 * Provides all FocusContextValue methods plus view management utilities.
 *
 * @throws Error if used outside LinkedViewsContainer
 */
export function useLinkedViews(): LinkedViewsContextValue {
  const context = useContext(LinkedViewsContext);
  if (!context) {
    throw new Error('useLinkedViews must be used within a LinkedViewsContainer');
  }
  return context;
}

/**
 * Hook to register a view on mount and unregister on unmount
 *
 * @example
 * ```tsx
 * function MyView() {
 *   useViewRegistration({ id: 'my-view', name: 'My View', type: 'custom' });
 *   // View is automatically registered/unregistered
 * }
 * ```
 */
export function useViewRegistration(view: LinkedView): void {
  const { registerView, unregisterView } = useLinkedViews();

  React.useEffect(() => {
    registerView(view);
    return () => unregisterView(view.id);
  }, [view.id, view.name, view.type, registerView, unregisterView]);
}
