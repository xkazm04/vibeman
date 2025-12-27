'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * ARIA Live Region announcer for screen readers
 */
export function useAnnouncer() {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const announce = useCallback((text: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Clear then set to trigger announcement
    setMessage('');
    requestAnimationFrame(() => {
      setMessage(text);
    });

    // Clear after delay
    timeoutRef.current = setTimeout(() => {
      setMessage('');
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { message, announce };
}

/**
 * Props for ARIA live region component
 */
export interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

/**
 * Visually hidden live region for screen reader announcements
 */
export function LiveRegion({ message, priority = 'polite' }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

/**
 * Hook for generating stable ARIA IDs
 */
export function useAriaId(prefix: string = 'aria'): string {
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) {
    idRef.current = generateAriaId(prefix);
  }
  return idRef.current;
}

/**
 * Hook for managing ARIA expanded state
 */
export function useAriaExpanded(initialExpanded: boolean = false) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const contentId = useAriaId('content');

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const triggerProps = {
    'aria-expanded': expanded,
    'aria-controls': contentId,
    onClick: toggle,
  };

  const contentProps = {
    id: contentId,
    hidden: !expanded,
  };

  return {
    expanded,
    setExpanded,
    toggle,
    triggerProps,
    contentProps,
  };
}

/**
 * Hook for managing ARIA selected state in lists
 */
export function useAriaSelected<T extends string | number>(
  initialSelected: T | null = null
) {
  const [selected, setSelected] = useState<T | null>(initialSelected);

  const getItemProps = useCallback(
    (itemId: T) => ({
      'aria-selected': selected === itemId,
      tabIndex: selected === itemId ? 0 : -1,
      onClick: () => setSelected(itemId),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSelected(itemId);
        }
      },
    }),
    [selected]
  );

  return {
    selected,
    setSelected,
    getItemProps,
  };
}

/**
 * Hook for managing focus within a container (roving tabindex)
 */
export function useFocusManager(itemCount: number) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % itemCount);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(itemCount - 1);
          break;
      }
    },
    [itemCount]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: focusedIndex === index ? 0 : -1,
      'data-focused': focusedIndex === index,
    }),
    [focusedIndex]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    containerRef,
    handleKeyDown,
    getItemProps,
  };
}

/**
 * Hook to trap focus within a modal/dialog
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element
    const container = containerRef.current;
    if (container) {
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    }

    // Restore focus on cleanup
    return () => {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isActive || e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const firstElement = focusable[0] as HTMLElement;
      const lastElement = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    },
    [isActive]
  );

  return {
    containerRef,
    handleKeyDown,
  };
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
  );
}

/**
 * Props for skip link component
 */
export interface SkipLinkProps {
  targetId: string;
  children?: React.ReactNode;
}

/**
 * Skip to main content link for keyboard navigation
 */
export function SkipLink({ targetId, children = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      {children}
    </a>
  );
}

/**
 * ARIA labelledby helper - combines multiple IDs
 */
export function combineAriaLabelledBy(...ids: (string | undefined | null)[]): string | undefined {
  const validIds = ids.filter(Boolean);
  return validIds.length > 0 ? validIds.join(' ') : undefined;
}

/**
 * ARIA describedby helper - combines multiple IDs
 */
export function combineAriaDescribedBy(...ids: (string | undefined | null)[]): string | undefined {
  const validIds = ids.filter(Boolean);
  return validIds.length > 0 ? validIds.join(' ') : undefined;
}

/**
 * Props builder for common ARIA patterns
 */
export const ariaProps = {
  /**
   * Button that opens a dialog
   */
  dialogTrigger: (dialogId: string, isOpen: boolean) => ({
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': isOpen,
    'aria-controls': dialogId,
  }),

  /**
   * Button that opens a menu
   */
  menuTrigger: (menuId: string, isOpen: boolean) => ({
    'aria-haspopup': 'menu' as const,
    'aria-expanded': isOpen,
    'aria-controls': menuId,
  }),

  /**
   * Tab in a tablist
   */
  tab: (panelId: string, isSelected: boolean) => ({
    role: 'tab' as const,
    'aria-selected': isSelected,
    'aria-controls': panelId,
    tabIndex: isSelected ? 0 : -1,
  }),

  /**
   * Tab panel
   */
  tabPanel: (tabId: string, isHidden: boolean) => ({
    role: 'tabpanel' as const,
    'aria-labelledby': tabId,
    hidden: isHidden,
    tabIndex: 0,
  }),

  /**
   * Progress indicator
   */
  progress: (value: number, max: number = 100, label?: string) => ({
    role: 'progressbar' as const,
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label,
  }),

  /**
   * Alert/notification
   */
  alert: (type: 'error' | 'warning' | 'success' | 'info' = 'info') => ({
    role: type === 'error' ? ('alert' as const) : ('status' as const),
    'aria-live': type === 'error' ? ('assertive' as const) : ('polite' as const),
  }),

  /**
   * Loading state
   */
  loading: (isLoading: boolean, label: string = 'Loading') => ({
    'aria-busy': isLoading,
    'aria-label': isLoading ? label : undefined,
  }),

  /**
   * Invalid field
   */
  invalid: (isInvalid: boolean, errorId?: string) => ({
    'aria-invalid': isInvalid,
    'aria-describedby': isInvalid ? errorId : undefined,
  }),

  /**
   * Required field
   */
  required: (isRequired: boolean) => ({
    'aria-required': isRequired,
    required: isRequired,
  }),
};

export default {
  useAnnouncer,
  useAriaId,
  useAriaExpanded,
  useAriaSelected,
  useFocusManager,
  useFocusTrap,
  LiveRegion,
  SkipLink,
  combineAriaLabelledBy,
  combineAriaDescribedBy,
  ariaProps,
};
