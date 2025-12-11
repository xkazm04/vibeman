'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useProjectContexts } from '@/lib/queries/contextsQueries';
import type { Context, ContextGroup } from '@/lib/queries/contextsQueries';
import ProjectRowSelection from './ProjectRowSelection';
import ContextRowSelection from './ContextRowSelection';

interface IdeasHeaderWithFilterProps {
  projects: Array<{ id: string; name: string }>;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  selectedContextIds: string[];
  onSelectContexts: (contextIds: string[]) => void;
  onBatchScanAllContexts?: () => void;
  selectedProjectPath?: string;
  onIdeaImplemented?: () => void;
}

export default function IdeasHeaderWithFilter({
  projects,
  selectedProjectId,
  onSelectProject,
  selectedContextIds,
  onSelectContexts,
  onBatchScanAllContexts,
  selectedProjectPath,
  onIdeaImplemented,
}: IdeasHeaderWithFilterProps) {
  // Use React Query hook for automatic caching and deduplication
  const projectId = selectedProjectId !== 'all' ? selectedProjectId : null;
  const { data, isLoading } = useProjectContexts(projectId);

  const contexts = data?.contexts || [];
  const contextGroups = data?.groups || [];

  return (
    <>
      <motion.div
        className="relative border-b border-gray-700/40 bg-gray-900/60 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Context Selection Row - Only show when a specific project is selected */}
          {selectedProjectId !== 'all' && (
            <ContextRowSelection
              contexts={contexts}
              contextGroups={contextGroups}
              selectedContextIds={selectedContextIds}
              onSelectContexts={onSelectContexts}
            />
          )}
        </div>
      </motion.div>
    </>
  );
}
