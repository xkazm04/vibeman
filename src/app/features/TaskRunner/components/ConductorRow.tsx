'use client';

/**
 * ConductorRow — Always-visible conductor section in TaskRunner.
 *
 * When active runs exist: shows compact pipeline cards (4 across page width).
 * When empty: shows a minimal empty state with a + button to quick-start.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Workflow } from 'lucide-react';
import { ConductorCompactCard } from './ConductorCompactCard';
import { ConductorQuickStart } from './ConductorQuickStart';
import type { ConductorRunSummary } from '../hooks/useConductorSync';

interface ConductorRowProps {
  runs: ConductorRunSummary[];
  /** Called after a pipeline is started from the quick-start panel */
  onRunStarted?: () => void;
}

export const ConductorRow = memo(function ConductorRow({ runs, onRunStarted }: ConductorRowProps) {
  const hasRuns = runs.length > 0;

  return (
    <div className="space-y-2">
      {/* Section header — always visible */}
      <div className="flex items-center gap-2">
        <Workflow className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-caption font-medium text-gray-500 uppercase tracking-wider">
          Conductor Pipelines
        </span>
        <ConductorQuickStart onRunStarted={onRunStarted} />
        {hasRuns && (
          <span className="text-2xs text-gray-600 tabular-nums">
            ({runs.length} active)
          </span>
        )}
      </div>

      {hasRuns ? (
        /* Cards grid — 4 columns max */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {runs.map((run) => (
              <ConductorCompactCard key={run.id} run={run} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-4 rounded-lg border border-dashed border-gray-800/60 bg-gray-900/20"
        >
          <p className="text-caption text-gray-600">
            No active pipelines. Click <span className="text-gray-400 font-medium">+</span> to start one.
          </p>
        </motion.div>
      )}
    </div>
  );
});
