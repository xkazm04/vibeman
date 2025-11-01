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
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      // Escape to close Blueprint
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Ctrl+1: Vision Scan
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        onVisionScan();
        return;
      }

      // Ctrl+2: Contexts Scan
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        onContextsScan();
        return;
      }

      // Ctrl+3: Structure Scan
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        onStructureScan();
        return;
      }

      // Ctrl+4: Build Scan
      if (e.ctrlKey && e.key === '4') {
        e.preventDefault();
        onBuildScan();
        return;
      }

      // Ctrl+5: Photo Scan
      if (e.ctrlKey && e.key === '5') {
        e.preventDefault();
        onPhotoScan();
        return;
      }
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
