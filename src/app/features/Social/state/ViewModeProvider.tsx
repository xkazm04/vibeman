'use client';

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import type { ViewMode, GroupByField, ViewModeState, ViewModeContextValue } from './viewModeTypes';

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewModeState>({
    viewMode: 'board',
    groupBy: 'none',
    activityPanelOpen: false,
  });

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const setGroupBy = useCallback((field: GroupByField) => {
    setState(prev => ({ ...prev, groupBy: field }));
  }, []);

  const setActivityPanelOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, activityPanelOpen: open }));
  }, []);

  const toggleActivityPanel = useCallback(() => {
    setState(prev => ({ ...prev, activityPanelOpen: !prev.activityPanelOpen }));
  }, []);

  const value: ViewModeContextValue = {
    ...state,
    setViewMode,
    setGroupBy,
    setActivityPanelOpen,
    toggleActivityPanel,
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

export function useViewModeValue() {
  const { viewMode } = useViewMode();
  return viewMode;
}

export function useGroupBy() {
  const { groupBy, setGroupBy } = useViewMode();
  return { groupBy, setGroupBy };
}

export function useActivityPanel() {
  const { activityPanelOpen, setActivityPanelOpen, toggleActivityPanel } = useViewMode();
  return { activityPanelOpen, setActivityPanelOpen, toggleActivityPanel };
}
