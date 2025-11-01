'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { getBlueprintKeyboardShortcuts, formatShortcut } from '../hooks/useBlueprintKeyboardShortcuts';

export default function BlueprintKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const shortcuts = getBlueprintKeyboardShortcuts();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+/ or Ctrl+? to toggle help
      if (e.ctrlKey && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Help button - floating in bottom right */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-gray-900/80 backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 transition-all duration-300 shadow-lg hover:shadow-cyan-500/20"
        title="Keyboard Shortcuts (Ctrl+/)"
      >
        <Keyboard className="w-5 h-5 text-gray-400 hover:text-cyan-400 transition-colors" />
      </motion.button>

      {/* Help Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-gradient-to-br from-gray-900 via-blue-950/40 to-gray-900 border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="relative px-6 py-4 border-b border-cyan-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <Keyboard className="w-5 h-5 text-cyan-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        Blueprint Shortcuts
                      </h2>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Shortcuts list */}
                <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                  {shortcuts.map((shortcut, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm text-gray-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-3 py-1.5 text-xs font-mono font-semibold text-white bg-gray-950 border border-cyan-500/30 rounded-lg shadow-inner">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </motion.div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-cyan-500/20 bg-white/5">
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <kbd className="px-2 py-1 font-mono font-semibold bg-gray-950 border border-cyan-500/30 rounded">
                      Ctrl+/
                    </kbd>
                    <span>to toggle this help</span>
                  </div>
                </div>

                {/* Decorative gradient */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
