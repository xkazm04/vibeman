import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, ChevronDown, ChevronUp } from 'lucide-react';

interface KeyboardShortcutsHintProps {
  className?: string;
}

/**
 * A small floating hint that shows available keyboard shortcuts
 * for context card navigation and manipulation
 */
const KeyboardShortcutsHint = React.memo<KeyboardShortcutsHintProps>(({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const shortcuts = [
    { keys: ['Tab'], description: 'Navigate between cards' },
    { keys: ['↑', '↓', '←', '→'], description: 'Move within grid' },
    { keys: ['M'], description: 'Move to another group' },
    { keys: ['Enter', 'Space'], description: 'Select card' },
    { keys: ['0-9'], description: 'Quick move (in menu)' },
    { keys: ['Esc'], description: 'Close menu / Cancel' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`fixed bottom-4 right-4 z-40 ${className}`}
      data-testid="keyboard-shortcuts-hint"
    >
      <div className="bg-gray-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-800/50 transition-colors"
          aria-expanded={isExpanded}
          aria-controls="keyboard-shortcuts-list"
          data-testid="keyboard-shortcuts-toggle"
        >
          <Keyboard className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-200 flex-1">
            Keyboard Shortcuts
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            className="p-1 hover:bg-gray-700/50 rounded transition-colors"
            aria-label="Dismiss keyboard shortcuts hint"
            data-testid="keyboard-shortcuts-dismiss"
          >
            <X className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
          </button>
        </button>

        {/* Shortcut List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              id="keyboard-shortcuts-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-700/50"
            >
              <ul className="py-2 px-3 space-y-1.5">
                {shortcuts.map((shortcut, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="flex gap-1 min-w-[80px]">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs font-mono text-gray-300">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-gray-600 text-xs">/</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <span className="text-gray-400">{shortcut.description}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

KeyboardShortcutsHint.displayName = 'KeyboardShortcutsHint';

export default KeyboardShortcutsHint;
