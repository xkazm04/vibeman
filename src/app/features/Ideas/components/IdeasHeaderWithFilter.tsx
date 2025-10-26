'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Layers, Folder } from 'lucide-react';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';
import VibemanControl from '../sub_Vibeman/VibemanControl';

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
  const [showContextPanel, setShowContextPanel] = React.useState(false);

  const showVibemanButton = selectedProjectId && selectedProjectId !== 'all' && selectedProjectPath;

  // Fetch contexts when a specific project is selected
  React.useEffect(() => {
    if (selectedProjectId && selectedProjectId !== 'all') {
      fetchContextsForProject(selectedProjectId);
    } else {
      setContexts([]);
      setContextGroups([]);
      setShowContextPanel(false);
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

  const getSelectedContextName = () => {
    if (!selectedContextId) return 'Full Project';
    const context = contexts.find(c => c.id === selectedContextId);
    return context ? context.name : 'Unknown Context';
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

        {/* Stats - Absolute Top Right */}
        <div className="absolute top-4 right-6 flex items-center space-x-4 bg-gray-800/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700/40">
          <div className="text-xs">
            <span className="text-gray-500">Total:</span>{' '}
            <span className="text-white font-mono font-semibold">{stats.total}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Pending:</span>{' '}
            <span className="text-blue-400 font-mono font-semibold">{stats.pending}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Accepted:</span>{' '}
            <span className="text-green-400 font-mono font-semibold">{stats.accepted}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Implemented:</span>{' '}
            <span className="text-amber-400 font-mono font-semibold">{stats.implemented}</span>
          </div>
        </div>

        {/* Project Selection Row */}
        <div className="flex items-center space-x-3 overflow-x-auto mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
                  Context:
                </span>

                {/* Context Dropdown */}
                <div className="relative">
                  <motion.button
                    onClick={() => setShowContextPanel(!showContextPanel)}
                    className="flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all bg-gray-800/40 text-gray-300 border border-gray-700/40 hover:bg-gray-800/60"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>{getSelectedContextName()}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showContextPanel ? 'rotate-180' : ''}`} />
                  </motion.button>

                  {/* Context Selection Panel */}
                  <AnimatePresence>
                    {showContextPanel && (
                      <motion.div
                        className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-700/40 rounded-lg shadow-xl z-50 overflow-hidden min-w-[300px] max-h-[400px] overflow-y-auto"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {/* Full Project Option */}
                        <button
                          onClick={() => {
                            handleContextSelect(null);
                            setShowContextPanel(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700/40 transition-colors border-b border-gray-700/20 ${
                            !selectedContextId ? 'bg-gray-700/20 text-cyan-300' : 'text-gray-300'
                          }`}
                        >
                          Full Project
                        </button>

                        {/* Grouped Contexts */}
                        {contextGroups.map((group) => {
                          const groupContexts = groupedContexts[group.id] || [];
                          if (groupContexts.length === 0) return null;

                          return (
                            <div key={group.id} className="border-b border-gray-700/20">
                              {/* Group Header */}
                              <div
                                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                                style={{ color: group.color }}
                              >
                                {group.name}
                              </div>
                              {/* Group Contexts */}
                              {groupContexts.map((context) => (
                                <button
                                  key={context.id}
                                  onClick={() => {
                                    handleContextSelect(context.id);
                                    setShowContextPanel(false);
                                  }}
                                  className={`w-full px-6 py-2 text-left text-sm hover:bg-gray-700/40 transition-colors ${
                                    selectedContextId === context.id ? 'bg-gray-700/20 text-cyan-300' : 'text-gray-300'
                                  }`}
                                >
                                  📂 {context.name}
                                </button>
                              ))}
                            </div>
                          );
                        })}

                        {/* Ungrouped Contexts */}
                        {groupedContexts.ungrouped && groupedContexts.ungrouped.length > 0 && (
                          <div>
                            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Ungrouped
                            </div>
                            {groupedContexts.ungrouped.map((context) => (
                              <button
                                key={context.id}
                                onClick={() => {
                                  handleContextSelect(context.id);
                                  setShowContextPanel(false);
                                }}
                                className={`w-full px-6 py-2 text-left text-sm hover:bg-gray-700/40 transition-colors ${
                                  selectedContextId === context.id ? 'bg-gray-700/20 text-cyan-300' : 'text-gray-300'
                                }`}
                              >
                                📂 {context.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Batch Scan All Contexts Button */}
              {onBatchScanAllContexts && contexts.length > 0 && (
                <motion.button
                  onClick={onBatchScanAllContexts}
                  className="flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title="Generate ideas for all contexts in this project"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Scan All Contexts ({contexts.length + 1})</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </div>
      </motion.div>
    </>
  );
}
