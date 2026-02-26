'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard } from 'lucide-react';

export interface KeyboardHint {
  key: string;
  label: string;
  color?: 'green' | 'red' | 'blue' | 'amber' | 'gray' | 'purple';
}

interface KeyboardHintBarProps {
  hints: KeyboardHint[];
  visible?: boolean;
  position?: 'bottom' | 'top';
  className?: string;
}

const colorClasses: Record<NonNullable<KeyboardHint['color']>, string> = {
  green: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
  red: 'bg-red-500/20 border-red-500/40 text-red-400',
  blue: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  amber: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
  gray: 'bg-gray-500/20 border-gray-500/40 text-gray-400',
  purple: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
};

const keyBgClasses: Record<NonNullable<KeyboardHint['color']>, string> = {
  green: 'bg-emerald-500/30 border-emerald-400/50',
  red: 'bg-red-500/30 border-red-400/50',
  blue: 'bg-blue-500/30 border-blue-400/50',
  amber: 'bg-amber-500/30 border-amber-400/50',
  gray: 'bg-gray-500/30 border-gray-400/50',
  purple: 'bg-purple-500/30 border-purple-400/50',
};

/**
 * KeyboardHintBar - Universal keyboard shortcut hint bar
 *
 * Displays keyboard shortcuts in a subtle, unobtrusive bar.
 * Use at the bottom of screens where keyboard navigation is supported.
 *
 * @example
 * ```tsx
 * <KeyboardHintBar
 *   hints={[
 *     { key: 'A', label: 'Accept', color: 'green' },
 *     { key: 'Z', label: 'Reject', color: 'red' },
 *     { key: 'D', label: 'Delete', color: 'gray' },
 *   ]}
 * />
 * ```
 */
export default function KeyboardHintBar({
  hints,
  visible = true,
  position = 'bottom',
  className = '',
}: KeyboardHintBarProps) {
  if (hints.length === 0) return null;

  const positionClasses = position === 'bottom'
    ? 'bottom-0 left-0 right-0'
    : 'top-0 left-0 right-0';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'bottom' ? 20 : -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'bottom' ? 20 : -20 }}
          transition={{ duration: 0.2 }}
          className={`fixed ${positionClasses} z-40 pointer-events-none ${className}`}
        >
          <div className="flex items-center justify-center gap-6 py-3 px-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800/50">
            {/* Keyboard icon indicator */}
            <div className="flex items-center gap-2 text-gray-500">
              <Keyboard className="w-4 h-4" />
              <span className="text-xs font-medium">Shortcuts</span>
            </div>

            {/* Separator */}
            <div className="w-px h-4 bg-gray-700/50" />

            {/* Hints */}
            <div className="flex items-center gap-4">
              {hints.map((hint) => (
                <KeyHint key={hint.key} hint={hint} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function KeyHint({ hint }: { hint: KeyboardHint }) {
  const color = hint.color || 'gray';

  return (
    <div className={`flex items-center gap-2 ${colorClasses[color]}`}>
      {/* Key badge */}
      <motion.kbd
        whileHover={{ scale: 1.1 }}
        className={`inline-flex items-center justify-center w-6 h-6 text-xs font-mono font-bold rounded border ${keyBgClasses[color]} shadow-sm`}
      >
        {hint.key}
      </motion.kbd>
      {/* Label */}
      <span className="text-xs font-medium opacity-80">{hint.label}</span>
    </div>
  );
}

/**
 * Inline version for use within cards or smaller areas
 */
export function KeyboardHintInline({
  hints,
  className = '',
}: {
  hints: KeyboardHint[];
  className?: string;
}) {
  if (hints.length === 0) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {hints.map((hint) => (
        <KeyHint key={hint.key} hint={hint} />
      ))}
    </div>
  );
}

/**
 * Compact version showing just keys
 */
export function KeyboardHintCompact({
  hints,
  className = '',
}: {
  hints: KeyboardHint[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {hints.map((hint) => {
        const color = hint.color || 'gray';
        return (
          <kbd
            key={hint.key}
            className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-mono font-bold rounded border ${keyBgClasses[color]} shadow-sm`}
            title={hint.label}
          >
            {hint.key}
          </kbd>
        );
      })}
    </div>
  );
}
