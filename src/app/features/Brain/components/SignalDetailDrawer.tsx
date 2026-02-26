'use client';

import { motion, AnimatePresence } from 'framer-motion';
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
  return (
    <AnimatePresence>
      {target && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800/50">
              <button
                onClick={onClose}
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
                onClick={onClose}
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
