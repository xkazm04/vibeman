'use client';

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { SelectionState, SelectionStateContextValue } from './selectionTypes';

const SelectionStateContext = createContext<SelectionStateContextValue | null>(null);

export function SelectionStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SelectionState>({
    selectedIds: new Set(),
  });

  const toggleSelection = useCallback((id: string) => {
    setState(prev => {
      const newSet = new Set(prev.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedIds: newSet };
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setState({ selectedIds: new Set(ids) });
  }, []);

  const deselectAll = useCallback(() => {
    setState({ selectedIds: new Set() });
  }, []);

  const isSelected = useCallback(
    (id: string): boolean => {
      return state.selectedIds.has(id);
    },
    [state.selectedIds]
  );

  const getSelectedArray = useCallback(() => {
    return Array.from(state.selectedIds);
  }, [state.selectedIds]);

  const value: SelectionStateContextValue = {
    selectedIds: state.selectedIds,
    selectedCount: state.selectedIds.size,
    toggleSelection,
    selectAll,
    deselectAll,
    isSelected,
    getSelectedArray,
  };

  return (
    <SelectionStateContext.Provider value={value}>
      {children}
    </SelectionStateContext.Provider>
  );
}

export function useSelectionState() {
  const context = useContext(SelectionStateContext);
  if (!context) {
    throw new Error('useSelectionState must be used within a SelectionStateProvider');
  }
  return context;
}

export function useSelectedIds() {
  const { selectedIds, selectedCount } = useSelectionState();
  return { selectedIds, selectedCount };
}

export function useSelectionActions() {
  const { toggleSelection, selectAll, deselectAll } = useSelectionState();
  return { toggleSelection, selectAll, deselectAll };
}

export function useIsSelected(id: string) {
  const { isSelected } = useSelectionState();
  return isSelected(id);
}
