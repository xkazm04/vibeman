'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Scan } from 'lucide-react';
import RefactorSuggestionPanel from './RefactorSuggestionPanel';

interface RefactorSuggestionWidgetProps {
  projectId: string;
  projectPath: string;
  projectType?: string;
  onIdeaGenerated?: () => void;
}

/**
 * Floating widget for the Refactor Suggestion Engine
 * Designed to be used alongside the Vibeman control
 */
export default function RefactorSuggestionWidget({
  projectId,
  projectPath,
  projectType,
  onIdeaGenerated,
}: RefactorSuggestionWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className="fixed bottom-20 left-6 z-40 w-[400px]"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="refactor-suggestion-widget"
    >
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden">
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between bg-gray-800/60 hover:bg-gray-800/80 transition-colors border-b border-gray-700/40"
          data-testid="refactor-widget-toggle-btn"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-sm font-semibold text-gray-300">REFACTOR ENGINE</span>
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
              <RefactorSuggestionPanel
                projectId={projectId}
                projectPath={projectPath}
                projectType={projectType}
                onGenerateIdeas={(ids) => {
                  console.log('Generated ideas from suggestions:', ids);
                  onIdeaGenerated?.();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
