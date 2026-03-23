'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fullDrawer, fullDrawerTransition } from '../lib/motionPresets';
import { transition } from '@/lib/motion';
import { X, ArrowLeft } from 'lucide-react';

export type DrillDownTarget =
  | { type: 'context'; id: string; name: string }
  | { type: 'theme'; theme: string }
  | { type: 'endpoint'; path: string; trend: 'up' | 'down' | 'stable'; changePercent: number };

interface SignalDetailDrawerProps {
  target: DrillDownTarget | null;
  onClose: () => void;
  children: React.ReactNode;
}

function getDrawerTitle(target: DrillDownTarget): string {
  switch (target.type) {
    case 'context': return target.name;
    case 'theme': return `Theme: "${target.theme}"`;
    case 'endpoint': return target.path;
  }
}

function getDrawerSubtitle(target: DrillDownTarget): string {
  switch (target.type) {
    case 'context': return 'Context activity signals';
    case 'theme': return 'Commits matching this theme';
    case 'endpoint': return 'API endpoint usage details';
  }
}

export default function SignalDetailDrawer({ target, onClose, children }: SignalDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Capture the element that had focus before drawer opened
  useEffect(() => {
    if (target) {
      triggerRef.current = document.activeElement;
    }
  }, [target]);

  // Auto-focus back button when drawer opens
  useEffect(() => {
    if (target && backButtonRef.current) {
      backButtonRef.current.focus();
    }
  }, [target]);

  // Return focus to trigger on close
  const handleClose = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    });
  }, [onClose]);

  // Focus trap: cycle through focusable elements within the drawer
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      handleClose();
      return;
    }

    if (e.key === 'Tab' && drawerRef.current) {
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [handleClose]);

  return (
    <AnimatePresence>
      {target && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.normal}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Drawer panel */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={target ? getDrawerTitle(target) : undefined}
            onKeyDown={handleKeyDown}
            variants={fullDrawer}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fullDrawerTransition}
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800/50">
              <button
                ref={backButtonRef}
                onClick={handleClose}
                aria-label="Go back"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-zinc-200 truncate">
                  {getDrawerTitle(target)}
                </h3>
                <p className="text-xs text-zinc-500">
                  {getDrawerSubtitle(target)}
                </p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close drawer"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
