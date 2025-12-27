/**
 * Manager Layout Component
 * Main wrapper that now integrates Goal Hub for goal-driven development
 * Also maintains the original implementation review functionality as a tab
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, FileCheck, CheckCircle2, Users } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useContextStore } from '@/stores/contextStore';
import { useThemeStore } from '@/stores/themeStore';

// Goal Hub
import GoalHubLayout from './GoalHub/GoalHubLayout';

// Standup Wizard
import StandupWizard from './Standup/StandupWizard';

// Original implementation review components
import { EnrichedImplementationLog } from './lib/types';
import ImplementationLogDetail from './components/ImplementationLogDetail';
import ManagerHeader, { ViewMode } from './components/ManagerHeader';
import ManagerCardGrid from './components/ManagerCardGrid';
import ManagerSystemMap from './components/ManagerSystemMap';
import { acceptImplementation } from '@/lib/tools';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';

interface ManagerLayoutProps {
  projectId?: string | null;
}

type ManagerTab = 'goals' | 'standup' | 'review';

export default function ManagerLayout({ projectId }: ManagerLayoutProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<ManagerTab>('goals');

  // Original review state
  const [implementationLogs, setImplementationLogs] = useState<EnrichedImplementationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<EnrichedImplementationLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [filterByProject, setFilterByProject] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<ContextGroupRelationship[]>([]);

  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const { groups: contextGroups, loadProjectData } = useContextStore();
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  // Determine which projectId to use for filtering
  const effectiveProjectId = filterByProject ? (projectId || activeProject?.id) : null;

  // Fetch implementation logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = effectiveProjectId
        ? `/api/implementation-logs/untested?projectId=${effectiveProjectId}`
        : '/api/implementation-logs/untested';

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setImplementationLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching implementation logs:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  // Fetch logs when on review tab and filter changes
  useEffect(() => {
    if (activeTab === 'review') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  // Load context groups when project changes
  useEffect(() => {
    const pid = projectId || activeProject?.id;
    if (pid) {
      loadProjectData(pid);
      fetch(`/api/context-group-relationships?projectId=${pid}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRelationships(data.data || []);
          }
        })
        .catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, activeProject?.id]);

  // Filter logs by selected group in map view
  const filteredLogs = useMemo(() => {
    if (viewMode === 'cards' || !selectedGroupId) {
      return implementationLogs;
    }
    return implementationLogs.filter(log => log.context_group_id === selectedGroupId);
  }, [implementationLogs, viewMode, selectedGroupId]);

  const handleAccept = async () => {
    if (!selectedLog) return;

    try {
      const result = await acceptImplementation(selectedLog.id);

      if (result.success) {
        setImplementationLogs(prev => prev.filter(log => log.id !== selectedLog.id));
        setSelectedLog(null);
      } else {
        console.error('Error accepting implementation:', result.error);
      }
    } catch (error) {
      console.error('Error accepting implementation:', error);
    }
  };

  const handleLogsAccepted = () => {
    setImplementationLogs([]);
    setSelectedGroupId(null);
  };

  const handleRequirementCreated = (requirementName: string) => {
    console.log('Requirement created:', requirementName);
  };

  const handleGroupClick = (groupId: string) => {
    setSelectedGroupId(prev => prev === groupId ? null : groupId);
  };

  // Count for badge
  const reviewCount = implementationLogs.length;

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="manager-layout">
      {/* Tab Navigation */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'goals'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Target className="w-4 h-4" />
              <span className="font-medium">Goal Hub</span>
            </button>
            <button
              onClick={() => setActiveTab('standup')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'standup'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">Standup</span>
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'review'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span className="font-medium">Review</span>
              {reviewCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded-full">
                  {reviewCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'goals' && (
          <motion.div
            key="goals"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GoalHubLayout />
          </motion.div>
        )}

        {activeTab === 'standup' && (
          <motion.div
            key="standup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <StandupWizard />
          </motion.div>
        )}

        {activeTab === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6"
          >
            {/* Original Review Content */}
            <ManagerHeader
              implementationLogs={implementationLogs}
              viewMode={viewMode}
              setViewMode={setViewMode}
              filterByProject={filterByProject}
              setFilterByProject={setFilterByProject}
              onLogsAccepted={handleLogsAccepted}
              onNewTask={() => {}}
              loading={loading}
              hasActiveProject={!!activeProject}
            />

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className={`w-12 h-12 border-4 ${colors.border} border-t-current ${colors.textDark} rounded-full animate-spin mx-auto mb-4`} />
                  <p className="text-gray-400">Loading implementation logs...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && implementationLogs.length === 0 && (
              <div className="flex items-center justify-center min-h-[400px]" data-testid="manager-empty-state">
                <div className="text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
                  <p className="text-gray-400">No untested implementations to review</p>
                </div>
              </div>
            )}

            {/* Content Views */}
            {!loading && implementationLogs.length > 0 && (
              <AnimatePresence mode="wait">
                {viewMode === 'map' ? (
                  <motion.div
                    key="map-view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-4 h-[600px]"
                    data-testid="manager-map-view"
                  >
                    <div className="w-1/2 h-full">
                      <ManagerSystemMap
                        logs={implementationLogs}
                        contextGroups={contextGroups}
                        relationships={relationships}
                        selectedGroupId={selectedGroupId}
                        onGroupClick={handleGroupClick}
                      />
                    </div>
                    <div className="w-1/2 h-full overflow-hidden rounded-xl border border-gray-800 bg-gray-900/30">
                      <div className="p-3 border-b border-gray-800 bg-gray-900/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">
                            {selectedGroupId
                              ? `Changes in ${contextGroups.find(g => g.id === selectedGroupId)?.name || 'Group'}`
                              : 'All Changes'}
                          </span>
                          <span className="text-xs text-cyan-400 font-mono">
                            {filteredLogs.length} items
                          </span>
                        </div>
                      </div>
                      <div className="h-[calc(100%-52px)] overflow-y-auto">
                        {filteredLogs.length > 0 ? (
                          <ManagerCardGrid
                            logs={filteredLogs}
                            onLogClick={(log) => setSelectedLog(log)}
                            isFiltered={true}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 text-sm">
                              {selectedGroupId ? 'No changes in this group' : 'Select a group to filter'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="cards-view"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    data-testid="manager-cards-view"
                  >
                    <ManagerCardGrid
                      logs={implementationLogs}
                      onLogClick={(log) => setSelectedLog(log)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
              {selectedLog && (
                <ImplementationLogDetail
                  log={selectedLog}
                  onClose={() => setSelectedLog(null)}
                  onAccept={handleAccept}
                  onRequirementCreated={handleRequirementCreated}
                  projectPath={activeProject?.path}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
