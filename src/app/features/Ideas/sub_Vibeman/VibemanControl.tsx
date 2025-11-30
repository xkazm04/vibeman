'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import VibemanAutomation from './VibemanAutomation';

interface VibemanControlProps {
  projectId: string;
  projectPath: string;
  onIdeaImplemented?: () => void;
}

export default function VibemanControl({
  projectId,
  projectPath,
  onIdeaImplemented,
}: VibemanControlProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      className="fixed bottom-20 right-6 z-40"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden">
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between bg-gray-800/60 hover:bg-gray-700/70 transition-all duration-200 border-b border-gray-700/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400/70"
          data-testid="vibeman-control-toggle-btn"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse Vibeman panel' : 'Expand Vibeman panel'}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-gray-300">VIBEMAN</span>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </motion.div>
        </button>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-3">
                <VibemanAutomation
                  projectId={projectId}
                  projectPath={projectPath}
                  onIdeaImplemented={onIdeaImplemented}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
