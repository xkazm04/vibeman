'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';
import VibemanControl from '../sub_Vibeman/VibemanControl';
import IdeasStats from './IdeasStats';
import ProjectRowSelection from './ProjectRowSelection';
import ContextRowSelection from './ContextRowSelection';

interface IdeaStats {
  total: number;
  pending: number;
  accepted: number;
  implemented: number;
}

interface IdeasHeaderWithFilterProps {
  projects: Array<{ id: string; name: string }>;
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  selectedContextId?: string | null;
  onSelectContext?: (contextId: string | null) => void;
  onBatchScanAllContexts?: () => void;
  stats: IdeaStats;
  selectedProjectPath?: string;
  onIdeaImplemented?: () => void;
}

export default function IdeasHeaderWithFilter({
  projects,
  selectedProjectId,
  onSelectProject,
  selectedContextId,
  onSelectContext,
  onBatchScanAllContexts,
  stats,
  selectedProjectPath,
  onIdeaImplemented,
}: IdeasHeaderWithFilterProps) {
  const [contexts, setContexts] = React.useState<Context[]>([]);
  const [contextGroups, setContextGroups] = React.useState<ContextGroup[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Fetch contexts when a specific project is selected
  React.useEffect(() => {
    if (selectedProjectId && selectedProjectId !== 'all') {
      fetchContextsForProject(selectedProjectId);
    } else {
      setContexts([]);
      setContextGroups([]);
    }
  }, [selectedProjectId]);

  const fetchContextsForProject = async (projectId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contexts?projectId=${encodeURIComponent(projectId)}`);
      if (response.ok) {
        const data = await response.json();
        setContexts(data.data.contexts || []);
        setContextGroups(data.data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching contexts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Type-safe check: only render Vibeman widget when we have valid project metadata
  const showVibemanWidget =
    selectedProjectId &&
    selectedProjectId !== 'all' &&
    selectedProjectPath !== undefined &&
    selectedProjectPath !== null;

  return (
    <>
      {/* Fixed Vibeman Widget - Only visible when project is selected */}
      {showVibemanWidget && (
        <VibemanControl
          projectId={selectedProjectId}
          projectPath={selectedProjectPath}
          onIdeaImplemented={onIdeaImplemented}
        />
      )}

      <motion.div
        className="relative border-b border-gray-700/40 bg-gray-900/60 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Project Selection Row */}
          <div className="mb-3">
            <ProjectRowSelection
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject}
            />
          </div>

          {/* Context Selection Row - Only show when a specific project is selected */}
          {selectedProjectId !== 'all' && (
            <ContextRowSelection
              contexts={contexts}
              contextGroups={contextGroups}
              selectedContextId={selectedContextId}
              onSelectContext={onSelectContext || (() => {})}
            />
          )}
        </div>

        {/* Stats - Absolute Top Right */}
        <div className="absolute top-4 right-6">
          <IdeasStats stats={stats} />
        </div>
      </motion.div>
    </>
  );
}
