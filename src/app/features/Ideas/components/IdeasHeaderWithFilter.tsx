'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';
import VibemanControl from '../sub_Vibeman/VibemanControl';
import TokenHeatmapModal from './TokenHeatmapModal';

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
  const [showTokenHeatmap, setShowTokenHeatmap] = React.useState(false);

  const showVibemanButton = selectedProjectId && selectedProjectId !== 'all' && selectedProjectPath;

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

  // Group contexts by context group
  const groupedContexts = React.useMemo(() => {
    const grouped: Record<string, Context[]> = {
      ungrouped: [],
    };

    contextGroups.forEach(group => {
      grouped[group.id] = [];
    });

    contexts.forEach(context => {
      if (context.groupId) {
        if (grouped[context.groupId]) {
          grouped[context.groupId].push(context);
        }
      } else {
        grouped.ungrouped.push(context);
      }
    });

    return grouped;
  }, [contexts, contextGroups]);

  const handleContextSelect = (contextId: string | null) => {
    if (onSelectContext) {
      onSelectContext(contextId);
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
        <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Stats and Token Heatmap Button - Absolute Top Right */}
        <div className="absolute top-4 right-6 flex items-center space-x-3">
          {/* Token Heatmap Button */}
          <motion.button
            onClick={() => setShowTokenHeatmap(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-sm font-medium transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View token usage analytics"
          >
            <Activity className="w-4 h-4" />
            <span>Token Usage</span>
          </motion.button>

          {/* Stats */}
          <div className="flex items-center space-x-4 bg-gray-800/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700/40">
            <div className="text-sm">
              <span className="text-gray-500">Total:</span>{' '}
              <span className="text-white font-mono font-semibold">{stats.total}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Pending:</span>{' '}
              <span className="text-blue-400 font-mono font-semibold">{stats.pending}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Accepted:</span>{' '}
              <span className="text-green-400 font-mono font-semibold">{stats.accepted}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Implemented:</span>{' '}
              <span className="text-amber-400 font-mono font-semibold">{stats.implemented}</span>
            </div>
          </div>
        </div>

        {/* Project Selection Row */}
        <div className="flex items-center space-x-3 overflow-x-auto mb-3">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide shrink-0">
            Projects:
          </span>
          <motion.button
            onClick={() => onSelectProject('all')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
              selectedProjectId === 'all'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            All Projects
          </motion.button>
          {projects.map((project) => (
            <motion.button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                selectedProjectId === project.id
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {project.name}
            </motion.button>
          ))}
        </div>

        {/* Context Selection Row - Only show when a specific project is selected */}
        {selectedProjectId !== 'all' && contexts.length > 0 && (
          <motion.div
            className="pt-3 border-t border-gray-700/20"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-start gap-3">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide shrink-0 pt-1.5">
                Context:
              </span>

              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Full Project Button */}
                <motion.button
                  onClick={() => handleContextSelect(null)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    !selectedContextId
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Full Project
                </motion.button>

                {/* Grouped Contexts with Colored Dividers */}
                {contextGroups.map((group) => {
                  const groupContexts = groupedContexts[group.id] || [];
                  if (groupContexts.length === 0) return null;

                  return (
                    <React.Fragment key={group.id}>
                      {/* Colored Divider */}
                      <div
                        className="w-px h-8"
                        style={{ backgroundColor: group.color || '#6b7280' }}
                      />

                      {/* Group Contexts */}
                      {groupContexts.map((context) => (
                        <motion.button
                          key={context.id}
                          onClick={() => handleContextSelect(context.id)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            selectedContextId === context.id
                              ? 'text-cyan-300 border border-cyan-500/40'
                              : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                          }`}
                          style={{
                            backgroundColor: selectedContextId === context.id
                              ? `${group.color}20`
                              : undefined,
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {context.name}
                        </motion.button>
                      ))}
                    </React.Fragment>
                  );
                })}

                {/* Ungrouped Contexts */}
                {groupedContexts.ungrouped && groupedContexts.ungrouped.length > 0 && (
                  <>
                    {contextGroups.length > 0 && (
                      <div className="w-px h-8 bg-gray-600" />
                    )}
                    {groupedContexts.ungrouped.map((context) => (
                      <motion.button
                        key={context.id}
                        onClick={() => handleContextSelect(context.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          selectedContextId === context.id
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60 hover:text-gray-300'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {context.name}
                      </motion.button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
      </motion.div>

      {/* Token Heatmap Modal */}
      <TokenHeatmapModal
        isOpen={showTokenHeatmap}
        onClose={() => setShowTokenHeatmap(false)}
        projectId={selectedProjectId}
      />
    </>
  );
}
