// Selection State Types

export interface SelectionState {
  selectedIds: Set<string>;
}

export interface SelectionStateContextValue extends SelectionState {
  selectedCount: number;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
  getSelectedArray: () => string[];
}
