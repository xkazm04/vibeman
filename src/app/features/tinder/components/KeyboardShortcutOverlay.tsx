'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { transition } from '@/lib/motion';

interface ShortcutEntry {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Actions',
    shortcuts: [
      { keys: ['A'], label: 'Accept current item' },
      { keys: ['Z'], label: 'Reject current item' },
      { keys: ['D'], label: 'Delete current item' },
      { keys: ['V'], label: 'Show scope variants' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['\u2192'], label: 'Accept (swipe right)' },
      { keys: ['\u2190'], label: 'Reject (swipe left)' },
    ],
  },
  {
    title: 'Rejection Reasons',
    shortcuts: [
      { keys: ['1', '2', '3', '4', '5'], label: 'Pick reason by number' },
      { keys: ['0', 'S'], label: 'Skip reason' },
      { keys: ['Esc'], label: 'Dismiss picker' },
    ],
  },
];

interface KeyboardShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutOverlay({ open, onClose }: KeyboardShortcutOverlayProps) {
  // Auto-dismiss on any keypress
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    e.preventDefault();
    onClose();
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition.snappy}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={transition.snappy}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl shadow-black/40 p-6 max-w-md w-full mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-200">Keyboard Shortcuts</h2>
              <span className="text-xs text-gray-500 font-mono">press any key to dismiss</span>
            </div>

            {/* Shortcut groups */}
            <div className="space-y-4">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    {group.title}
                  </h3>
                  <div className="space-y-1.5">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.label}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-gray-300">{shortcut.label}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && shortcut.keys.length <= 2 && (
                                <span className="text-gray-600 text-xs">/</span>
                              )}
                              <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-mono font-bold rounded border bg-gray-700/60 border-gray-600/60 text-gray-300 shadow-sm">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="mt-5 pt-3 border-t border-gray-700/40 flex items-center justify-center gap-2">
              <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-mono font-bold rounded border bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-sm">
                ?
              </kbd>
              <span className="text-xs text-gray-500">to toggle this overlay</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
