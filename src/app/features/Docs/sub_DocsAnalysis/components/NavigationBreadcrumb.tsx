/**
 * NavigationBreadcrumb Component
 * Animated breadcrumb with spatial transitions matching the zoom navigation paradigm.
 * Uses AnimatePresence + layoutId for smooth segment enter/exit as users
 * navigate between System → Module → Documentation levels.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, ChevronRight, MoreHorizontal } from 'lucide-react';
import type { ContextGroup, Context } from '@/stores/contextStore';
import { ZoomLevel, NavigationState } from '../lib/types';
import { duration, easing, hover, tap } from '@/lib/motion';

interface NavigationBreadcrumbProps {
  state: NavigationState;
  onNavigateToLevel: (level: ZoomLevel) => void;
  groups: ContextGroup[];
  contexts: Context[];
}

// Animation variants for breadcrumb segments sliding in from right
const segmentVariants = {
  initial: { opacity: 0, x: 16, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: duration.deliberate, ease: easing.entrance },
  },
  exit: {
    opacity: 0,
    x: -12,
    filter: 'blur(4px)',
    transition: { duration: duration.snappy, ease: easing.exit },
  },
};

// Chevron separator animation
const chevronVariants = {
  initial: { opacity: 0, scale: 0.5, rotate: -90 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: duration.normal, ease: easing.morph },
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    rotate: 90,
    transition: { duration: duration.snappy, ease: easing.exit },
  },
};

// Subtle pulse for the active segment
const activePulse = {
  scale: [1, 1.02, 1],
  transition: {
    duration: 0.4,
    ease: easing.morph,
    times: [0, 0.5, 1],
  },
};

interface BreadcrumbItem {
  level: ZoomLevel;
  label: string;
  icon: React.ReactNode;
}

function EllipsisDropdown({
  items,
  onNavigateToLevel,
}: {
  items: BreadcrumbItem[];
  onNavigateToLevel: (level: ZoomLevel) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={() => setOpen(o => !o)}
        className="flex items-center px-1.5 py-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        whileHover={hover.button}
        whileTap={tap.press}
        aria-label="Show navigation levels"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: duration.snappy, ease: easing.entrance }}
            className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700/50 rounded-lg shadow-xl z-50 min-w-[140px] py-1"
          >
            {items.map(item => (
              <button
                key={item.level}
                onClick={() => {
                  onNavigateToLevel(item.level);
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors"
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NavigationBreadcrumb({
  state,
  onNavigateToLevel,
  groups,
  contexts,
}: NavigationBreadcrumbProps) {
  const selectedGroup = state.selectedModuleId
    ? groups.find(g => g.id === state.selectedModuleId)
    : null;
  const selectedContext = state.selectedUseCaseId
    ? contexts.find(c => c.id === state.selectedUseCaseId)
    : null;

  const items: BreadcrumbItem[] = [
    { level: 1 as ZoomLevel, label: 'System', icon: <Home className="w-3.5 h-3.5" /> },
    ...(selectedGroup
      ? [
          {
            level: 2 as ZoomLevel,
            label: selectedGroup.name,
            icon: <Compass className="w-3.5 h-3.5" />,
          },
        ]
      : []),
    ...(selectedContext
      ? [
          {
            level: 3 as ZoomLevel,
            label: selectedContext.name,
            icon: <Compass className="w-3.5 h-3.5" />,
          },
        ]
      : []),
  ];

  const isActive = (level: ZoomLevel) => state.level === level;
  const isLast = (index: number) => index === items.length - 1;

  // On mobile (< sm), collapse middle segments into ellipsis dropdown
  const middleItems = items.length > 2 ? items.slice(1, -1) : [];
  const firstItem = items[0];
  const lastItem = items.length > 1 ? items[items.length - 1] : null;

  return (
    <div className="flex items-center gap-0.5 text-sm">
      <AnimatePresence mode="popLayout" initial={false}>
        {/* ── Desktop: show all segments ── */}
        {items.map((item, index) => (
          <React.Fragment key={`segment-${item.level}`}>
            {/* Chevron separator */}
            {index > 0 && (
              <motion.span
                key={`sep-${item.level}`}
                variants={chevronVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-gray-600 mx-0.5 hidden sm:flex items-center"
                layoutId={`chevron-${item.level}`}
              >
                <ChevronRight className="w-3 h-3" />
              </motion.span>
            )}

            {/* Breadcrumb segment */}
            <motion.div
              key={`item-${item.level}`}
              variants={segmentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layoutId={`breadcrumb-${item.level}`}
              className="hidden sm:block"
            >
              <motion.button
                onClick={() => onNavigateToLevel(item.level)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                  isActive(item.level)
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
                disabled={isActive(item.level)}
                data-testid={`breadcrumb-level-${item.level}`}
                whileHover={!isActive(item.level) ? hover.lift : undefined}
                whileTap={!isActive(item.level) ? tap.press : undefined}
                animate={isActive(item.level) && isLast(index) ? activePulse : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </motion.button>
            </motion.div>
          </React.Fragment>
        ))}

        {/* ── Mobile: first + ellipsis + last ── */}
        <motion.div
          key="mobile-first"
          variants={segmentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="sm:hidden"
        >
          <motion.button
            onClick={() => onNavigateToLevel(firstItem.level)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
              isActive(firstItem.level)
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            disabled={isActive(firstItem.level)}
            data-testid={`breadcrumb-mobile-level-${firstItem.level}`}
            whileHover={!isActive(firstItem.level) ? hover.lift : undefined}
            whileTap={!isActive(firstItem.level) ? tap.press : undefined}
          >
            {firstItem.icon}
          </motion.button>
        </motion.div>

        {/* Middle items ellipsis (mobile only, when 3 levels) */}
        {middleItems.length > 0 && (
          <React.Fragment key="mobile-ellipsis">
            <motion.span
              variants={chevronVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-gray-600 mx-0.5 sm:hidden flex items-center"
            >
              <ChevronRight className="w-3 h-3" />
            </motion.span>
            <motion.div
              variants={segmentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="sm:hidden"
            >
              <EllipsisDropdown items={middleItems} onNavigateToLevel={onNavigateToLevel} />
            </motion.div>
          </React.Fragment>
        )}

        {/* Last item on mobile */}
        {lastItem && (
          <React.Fragment key={`mobile-last-${lastItem.level}`}>
            <motion.span
              variants={chevronVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-gray-600 mx-0.5 sm:hidden flex items-center"
            >
              <ChevronRight className="w-3 h-3" />
            </motion.span>
            <motion.div
              variants={segmentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="sm:hidden"
            >
              <motion.button
                onClick={() => onNavigateToLevel(lastItem.level)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                  isActive(lastItem.level)
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
                disabled={isActive(lastItem.level)}
                data-testid={`breadcrumb-mobile-level-${lastItem.level}`}
                whileHover={!isActive(lastItem.level) ? hover.lift : undefined}
                whileTap={!isActive(lastItem.level) ? tap.press : undefined}
                animate={isActive(lastItem.level) ? activePulse : undefined}
              >
                {lastItem.icon}
              </motion.button>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
}
