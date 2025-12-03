/**
 * DocsAnalysisLayout Component
 * Main orchestrator for the 3-level documentation analysis module
 * Implements Google Maps-style zoom transitions between levels
 * Includes context group management and relationships panels
 *
 * Features:
 * - Impact Simulator: Togglable simulation mode for what-if analysis of context moves
 * - X-Ray Mode: Real-time data flow visualization showing API traffic patterns
 *
 * Uses React Query for API data caching with 5-minute stale-while-revalidate TTL.
 * This eliminates redundant fetches when navigating between zoom levels.
 *
 * Navigation state is managed by useArchitectureNavigation hook.
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass } from 'lucide-react';

// Components
import SystemMap from './components/SystemMap';
import ModuleExplorer from './components/ModuleExplorer';
import ContextDocumentation from './components/ContextDocumentation';
import NavigationBreadcrumb from './components/NavigationBreadcrumb';
import ManagementPanel from './components/ManagementPanel';
import { zoomVariants } from './components/zoomVariants';

// Simulation and X-Ray features
import { SimulationModeToggle, SimulationSystemMap } from '../sub_ImpactSimulator';
import { XRayModeToggle, XRaySystemMap, XRayHotPathsPanel } from '../sub_XRay';

// Hooks and types
import { useArchitectureNavigation } from './lib/useArchitectureNavigation';
import { useContextStore } from '@/stores/contextStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useXRayStore, useXRayIsConnected } from '@/stores/xrayStore';
import { startXRaySimulation, stopXRaySimulation } from '@/lib/xrayInstrumentation';
import {
  useProjectContextData,
  useRelationships,
  useUpdateGroup,
  useCreateRelationship,
  useDeleteRelationship,
  useDocsAnalysisPrefetch,
} from './lib/useDocsAnalysisQueries';

export default function DocsAnalysisLayout() {
  // Navigation state managed by custom hook
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

  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isXRayMode, setIsXRayMode] = useState(false);
  const [isHotPathsPanelExpanded, setIsHotPathsPanelExpanded] = useState(false);

  // X-Ray store
  const { events: xrayEvents } = useXRayStore();
  const isXRayConnected = useXRayIsConnected();

  const { activeProject } = useActiveProjectStore();
  const projectId = activeProject?.id;

  // Context store for move operations
  const { moveContext } = useContextStore();

  // React Query hooks for data fetching with caching (5-minute stale-while-revalidate)
  const { groups, contexts } = useProjectContextData(projectId);
  const { relationships } = useRelationships(projectId);

  // Prefetch hooks for predictive data loading on hover
  const { prefetchGroupContexts, prefetchContextDocumentation } = useDocsAnalysisPrefetch(projectId);

  // Mutation hooks with optimistic updates
  const updateGroupMutation = useUpdateGroup(projectId);
  const createRelationshipMutation = useCreateRelationship(projectId);
  const deleteRelationshipMutation = useDeleteRelationship(projectId);

  // Combined loading state for mutations
  const isMutating =
    updateGroupMutation.isPending ||
    createRelationshipMutation.isPending ||
    deleteRelationshipMutation.isPending;

  // Get selected group and its contexts
  const selectedGroup = selectedModuleId
    ? groups.find(g => g.id === selectedModuleId) || null
    : null;

  // Filter contexts for the selected group
  const selectedGroupContexts = useMemo(() => {
    if (!selectedModuleId) return [];
    return contexts.filter(c => c.groupId === selectedModuleId);
  }, [contexts, selectedModuleId]);

  // Get selected context for Level 3
  const selectedContext = selectedUseCaseId
    ? contexts.find(c => c.id === selectedUseCaseId) || null
    : null;

  // Handle group updates using React Query mutation with optimistic updates
  const handleUpdateGroup = useCallback(
    async (
      groupId: string,
      updates: { name?: string; type?: 'pages' | 'client' | 'server' | 'external' | null }
    ) => {
      updateGroupMutation.mutate({ groupId, updates });
    },
    [updateGroupMutation]
  );

  // Handle relationship creation using React Query mutation with optimistic updates
  const handleCreateRelationship = useCallback(
    async (sourceGroupId: string, targetGroupId: string) => {
      createRelationshipMutation.mutate({ sourceGroupId, targetGroupId });
    },
    [createRelationshipMutation]
  );

  // Handle relationship deletion using React Query mutation with optimistic updates
  const handleDeleteRelationship = useCallback(
    async (relationshipId: string) => {
      deleteRelationshipMutation.mutate(relationshipId);
    },
    [deleteRelationshipMutation]
  );

  // Handle context move from simulation mode
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
    // Disable X-Ray mode when enabling simulation
    if (!isSimulationMode) {
      setIsXRayMode(false);
      stopXRaySimulation();
    }
    // When enabling simulation, go back to system level for best experience
    if (!isSimulationMode && !isAtSystemLevel) {
      navigateBackToSystem();
    }
  }, [isSimulationMode, isAtSystemLevel, navigateBackToSystem]);

  // Toggle X-Ray mode
  const handleToggleXRay = useCallback(() => {
    const newXRayMode = !isXRayMode;
    setIsXRayMode(newXRayMode);

    // Disable simulation mode when enabling X-Ray
    if (newXRayMode) {
      setIsSimulationMode(false);
      // Start demo simulation to show traffic
      startXRaySimulation('medium');
    } else {
      stopXRaySimulation();
    }

    // When enabling X-Ray, go back to system level for best experience
    if (newXRayMode && !isAtSystemLevel) {
      navigateBackToSystem();
    }
  }, [isXRayMode, isAtSystemLevel, navigateBackToSystem]);

  // Cleanup X-Ray simulation on unmount
  useEffect(() => {
    return () => {
      stopXRaySimulation();
    };
  }, []);

  return (
    <div
      className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 rounded-2xl overflow-hidden"
      data-testid="docs-analysis-layout"
    >
      {/* Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/30 bg-gray-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Architecture Explorer</h2>
            <p className="text-[10px] text-gray-500">{currentLevelLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* X-Ray Mode Toggle - only show at system level */}
          {isAtSystemLevel && (
            <XRayModeToggle
              isEnabled={isXRayMode}
              onToggle={handleToggleXRay}
              isConnected={isXRayConnected}
              eventCount={xrayEvents.length}
            />
          )}

          {/* Simulation Mode Toggle - only show at system level */}
          {isAtSystemLevel && (
            <SimulationModeToggle
              isEnabled={isSimulationMode}
              onToggle={handleToggleSimulation}
              isAnalyzing={isAnalyzing}
            />
          )}

          <NavigationBreadcrumb
            state={navState}
            onNavigateToLevel={navigateToLevel}
            groups={groups}
            contexts={contexts}
          />
        </div>
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
                    onModuleSelect={navigateToModule}
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
                  onModuleSelect={navigateToModule}
                  onModuleHover={prefetchGroupContexts}
                  onMoveContext={handleMoveContext}
                />
              ) : (
                <SystemMap
                  onModuleSelect={navigateToModule}
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
                onBack={navigateBackToSystem}
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
  );
}
