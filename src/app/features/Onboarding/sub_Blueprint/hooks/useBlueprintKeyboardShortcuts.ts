/**
 * Blueprint-specific keyboard shortcuts hook
 * Provides keyboard shortcuts for Blueprint scans
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

interface UseBlueprintKeyboardShortcutsProps {
  onVisionScan: () => void;
  onContextsScan: () => void;
  onStructureScan: () => void;
  onBuildScan: () => void;
  onPhotoScan: () => void;
  onClose: () => void;
}


/**
 * Helper to check if the key event should be ignored
 */
function shouldIgnoreKeyEvent(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

/**
 * Helper to handle Ctrl+Number shortcuts
 */
function handleCtrlNumberShortcut(
  e: KeyboardEvent,
  key: string,
  action: () => void
): boolean {
  if (e.ctrlKey && e.key === key) {
    e.preventDefault();
    action();
    return true;
  }
  return false;
}

export function useBlueprintKeyboardShortcuts({
  onVisionScan,
  onContextsScan,
  onStructureScan,
  onBuildScan,
  onPhotoScan,
  onClose,
}: UseBlueprintKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable element
      if (shouldIgnoreKeyEvent(e)) {
        return;
      }

      // Escape to close Blueprint
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Handle Ctrl+Number shortcuts
      if (handleCtrlNumberShortcut(e, '1', onVisionScan)) return;
      if (handleCtrlNumberShortcut(e, '2', onContextsScan)) return;
      if (handleCtrlNumberShortcut(e, '3', onStructureScan)) return;
      if (handleCtrlNumberShortcut(e, '4', onBuildScan)) return;
      if (handleCtrlNumberShortcut(e, '5', onPhotoScan)) return;
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onVisionScan, onContextsScan, onStructureScan, onBuildScan, onPhotoScan, onClose]);
}

/**
 * Get list of all available Blueprint keyboard shortcuts
 */
export function getBlueprintKeyboardShortcuts(): KeyboardShortcut[] {
  return [
    {
      key: 'B',
      ctrlKey: true,
      description: 'Toggle Blueprint',
      action: () => {},
    },
    {
      key: '1',
      ctrlKey: true,
      description: 'Run Vision Scan',
      action: () => {},
    },
    {
      key: '2',
      ctrlKey: true,
      description: 'Run Contexts Scan',
      action: () => {},
    },
    {
      key: '3',
      ctrlKey: true,
      description: 'Run Structure Scan',
      action: () => {},
    },
    {
      key: '4',
      ctrlKey: true,
      description: 'Run Build Scan',
      action: () => {},
    },
    {
      key: '5',
      ctrlKey: true,
      description: 'Run Photo Scan',
      action: () => {},
    },
    {
      key: 'Esc',
      description: 'Close Blueprint',
      action: () => {},
    },
    {
      key: '/',
      ctrlKey: true,
      description: 'Show Keyboard Shortcuts Help',
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
