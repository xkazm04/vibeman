'use client';

import { useState, useCallback, useEffect } from 'react';
import type { FeedbackItem } from '../lib/types/feedbackTypes';
import type { SplitViewState, SplitViewWidth } from '../components/split-view/splitViewTypes';
import { DEFAULT_SPLIT_VIEW_STATE } from '../components/split-view/splitViewTypes';

interface UseSplitViewOptions {
  items: FeedbackItem[];
  onNavigate?: (itemId: string) => void;
}

export function useSplitView({ items, onNavigate }: UseSplitViewOptions) {
  const [state, setState] = useState<SplitViewState>(DEFAULT_SPLIT_VIEW_STATE);

  const openItem = useCallback((itemId: string) => {
    setState(prev => {
      if (prev.isOpen && prev.itemId === itemId) {
        return { ...prev, isOpen: false, itemId: null };
      }
      return { ...prev, isOpen: true, itemId };
    });
    onNavigate?.(itemId);
  }, [onNavigate]);

  const closePanel = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, itemId: null }));
  }, []);

  const setWidth = useCallback((width: SplitViewWidth) => {
    setState(prev => ({ ...prev, width }));
  }, []);

  const currentIndex = items.findIndex(item => item.id === state.itemId);

  const navigateNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      const nextItem = items[currentIndex + 1];
      openItem(nextItem.id);
    }
  }, [currentIndex, items, openItem]);

  const navigatePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevItem = items[currentIndex - 1];
      openItem(prevItem.id);
    }
  }, [currentIndex, items, openItem]);

  useEffect(() => {
    if (!state.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePanel();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigatePrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isOpen, closePanel, navigateNext, navigatePrev]);

  const currentItem = items.find(item => item.id === state.itemId) || null;

  return {
    state,
    currentItem,
    currentIndex,
    totalItems: items.length,
    openItem,
    closePanel,
    setWidth,
    navigateNext,
    navigatePrev,
    canNavigateNext: currentIndex < items.length - 1,
    canNavigatePrev: currentIndex > 0,
  };
}
