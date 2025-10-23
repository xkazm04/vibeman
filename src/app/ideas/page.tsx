'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DbIdea } from '@/app/db';
import IdeaStickyNote from './components/IdeaStickyNote';
import IdeaDetailModal from './components/IdeaDetailModal';
import ScanTypeSelector, { ScanType } from './components/ScanTypeSelector';
import ScanInitiator from './components/ScanInitiator';
import ProjectFilter from './components/ProjectFilter';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useContextStore } from '@/stores/contextStore';
import { Lightbulb, Loader2, Trash2 } from 'lucide-react';

export default function IdeasPage() {
  const [ideas, setIdeas] = React.useState<DbIdea[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedIdea, setSelectedIdea] = React.useState<DbIdea | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [filterProject, setFilterProject] = React.useState<string>('all');
  const [selectedScanTypes, setSelectedScanTypes] = React.useState<ScanType[]>(['overall']);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = React.useState(false);
  const [deletingAll, setDeletingAll] = React.useState(false);

  const { projects, initializeProjects } = useProjectConfigStore();
  const { contexts } = useContextStore();

  // Initialize projects on mount
  React.useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Fetch ideas on mount
  React.useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ideas');
      if (response.ok) {
        const data = await response.json();
        setIdeas(data.ideas || []);
      }
    } catch (error) {
      console.error('Error fetching ideas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIdeaUpdate = async (updatedIdea: DbIdea) => {
    // Update the idea in the list
    setIdeas(ideas.map(idea => idea.id === updatedIdea.id ? updatedIdea : idea));
    setSelectedIdea(updatedIdea);
  };

  const handleIdeaDelete = async (deletedIdeaId: string) => {
    // Remove the idea from the list
    setIdeas(ideas.filter(idea => idea.id !== deletedIdeaId));
    setSelectedIdea(null);
  };

  const handleIdeaClose = () => {
    setSelectedIdea(null);
    // No refresh needed - updates are handled optimistically
  };

  const handleScanComplete = () => {
    // Refresh ideas after scan completes
    fetchIdeas();
  };

  const handleDeleteAll = async () => {
    try {
      setDeletingAll(true);
      const response = await fetch('/api/ideas?all=true', {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Deleted ${data.deletedCount} ideas`);
        setIdeas([]);
        setShowDeleteAllConfirm(false);
      } else {
        console.error('Failed to delete all ideas');
      }
    } catch (error) {
      console.error('Error deleting all ideas:', error);
    } finally {
      setDeletingAll(false);
    }
  };

  // Helper function to get project name from ID
  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || projectId;
  };

  // Helper function to get context name from ID
  const getContextName = (contextId: string): string => {
    const context = contexts.find(c => c.id === contextId);
    return context?.name || contextId;
  };

  // Group ideas by project and context
  const groupedIdeas = React.useMemo(() => {
    let filtered = ideas;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(idea => idea.status === filterStatus);
    }

    // Filter by project
    if (filterProject !== 'all') {
      filtered = filtered.filter(idea => idea.project_id === filterProject);
    }

    const groups: Record<string, Record<string, DbIdea[]>> = {};

    filtered.forEach(idea => {
      const projectKey = idea.project_id || 'unknown';
      const contextKey = idea.context_id || 'no-context';

      if (!groups[projectKey]) {
        groups[projectKey] = {};
      }
      if (!groups[projectKey][contextKey]) {
        groups[projectKey][contextKey] = [];
      }

      groups[projectKey][contextKey].push(idea);
    });

    return groups;
  }, [ideas, filterStatus, filterProject]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <motion.div
        className="border-b border-gray-700/40 bg-gray-900/60 backdrop-blur-xl"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/30 rounded-xl border border-blue-500/40"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Lightbulb className="w-6 h-6 text-blue-400" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  All Ideas
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  LLM-generated insights across all projects
                </p>
              </div>
            </div>

            {/* Stats - Right */}
            <div className="flex items-center space-x-6">
              <div className="text-xs">
                <span className="text-gray-500">Total:</span>{' '}
                <span className="text-white font-mono font-semibold">{ideas.length}</span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Pending:</span>{' '}
                <span className="text-blue-400 font-mono font-semibold">
                  {ideas.filter(i => i.status === 'pending').length}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Accepted:</span>{' '}
                <span className="text-green-400 font-mono font-semibold">
                  {ideas.filter(i => i.status === 'accepted').length}
                </span>
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Implemented:</span>{' '}
                <span className="text-amber-400 font-mono font-semibold">
                  {ideas.filter(i => i.status === 'implemented').length}
                </span>
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-gray-800/60 border border-gray-700/40 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-blue-500/40"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="implemented">Implemented</option>
              </select>

              {/* Delete All Button */}
              {!showDeleteAllConfirm ? (
                <motion.button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Delete all ideas (for testing)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete All</span>
                </motion.button>
              ) : (
                <div className="flex items-center space-x-2">
                  <motion.button
                    onClick={handleDeleteAll}
                    disabled={deletingAll}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/40 border border-red-500/60 rounded-lg text-xs text-red-300 font-bold transition-all disabled:opacity-50"
                    whileHover={{ scale: deletingAll ? 1 : 1.05 }}
                    whileTap={{ scale: deletingAll ? 1 : 0.95 }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deletingAll ? 'Deleting...' : 'Confirm'}</span>
                  </motion.button>
                  <button
                    onClick={() => setShowDeleteAllConfirm(false)}
                    disabled={deletingAll}
                    className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Scan Initiator - Standalone Row */}
      <ScanInitiator onScanComplete={handleScanComplete} selectedScanTypes={selectedScanTypes} />

      {/* Project Filter - Standalone Row */}
      <ProjectFilter
        projects={projects}
        selectedProjectId={filterProject}
        onSelectProject={setFilterProject}
      />

      {/* Content */}
      <div className="w-full px-6 py-8">
        {/* Scan Type Selector */}
        <div className="mb-8">
          <ScanTypeSelector selectedTypes={selectedScanTypes} onChange={setSelectedScanTypes} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-8 h-8 text-blue-400" />
            </motion.div>
          </div>
        ) : ideas.length === 0 ? (
          <motion.div
            className="text-center py-24"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Lightbulb className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No ideas yet</h3>
            <p className="text-gray-500">
              Use the Generate Ideas button above to analyze your codebase
            </p>
          </motion.div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedIdeas).map(([projectId, contexts]) => (
              <motion.div
                key={projectId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span>{getProjectName(projectId)}</span>
                </h2>

                <div className="space-y-8">
                  {Object.entries(contexts).map(([contextId, contextIdeas]) => (
                    <div key={contextId}>
                      {contextId !== 'no-context' && (
                        <h3 className="text-sm font-medium text-gray-400 mb-4 ml-4">
                          📂 {getContextName(contextId)}
                        </h3>
                      )}

                      {/* Sticky Notes Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {contextIdeas.map((idea, index) => (
                          <IdeaStickyNote
                            key={idea.id}
                            idea={idea}
                            index={index}
                            onClick={() => setSelectedIdea(idea)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedIdea && (
          <IdeaDetailModal
            idea={selectedIdea}
            onClose={handleIdeaClose}
            onUpdate={handleIdeaUpdate}
            onDelete={handleIdeaDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
