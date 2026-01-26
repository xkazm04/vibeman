'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Wrench } from 'lucide-react';
import ContextMapPanel from './ContextMapPanel';
import ArchitectureAnalysisPanel from './ArchitectureAnalysisPanel';

interface ArchitectureBottomBarProps {
  workspaceId: string | null;
  projects: Array<{ id: string; name: string; path: string }>;
  onAnalysisPrompt: (prompt: string, analysisId: string) => void;
}

export default function ArchitectureBottomBar({
  workspaceId,
  projects,
  onAnalysisPrompt,
}: ArchitectureBottomBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex-shrink-0 mb-[100px]">
      {/* Collapse bar - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full h-10 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm border-t border-cyan-500/10 hover:bg-zinc-800/60 transition-all group"
      >
        <ChevronUp
          className={`w-4 h-4 text-cyan-400/60 group-hover:text-cyan-400 transition-all duration-200 ${
            isExpanded ? '' : 'rotate-180'
          }`}
        />
        <div className="ml-2 p-1 rounded bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
          <Wrench className="w-3 h-3 text-cyan-400/70" />
        </div>
        <span className="ml-2 text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
          {isExpanded ? 'Collapse Tools' : 'Analysis Tools'}
        </span>
        {projects.length > 0 && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/10 text-[10px] text-cyan-400/70 border border-cyan-500/20">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 260, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-cyan-500/10"
          >
            <div className="h-full grid grid-cols-2 gap-[1px] bg-cyan-500/10">
              {/* Left: Context Map */}
              <ContextMapPanel projects={projects} />

              {/* Right: Architecture Analysis */}
              <ArchitectureAnalysisPanel
                workspaceId={workspaceId}
                projects={projects}
                onAnalysisPrompt={onAnalysisPrompt}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
