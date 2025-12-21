'use client';

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { FeedbackItem, KanbanStatus } from '../lib/types/feedbackTypes';
import type { DragState, DragStateContextValue } from './dragTypes';

const DragStateContext = createContext<DragStateContextValue | null>(null);

export function DragStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DragState>({
    draggingItem: null,
    dragOverColumn: null,
  });

  const setDraggingItem = useCallback((item: FeedbackItem | null) => {
    setState(prev => ({ ...prev, draggingItem: item }));
  }, []);

  const setDragOverColumn = useCallback((column: KanbanStatus | null) => {
    setState(prev => ({ ...prev, dragOverColumn: column }));
  }, []);

  const handleCardDragStart = useCallback((e: React.DragEvent, item: FeedbackItem) => {
    setState(prev => ({ ...prev, draggingItem: item }));
  }, []);

  const handleCardDragEnd = useCallback(() => {
    setState({ draggingItem: null, dragOverColumn: null });
  }, []);

  const handleDragOver = useCallback(
    (columnId: KanbanStatus) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setState(prev => ({ ...prev, dragOverColumn: columnId }));
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setState(prev => ({ ...prev, dragOverColumn: null }));
  }, []);

  const value: DragStateContextValue = {
    ...state,
    setDraggingItem,
    setDragOverColumn,
    handleCardDragStart,
    handleCardDragEnd,
    handleDragOver,
    handleDragLeave,
    isDragging: !!state.draggingItem,
  };

  return (
    <DragStateContext.Provider value={value}>
      {children}
    </DragStateContext.Provider>
  );
}

export function useDragState() {
  const context = useContext(DragStateContext);
  if (!context) {
    throw new Error('useDragState must be used within a DragStateProvider');
  }
  return context;
}

export function useDraggingItem() {
  const { draggingItem, isDragging } = useDragState();
  return { draggingItem, isDragging };
}

export function useDragOverColumn() {
  const { dragOverColumn } = useDragState();
  return dragOverColumn;
}

export function useDragHandlers() {
  const { handleCardDragStart, handleCardDragEnd, handleDragOver, handleDragLeave } = useDragState();
  return { handleCardDragStart, handleCardDragEnd, handleDragOver, handleDragLeave };
}
