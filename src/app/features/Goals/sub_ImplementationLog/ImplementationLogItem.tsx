'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, CheckCircle2, ChevronRight, Github } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatDate';

export interface ImplementationLog {
  id: string;
  project_id: string;
  requirement_name: string;
  title: string;
  overview: string;
  tested: number; // SQLite boolean (0 or 1)
  created_at: string;
}

interface ImplementationLogItemProps {
  log: ImplementationLog;
  onToggleTested?: (logId: string, tested: boolean) => void;
}

export default function ImplementationLogItem({
  log,
  onToggleTested,
}: ImplementationLogItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTested = log.tested === 1;

  const handleToggleTested = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleTested) {
      onToggleTested(log.id, true); // Always mark as tested (true)
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="relative rounded-lg border border-gray-700/40 bg-gray-800/30 overflow-hidden hover:border-gray-600/50 transition-colors"
    >
      {/* Header - Always visible */}
      <div
        onClick={handleToggleExpand}
        className="flex items-start justify-between gap-2 p-3 cursor-pointer"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Expand Icon */}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          </motion.div>

          {/* File Icon */}
          <FileCode className="w-4 h-4 text-purple-400 flex-shrink-0" />

          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-200 truncate flex-1" title={log.title}>
            {log.title}
          </h3>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Github Icon Button - Dummy for now */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Future: navigate to GitHub
            }}
            data-testid={`github-${log.id}`}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-all duration-300 cursor-pointer group"
            title="View on GitHub (coming soon)"
          >
            <Github className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors duration-300" />
          </button>

          {/* Green Check Icon Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTested(e);
            }}
            data-testid={`mark-tested-${log.id}`}
            className="p-1.5 hover:bg-green-500/10 rounded-lg transition-all duration-300 cursor-pointer group"
            title="Mark as tested"
          >
            <CheckCircle2 className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors duration-300" />
          </button>
        </div>
      </div>

      {/* Expandable Description */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-700/40"
          >
            <div className="p-3 pt-2">
              {/* Overview */}
              <p className="text-sm text-gray-300 mb-3 whitespace-pre-wrap">
                {log.overview}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-gray-700/30">
                <span className="font-mono truncate" title={log.requirement_name}>
                  {log.requirement_name}
                </span>
                <span>{formatRelativeTime(log.created_at)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
