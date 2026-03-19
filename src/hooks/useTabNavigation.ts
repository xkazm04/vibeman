import { useCallback, useRef, KeyboardEvent } from 'react';

/**
 * Hook that provides arrow-key navigation for tab groups (ARIA tab pattern).
 * Returns a ref for the tablist container and an onKeyDown handler.
 */
export function useTabNavigation() {
  const tablistRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const container = tablistRef.current;
    if (!container) return;

    const tabs = Array.from(
      container.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])')
    );
    if (tabs.length === 0) return;

    const currentIndex = tabs.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    }
  }, []);

  return { tablistRef, handleKeyDown };
}
