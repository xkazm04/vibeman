'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useProjectContexts } from '@/lib/queries/contextsQueries';
import type { Context as DbContext, ContextGroup as DbContextGroup } from '@/lib/queries/contextsQueries';
import type { Context, ContextGroup } from '@/lib/queries/contextQueries';
import ProjectRowSelection from './ProjectRowSelection';
import ContextRowSelection from './ContextRowSelection';

// Transform snake_case DB format to camelCase UI format
function transformContext(dbContext: DbContext): Context {
  return {
    id: dbContext.id,
    projectId: dbContext.project_id,
    groupId: dbContext.group_id,
    name: dbContext.name,
    description: dbContext.description ?? undefined,
    filePaths: dbContext.file_paths ? JSON.parse(dbContext.file_paths) : [],
    createdAt: new Date(dbContext.created_at),
    updatedAt: new Date(dbContext.updated_at),
    hasContextFile: dbContext.has_context_file === 1,
    contextFilePath: dbContext.context_file_path ?? undefined,
    preview: dbContext.preview,
    testScenario: dbContext.test_scenario,
    testUpdated: dbContext.test_updated,
    target: dbContext.target,
    target_fulfillment: dbContext.target_fulfillment,
    target_rating: dbContext.target_rating,
  };
}

function transformContextGroup(dbGroup: DbContextGroup): ContextGroup {
  return {
    id: dbGroup.id,
    projectId: dbGroup.project_id,
    name: dbGroup.name,
    color: dbGroup.color,
    position: dbGroup.position,
    type: dbGroup.type,
    icon: dbGroup.icon,
    createdAt: new Date(dbGroup.created_at),
    updatedAt: new Date(dbGroup.updated_at),
  };
}

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

  // Transform from DB format (snake_case) to UI format (camelCase)
  const contexts = useMemo(
    () => (data?.contexts || []).map(transformContext),
    [data?.contexts]
  );
  const contextGroups = useMemo(
    () => (data?.groups || []).map(transformContextGroup),
    [data?.groups]
  );

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
