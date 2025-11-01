/**
 * Global keyboard shortcuts hook
 * DEPRECATED: Most shortcuts have been moved to Blueprint-specific implementation
 * This hook is now minimal and only handles legacy global shortcuts
 */

import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
}

/**
 * @deprecated This hook is deprecated. Use Blueprint-specific shortcuts instead.
 * Only kept for compatibility with KeyboardShortcutsHelp component.
 */
export function useGlobalKeyboardShortcuts() {
  useEffect(() => {
    // No-op - all shortcuts are now handled by Blueprint or other components
    // This hook is kept for compatibility but does nothing
    console.log('[useGlobalKeyboardShortcuts] DEPRECATED - All shortcuts moved to Blueprint');
  }, []);
}

/**
 * Get list of all available keyboard shortcuts
 * @deprecated Use getBlueprintKeyboardShortcuts from Blueprint instead
 */
export function getKeyboardShortcuts(): KeyboardShortcut[] {
  return [
    {
      key: '/',
      ctrlKey: true,
      description: 'Show Keyboard Shortcuts Help (Blueprint)',
      action: () => {},
    },
  ];
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  parts.push(shortcut.key);

  return parts.join('+');
}
