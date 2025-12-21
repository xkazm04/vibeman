'use client';

import type { ReactNode } from 'react';
import { DragStateProvider } from './DragStateProvider';
import { SelectionStateProvider } from './SelectionStateProvider';
import { ViewModeProvider } from './ViewModeProvider';

interface KanbanStateProvidersProps {
  children: ReactNode;
}

/**
 * Combined wrapper for all Kanban state providers.
 * Each provider manages its own slice of state, preventing cascade re-renders.
 */
export function KanbanStateProviders({ children }: KanbanStateProvidersProps) {
  return (
    <ViewModeProvider>
      <SelectionStateProvider>
        <DragStateProvider>
          {children}
        </DragStateProvider>
      </SelectionStateProvider>
    </ViewModeProvider>
  );
}
