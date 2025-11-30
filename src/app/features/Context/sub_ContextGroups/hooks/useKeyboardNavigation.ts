import { useCallback, useEffect, useState, useRef } from 'react';
import { Context, ContextGroup } from '@/stores/contextStore';

interface UseKeyboardNavigationProps {
  contexts: Context[];
  groups: ContextGroup[];
  onMoveContext: (contextId: string, groupId: string | null) => void;
  onSelectContext: (contextId: string) => void;
  enabled?: boolean;
}

interface KeyboardNavigationState {
  focusedContextId: string | null;
  focusedGroupId: string | null;
  showMoveMenu: boolean;
  moveMenuPosition: { x: number; y: number };
}

/**
 * Hook for keyboard-only navigation and manipulation of context cards
 *
 * Keyboard shortcuts:
 * - Tab / Shift+Tab: Navigate between context cards
 * - Arrow keys: Navigate within grid
 * - Enter/Space: Open context details or select
 * - M: Open move-to-group menu
 * - Escape: Close menus or cancel operations
 * - 1-9: Quick move to group by position (when move menu is open)
 */
export function useKeyboardNavigation({
  contexts,
  groups,
  onMoveContext,
  onSelectContext,
  enabled = true,
}: UseKeyboardNavigationProps) {
  const [state, setState] = useState<KeyboardNavigationState>({
    focusedContextId: null,
    focusedGroupId: null,
    showMoveMenu: false,
    moveMenuPosition: { x: 0, y: 0 },
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const focusedElementRef = useRef<HTMLElement | null>(null);

  // Get all focusable context cards
  const getFocusableCards = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll('[data-context-card]')
    ) as HTMLElement[];
  }, []);

  // Find context by ID
  const findContext = useCallback(
    (contextId: string) => contexts.find((c) => c.id === contextId),
    [contexts]
  );

  // Get the current focused index
  const getCurrentFocusIndex = useCallback(() => {
    const cards = getFocusableCards();
    if (!state.focusedContextId) return -1;
    return cards.findIndex(
      (card) => card.dataset.contextId === state.focusedContextId
    );
  }, [getFocusableCards, state.focusedContextId]);

  // Focus a specific card by index
  const focusCardByIndex = useCallback(
    (index: number) => {
      const cards = getFocusableCards();
      if (index < 0 || index >= cards.length) return;

      const card = cards[index];
      const contextId = card.dataset.contextId;
      if (contextId) {
        setState((prev) => ({ ...prev, focusedContextId: contextId }));
        card.focus();
        focusedElementRef.current = card;
      }
    },
    [getFocusableCards]
  );

  // Navigate to next/previous card
  const navigateToCard = useCallback(
    (direction: 'next' | 'prev' | 'up' | 'down' | 'left' | 'right') => {
      const cards = getFocusableCards();
      const currentIndex = getCurrentFocusIndex();

      if (currentIndex === -1 && cards.length > 0) {
        focusCardByIndex(0);
        return;
      }

      // Calculate grid dimensions (approximation based on card positions)
      const cardPositions = cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return { card, x: rect.left, y: rect.top };
      });

      // Group by row (cards with similar Y are in same row)
      const rowThreshold = 50; // pixels
      const rows: HTMLElement[][] = [];
      let currentRow: HTMLElement[] = [];
      let lastY = -Infinity;

      cardPositions.forEach(({ card, y }) => {
        if (Math.abs(y - lastY) > rowThreshold) {
          if (currentRow.length > 0) {
            rows.push(currentRow);
          }
          currentRow = [card];
          lastY = y;
        } else {
          currentRow.push(card);
        }
      });
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }

      // Find current row and column
      let currentRowIndex = 0;
      let currentColIndex = 0;
      for (let r = 0; r < rows.length; r++) {
        const colIndex = rows[r].indexOf(cards[currentIndex]);
        if (colIndex !== -1) {
          currentRowIndex = r;
          currentColIndex = colIndex;
          break;
        }
      }

      let newIndex = currentIndex;

      switch (direction) {
        case 'next':
        case 'right':
          newIndex = Math.min(currentIndex + 1, cards.length - 1);
          break;
        case 'prev':
        case 'left':
          newIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'down': {
          const nextRow = rows[currentRowIndex + 1];
          if (nextRow) {
            const targetCol = Math.min(currentColIndex, nextRow.length - 1);
            newIndex = cards.indexOf(nextRow[targetCol]);
          }
          break;
        }
        case 'up': {
          const prevRow = rows[currentRowIndex - 1];
          if (prevRow) {
            const targetCol = Math.min(currentColIndex, prevRow.length - 1);
            newIndex = cards.indexOf(prevRow[targetCol]);
          }
          break;
        }
      }

      if (newIndex !== currentIndex && newIndex !== -1) {
        focusCardByIndex(newIndex);
      }
    },
    [getFocusableCards, getCurrentFocusIndex, focusCardByIndex]
  );

  // Open move menu at focused card position
  const openMoveMenu = useCallback(() => {
    if (!state.focusedContextId || !focusedElementRef.current) return;

    const rect = focusedElementRef.current.getBoundingClientRect();
    setState((prev) => ({
      ...prev,
      showMoveMenu: true,
      moveMenuPosition: {
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      },
    }));
  }, [state.focusedContextId]);

  // Close move menu
  const closeMoveMenu = useCallback(() => {
    setState((prev) => ({ ...prev, showMoveMenu: false }));
  }, []);

  // Move context to group by index (1-9 shortcuts)
  const moveToGroupByIndex = useCallback(
    (groupIndex: number) => {
      if (!state.focusedContextId) return;

      // 0 means move to ungrouped
      if (groupIndex === 0) {
        onMoveContext(state.focusedContextId, null);
        closeMoveMenu();
        return;
      }

      const group = groups[groupIndex - 1];
      if (group) {
        onMoveContext(state.focusedContextId, group.id);
        closeMoveMenu();
      }
    },
    [state.focusedContextId, groups, onMoveContext, closeMoveMenu]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // If move menu is open, handle its navigation
      if (state.showMoveMenu) {
        switch (event.key) {
          case 'Escape':
            event.preventDefault();
            closeMoveMenu();
            break;
          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            event.preventDefault();
            moveToGroupByIndex(parseInt(event.key, 10));
            break;
        }
        return;
      }

      // General navigation
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          navigateToCard('right');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          navigateToCard('left');
          break;
        case 'ArrowDown':
          event.preventDefault();
          navigateToCard('down');
          break;
        case 'ArrowUp':
          event.preventDefault();
          navigateToCard('up');
          break;
        case 'm':
        case 'M':
          if (state.focusedContextId) {
            event.preventDefault();
            openMoveMenu();
          }
          break;
        case 'Enter':
        case ' ':
          if (state.focusedContextId) {
            event.preventDefault();
            onSelectContext(state.focusedContextId);
          }
          break;
        case 'Escape':
          if (state.focusedContextId) {
            setState((prev) => ({ ...prev, focusedContextId: null }));
            focusedElementRef.current?.blur();
          }
          break;
      }
    },
    [
      enabled,
      state.showMoveMenu,
      state.focusedContextId,
      closeMoveMenu,
      moveToGroupByIndex,
      navigateToCard,
      openMoveMenu,
      onSelectContext,
    ]
  );

  // Set up keyboard event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // Focus management for card focus/blur
  const setFocusedContext = useCallback((contextId: string | null) => {
    setState((prev) => ({ ...prev, focusedContextId: contextId }));
  }, []);

  return {
    containerRef,
    focusedContextId: state.focusedContextId,
    showMoveMenu: state.showMoveMenu,
    moveMenuPosition: state.moveMenuPosition,
    setFocusedContext,
    closeMoveMenu,
    openMoveMenu,
    navigateToCard,
    moveToGroupByIndex,
  };
}
