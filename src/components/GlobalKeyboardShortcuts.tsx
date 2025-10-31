'use client';

import { useGlobalKeyboardShortcuts } from '@/hooks/useGlobalKeyboardShortcuts';

/**
 * Component that initializes global keyboard shortcuts
 * This component doesn't render anything, it just sets up the shortcuts
 */
export default function GlobalKeyboardShortcuts() {
  useGlobalKeyboardShortcuts();
  return null;
}
