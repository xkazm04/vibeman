'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Context } from '@/lib/queries/contextQueries';

interface ContextSelectorProps {
  contexts: Context[];
  selectedContext: Context | undefined;
  onSelectContext: (contextId: string | null) => void;
  disabled?: boolean;
}

export default function ContextSelector({
  contexts,
  selectedContext,
  onSelectContext,
  disabled = false
}: ContextSelectorProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  if (contexts.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-700/40 bg-gray-800/40 hover:bg-gray-800/60 transition-all text-xs"
        whileHover={{ scale: disabled ? 1 : 1.02 }}
      >
        <span className="text-gray-300">📂 {selectedContext ? selectedContext.name : 'Full Project'}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700/40 rounded-lg shadow-xl z-50 overflow-hidden min-w-[200px]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <button
              onClick={() => {
                onSelectContext(null);
                setShowMenu(false);
              }}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-700/40 transition-colors ${
                !selectedContext ? 'bg-gray-700/20 text-cyan-300' : 'text-gray-300'
              }`}
            >
              Full Project
            </button>
            {contexts.map((context) => (
              <button
                key={context.id}
                onClick={() => {
                  onSelectContext(context.id);
                  setShowMenu(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-700/40 transition-colors ${
                  selectedContext?.id === context.id ? 'bg-gray-700/20 text-cyan-300' : 'text-gray-300'
                }`}
              >
                📂 {context.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
