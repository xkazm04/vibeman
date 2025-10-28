'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileCode, CheckCircle2, Clock } from 'lucide-react';

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
  const isTested = log.tested === 1;

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return 'just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleToggleTested = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleTested) {
      onToggleTested(log.id, !isTested);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-lg border border-gray-700/40 bg-gray-800/30 p-3 hover:bg-gray-800/50 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileCode className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-gray-200 truncate" title={log.title}>
            {log.title}
          </h3>
        </div>

        {/* Tested toggle button */}
        <button
          onClick={handleToggleTested}
          className={`
            flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors
            ${isTested
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-gray-700/40 text-gray-400 hover:bg-gray-700/60'
            }
          `}
          title={isTested ? 'Mark as untested' : 'Mark as tested'}
        >
          {isTested ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              Tested
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              Untested
            </>
          )}
        </button>
      </div>

      {/* Overview */}
      <p className="text-xs text-gray-400 mb-2 line-clamp-2">
        {log.overview}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span className="font-mono truncate" title={log.requirement_name}>
          {log.requirement_name}
        </span>
        <span>{formatDate(log.created_at)}</span>
      </div>
    </motion.div>
  );
}
