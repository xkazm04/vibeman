'use client';

/**
 * ObservatoryDashboard - Combined Architecture Explorer + Observability View
 * Integrates the 3-level architecture zoom with API observability metrics.
 *
 * When a context group is selected in the Architecture Explorer:
 * - X-Ray mode shows traffic for that group
 * - Observability metrics filter to show only endpoints linked to that group
 *
 * This is the unified view replacing the standalone Docs module.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Activity, RefreshCw, Calendar, Settings, Grid3X3, List } from 'lucide-react';

// Architecture components from Docs
import SystemMap from '@/app/features/Docs/sub_DocsAnalysis/components/SystemMap';
import ModuleExplorer from '@/app/features/Docs/sub_DocsAnalysis/components/ModuleExplorer';
import ContextDocumentation from '@/app/features/Docs/sub_DocsAnalysis/components/ContextDocumentation';
import NavigationBreadcrumb from '@/app/features/Docs/sub_DocsAnalysis/components/NavigationBreadcrumb';
import ManagementPanel from '@/app/features/Docs/sub_DocsAnalysis/components/ManagementPanel';
import { zoomVariants } from '@/app/features/Docs/sub_DocsAnalysis/components/zoomVariants';

// Simulation and X-Ray features
import { SimulationModeToggle, SimulationSystemMap } from '@/app/features/Docs/sub_ImpactSimulator';
import { XRayModeToggle, XRaySystemMap, XRayHotPathsPanel } from '@/app/features/Docs/sub_XRay';

// Architecture hooks
import { useArchitectureNavigation } from '@/app/features/Docs/sub_DocsAnalysis/lib/useArchitectureNavigation';
import { useContextStore } from '@/stores/contextStore';
import { useXRayStore, useXRayIsConnected } from '@/stores/xrayStore';
import { startXRaySimulation, stopXRaySimulation } from '@/lib/xrayInstrumentation';
import {
  useProjectContextData,
  useRelationships,
  useUpdateGroup,
  useCreateRelationship,
  useDeleteRelationship,
  useDocsAnalysisPrefetch,
} from '@/app/features/Docs/sub_DocsAnalysis/lib/useDocsAnalysisQueries';

// Observability components
import { ObsKPICards, EndpointUsageChart, EndpointTable, OnboardingStepper } from './components';
import {
  fetchObservabilityStats,
  checkProjectRegistration,
  updateObservabilityConfig
} from './lib/observabilityApi';
import { ObsStatsResponse, ObsEndpointSummary, ObsConfigResponse } from './lib/types';

// Stores
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

type ViewMode = 'architecture' | 'metrics';

interface DashboardState {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  registered: boolean;
  enabled: boolean;
  stats: ObsStatsResponse | null;
  topEndpoints: ObsEndpointSummary[];
  highErrorEndpoints: ObsEndpointSummary[];
  config: ObsConfigResponse | null;
}

const DAYS_OPTIONS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' }
];

export default function ObservatoryDashboard() {
  const { activeProject: clientProject } = useClientProjectStore();
  const { activeProject } = useActiveProjectStore();

  // Use either project store's active project
  const projectId = activeProject?.id || clientProject?.id || '';
  const projectPath = activeProject?.path || clientProject?.path || '';
  const projectName = activeProject?.name || clientProject?.name || 'Unknown Project';

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('architecture');
  const [days, setDays] = useState(7);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Observability state
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    hasData: false,
    registered: false,
    enabled: false,
    stats: null,
    topEndpoints: [],
    highErrorEndpoints: [],
    config: null
  });

  // Architecture Navigation
  const {
    state: navState,
    currentLevelLabel,
    selectedModuleId,
    selectedUseCaseId,
    transitionDirection,
    isAtSystemLevel,
    isAtModuleLevel,
    isAtDocumentationLevel,
    navigateToModule,
    navigateToUseCase,
    navigateBackToSystem,
    navigateBackToModule,
    navigateToLevel,
  } = useArchitectureNavigation();

  // Architecture state
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isXRayMode, setIsXRayMode] = useState(false);
  const [isHotPathsPanelExpanded, setIsHotPathsPanelExpanded] = useState(false);

  // X-Ray store
  const { events: xrayEvents } = useXRayStore();
  const isXRayConnected = useXRayIsConnected();

  // Context store for move operations
  const { moveContext } = useContextStore();

  // React Query hooks for data fetching
  const { groups, contexts } = useProjectContextData(projectId);
  const { relationships } = useRelationships(projectId);
  const { prefetchGroupContexts, prefetchContextDocumentation } = useDocsAnalysisPrefetch(projectId);

  // Mutation hooks
  const updateGroupMutation = useUpdateGroup(projectId);
  const createRelationshipMutation = useCreateRelationship(projectId);
  const deleteRelationshipMutation = useDeleteRelationship(projectId);

  const isMutating =
    updateGroupMutation.isPending ||
    createRelationshipMutation.isPending ||
    deleteRelationshipMutation.isPending;

  // Get selected group and its contexts
  const selectedGroup = selectedModuleId
    ? groups.find(g => g.id === selectedModuleId) || null
    : null;

  const selectedGroupContexts = useMemo(() => {
    if (!selectedModuleId) return [];
    return contexts.filter(c => c.groupId === selectedModuleId);
  }, [contexts, selectedModuleId]);

  const selectedContext = selectedUseCaseId
    ? contexts.find(c => c.id === selectedUseCaseId) || null
    : null;

  // Load observability data
  const loadData = useCallback(async () => {
    if (!projectId) {
      setState(s => ({
        ...s,
        loading: false,
        error: 'No project selected'
      }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const registration = await checkProjectRegistration(projectId);

      if (!registration.hasData) {
        setState(s => ({
          ...s,
          loading: false,
          hasData: false,
          registered: registration.registered,
          enabled: registration.enabled,
          config: registration.config
        }));
        return;
      }

      // Fetch stats
      const statsResponse = await fetchObservabilityStats(projectId, days);

      setState({
        loading: false,
        error: null,
        hasData: statsResponse.hasData,
        registered: registration.registered,
        enabled: registration.enabled,
        stats: statsResponse.stats,
        topEndpoints: statsResponse.topEndpoints || [],
        highErrorEndpoints: statsResponse.highErrorEndpoints || [],
        config: registration.config
      });
    } catch (error) {
      setState(s => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    }
  }, [projectId, days, selectedGroupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle module selection - update selectedGroupId for filtering
  const handleModuleSelect = useCallback((moduleId: string) => {
    setSelectedGroupId(moduleId);
    navigateToModule(moduleId);
  }, [navigateToModule]);

  // Handle back to system - clear group filter
  const handleBackToSystem = useCallback(() => {
    setSelectedGroupId(null);
    navigateBackToSystem();
  }, [navigateBackToSystem]);

  // Handle group updates
  const handleUpdateGroup = useCallback(
    async (
      groupId: string,
      updates: { name?: string; type?: 'pages' | 'client' | 'server' | 'external' | null }
    ) => {
      updateGroupMutation.mutate({ groupId, updates });
    },
    [updateGroupMutation]
  );

  const handleCreateRelationship = useCallback(
    async (sourceGroupId: string, targetGroupId: string) => {
      createRelationshipMutation.mutate({ sourceGroupId, targetGroupId });
    },
    [createRelationshipMutation]
  );

  const handleDeleteRelationship = useCallback(
    async (relationshipId: string) => {
      deleteRelationshipMutation.mutate(relationshipId);
    },
    [deleteRelationshipMutation]
  );

  const handleMoveContext = useCallback(
    async (contextId: string, newGroupId: string) => {
      try {
        await moveContext(contextId, newGroupId);
      } catch (error) {
        console.error('Failed to move context:', error);
        throw error;
      }
    },
    [moveContext]
  );

  // Toggle simulation mode
  const handleToggleSimulation = useCallback(() => {
    setIsSimulationMode(prev => !prev);
    if (!isSimulationMode) {
      setIsXRayMode(false);
      stopXRaySimulation();
    }
    if (!isSimulationMode && !isAtSystemLevel) {
      handleBackToSystem();
    }
  }, [isSimulationMode, isAtSystemLevel, handleBackToSystem]);

  // Toggle X-Ray mode
  const handleToggleXRay = useCallback(() => {
    const newXRayMode = !isXRayMode;
    setIsXRayMode(newXRayMode);

    if (newXRayMode) {
      setIsSimulationMode(false);
      startXRaySimulation('medium');
    } else {
      stopXRaySimulation();
    }

    if (newXRayMode && !isAtSystemLevel) {
      handleBackToSystem();
    }
  }, [isXRayMode, isAtSystemLevel, handleBackToSystem]);

  // Cleanup X-Ray simulation on unmount
  useEffect(() => {
    return () => {
      stopXRaySimulation();
    };
  }, []);

  const handleToggleEnabled = async () => {
    if (!projectId || !state.config) return;

    try {
      await updateObservabilityConfig(projectId, { enabled: !state.config.enabled });
      loadData();
    } catch (error) {
      console.error('Failed to toggle observability:', error);
    }
  };

  // No project selected
  if (!projectId) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Compass className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No Project Selected</h3>
          <p className="text-sm text-gray-500">
            Select a project to view architecture and observability data.
          </p>
        </div>
      </div>
    );
  }

  const { stats } = state;
  const selectedGroupForBreadcrumb = selectedGroupId
    ? groups.find(g => g.id === selectedGroupId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-200">Observatory</h2>
            <p className="text-sm text-gray-400 mt-1">
              {selectedGroupForBreadcrumb
                ? `Viewing: ${selectedGroupForBreadcrumb.name}`
                : 'Architecture & API Traffic'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('architecture')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                viewMode === 'architecture'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Architecture
            </button>
            <button
              onClick={() => setViewMode('metrics')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                viewMode === 'metrics'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              Metrics
            </button>
          </div>

          {/* Date range selector (for metrics) */}
          {viewMode === 'metrics' && (
            <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
              <Calendar className="w-4 h-4 text-gray-500 ml-2" />
              {DAYS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDays(opt.value)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    days === opt.value
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* X-Ray Mode Toggle - only in architecture view at system level */}
          {viewMode === 'architecture' && isAtSystemLevel && (
            <XRayModeToggle
              isEnabled={isXRayMode}
              onToggle={handleToggleXRay}
              isConnected={isXRayConnected}
              eventCount={xrayEvents.length}
            />
          )}

          {/* Simulation Mode Toggle - only in architecture view at system level */}
          {viewMode === 'architecture' && isAtSystemLevel && (
            <SimulationModeToggle
              isEnabled={isSimulationMode}
              onToggle={handleToggleSimulation}
              isAnalyzing={isAnalyzing}
            />
          )}

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-gray-700 text-gray-200' : 'bg-gray-800/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Refresh */}
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && state.config && (
        <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-200">Observability Settings</h3>
              <p className="text-sm text-gray-400">Provider: {state.config.provider}</p>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                state.config.enabled
                  ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {state.config.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      {viewMode === 'architecture' ? (
        /* Architecture Explorer View */
        <div
          className="h-[600px] flex flex-col bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 rounded-2xl overflow-hidden border border-gray-700/30"
          data-testid="observatory-architecture"
        >
          {/* Navigation Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/30 bg-gray-900/40 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] text-gray-500">{currentLevelLabel}</p>
              </div>
            </div>

            <NavigationBreadcrumb
              state={navState}
              onNavigateToLevel={navigateToLevel}
              groups={groups}
              contexts={contexts}
            />
          </div>

          {/* Content Area with Zoom Transitions */}
          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="wait" custom={transitionDirection}>
              {isAtSystemLevel && (
                <motion.div
                  key="level-1"
                  className="absolute inset-0"
                  variants={zoomVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  custom={transitionDirection}
                  data-testid="level-1-system-map"
                >
                  {isXRayMode ? (
                    <>
                      <XRaySystemMap
                        onModuleSelect={handleModuleSelect}
                        groups={groups}
                        relationships={relationships}
                        onModuleHover={prefetchGroupContexts}
                      />
                      <XRayHotPathsPanel
                        isExpanded={isHotPathsPanelExpanded}
                        onToggle={() => setIsHotPathsPanelExpanded(!isHotPathsPanelExpanded)}
                      />
                    </>
                  ) : isSimulationMode ? (
                    <SimulationSystemMap
                      groups={groups}
                      contexts={contexts}
                      relationships={relationships}
                      isSimulationEnabled={isSimulationMode}
                      onModuleSelect={handleModuleSelect}
                      onModuleHover={prefetchGroupContexts}
                      onMoveContext={handleMoveContext}
                    />
                  ) : (
                    <SystemMap
                      onModuleSelect={handleModuleSelect}
                      groups={groups}
                      relationships={relationships}
                      onModuleHover={prefetchGroupContexts}
                    />
                  )}
                </motion.div>
              )}

              {isAtModuleLevel && selectedModuleId && (
                <motion.div
                  key="level-2"
                  className="absolute inset-0"
                  variants={zoomVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  custom={transitionDirection}
                  data-testid="level-2-module-explorer"
                >
                  <ModuleExplorer
                    moduleId={selectedModuleId}
                    onBack={handleBackToSystem}
                    onUseCaseSelect={navigateToUseCase}
                    group={selectedGroup}
                    contexts={selectedGroupContexts}
                    onContextHover={prefetchContextDocumentation}
                  />
                </motion.div>
              )}

              {isAtDocumentationLevel && selectedUseCaseId && (
                <motion.div
                  key="level-3"
                  className="absolute inset-0 bg-gray-950/80"
                  variants={zoomVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  custom={transitionDirection}
                  data-testid="level-3-context-docs"
                >
                  <ContextDocumentation
                    useCaseId={selectedUseCaseId}
                    onBack={navigateBackToModule}
                    context={selectedContext}
                    group={selectedGroup}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Management Panel - Collapsible */}
          <ManagementPanel
            isExpanded={isPanelExpanded}
            onToggle={() => setIsPanelExpanded(!isPanelExpanded)}
            groups={groups}
            relationships={relationships}
            onUpdateGroup={handleUpdateGroup}
            onCreateRelationship={handleCreateRelationship}
            onDeleteRelationship={handleDeleteRelationship}
            isMutating={isMutating}
          />
        </div>
      ) : (
        /* Metrics View */
        <div className="space-y-6">
          {/* Filter indicator when viewing specific group */}
          {selectedGroupId && selectedGroupForBreadcrumb && (
            <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedGroupForBreadcrumb.color || '#3B82F6' }}
                />
                <span className="text-cyan-300 font-medium">
                  Filtering by: {selectedGroupForBreadcrumb.name}
                </span>
                <span className="text-cyan-400/60 text-sm">
                  ({selectedGroupForBreadcrumb.type || 'server'} layer)
                </span>
              </div>
              <button
                onClick={() => setSelectedGroupId(null)}
                className="px-3 py-1 text-sm text-cyan-300 hover:text-cyan-200 bg-cyan-500/20 rounded-lg"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* Loading state */}
          {state.loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex items-center gap-3 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading observability data...</span>
              </div>
            </div>
          ) : state.error ? (
            /* Error state */
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="text-red-400 mb-4">{state.error}</div>
                <button
                  onClick={loadData}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !state.hasData ? (
            /* No data - show onboarding */
            <OnboardingStepper
              projectId={projectId}
              projectPath={projectPath}
              projectName={projectName}
              onComplete={loadData}
            />
          ) : (
            /* Has data - show metrics */
            <>
              {/* KPI Cards */}
              {stats && (
                <ObsKPICards
                  totalCalls={stats.summary.total_calls}
                  uniqueEndpoints={stats.summary.unique_endpoints}
                  avgResponseTimeMs={stats.summary.avg_response_time_ms}
                  errorRate={stats.summary.error_rate}
                />
              )}

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Endpoints Chart */}
                <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">Top Endpoints by Usage</h3>
                  <EndpointUsageChart endpoints={state.topEndpoints} />
                </div>

                {/* High Error Endpoints */}
                <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">
                    Endpoints with High Error Rates
                    {state.highErrorEndpoints.length === 0 && (
                      <span className="text-sm font-normal text-green-400 ml-2">All healthy!</span>
                    )}
                  </h3>
                  {state.highErrorEndpoints.length > 0 ? (
                    <EndpointUsageChart endpoints={state.highErrorEndpoints} />
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">All good</div>
                        <p>No high-error endpoints detected</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Endpoints Table */}
              <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-200">
                    {selectedGroupId ? 'Tracked Endpoints (Filtered)' : 'All Tracked Endpoints'}
                  </h3>
                </div>
                {stats && (
                  <EndpointTable
                    endpoints={stats.endpoints}
                    trends={stats.trends}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
