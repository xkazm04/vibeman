/**
 * DocsAnalysisLayout Component
 * Main orchestrator for the 3-level documentation analysis module
 * Implements Google Maps-style zoom transitions between levels
 * Includes context group management and relationships panels
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, ChevronDown, ChevronUp } from 'lucide-react';
import SystemMap from './components/SystemMap';
import ModuleExplorer from './components/ModuleExplorer';
import ContextDocumentation from './components/ContextDocumentation';
import ArchitectureGroupList from './components/ArchitectureGroupList';
import ArchitectureRelationships from './components/ArchitectureRelationships';
import { ZoomLevel, NavigationState } from './lib/types';
import { useContextStore, ContextGroup } from '@/stores/contextStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';

// Zoom level configurations
const ZOOM_CONFIGS: Record<ZoomLevel, { scale: number; label: string }> = {
  1: { scale: 1, label: 'System Overview' },
  2: { scale: 1.5, label: 'Module Details' },
  3: { scale: 2, label: 'Documentation' },
};

// Zoom transition variants - creates the "zoom in/out" effect
const zoomVariants = {
  initial: (direction: 'in' | 'out' | null) => ({
    scale: direction === 'in' ? 0.8 : 1.2,
    opacity: 0,
    filter: 'blur(10px)',
  }),
  animate: {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 20,
      mass: 0.8,
    },
  },
  exit: (direction: 'in' | 'out' | null) => ({
    scale: direction === 'in' ? 1.2 : 0.8,
    opacity: 0,
    filter: 'blur(10px)',
    transition: {
      duration: 0.3,
    },
  }),
};

// Breadcrumb component
function NavigationBreadcrumb({
  state,
  onNavigateToLevel,
  groups,
  contexts,
}: {
  state: NavigationState;
  onNavigateToLevel: (level: ZoomLevel) => void;
  groups: ContextGroup[];
  contexts: import('@/stores/contextStore').Context[];
}) {
  const selectedGroup = state.selectedModuleId 
    ? groups.find(g => g.id === state.selectedModuleId) 
    : null;
  const selectedContext = state.selectedUseCaseId 
    ? contexts.find(c => c.id === state.selectedUseCaseId) 
    : null;

  const items = [
    { level: 1 as ZoomLevel, label: 'System', icon: <Home className="w-3.5 h-3.5" /> },
    ...(selectedGroup
      ? [{ level: 2 as ZoomLevel, label: selectedGroup.name, icon: <Compass className="w-3.5 h-3.5" /> }]
      : []),
    ...(selectedContext
      ? [{ level: 3 as ZoomLevel, label: selectedContext.name, icon: <Compass className="w-3.5 h-3.5" /> }]
      : []),
  ];

  return (
    <div className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={item.level}>
          {index > 0 && <span className="text-gray-600 mx-1">/</span>}
          <button
            onClick={() => onNavigateToLevel(item.level)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              state.level === item.level
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            disabled={state.level === item.level}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function DocsAnalysisLayout() {
  const [navState, setNavState] = useState<NavigationState>({
    level: 1,
    selectedModuleId: null,
    selectedUseCaseId: null,
    transitionDirection: null,
  });
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [relationships, setRelationships] = useState<ContextGroupRelationship[]>([]);
  const [loading, setLoading] = useState(false);

  const { groups, contexts, loadProjectData } = useContextStore();
  const { activeProject } = useActiveProjectStore();

  // Get selected group and its contexts
  const selectedGroup = navState.selectedModuleId 
    ? groups.find(g => g.id === navState.selectedModuleId) || null 
    : null;
  
  // Filter contexts for the selected group
  const selectedGroupContexts = useMemo(() => {
    if (!navState.selectedModuleId) return [];
    return contexts.filter(c => c.groupId === navState.selectedModuleId);
  }, [contexts, navState.selectedModuleId]);

  // Get selected context for Level 3
  const selectedContext = navState.selectedUseCaseId
    ? contexts.find(c => c.id === navState.selectedUseCaseId) || null
    : null;

  // Load project data and relationships
  useEffect(() => {
    if (activeProject?.id) {
      loadProjectData(activeProject.id);
      loadRelationships(activeProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  const loadRelationships = async (projectId: string) => {
    try {
      const response = await fetch(`/api/context-group-relationships?projectId=${projectId}`);
      const data = await response.json();
      if (data.success) {
        setRelationships(data.data);
      }
    } catch (error) {
      console.error('Failed to load relationships:', error);
    }
  };

  // Handle group updates (name or type)
  const handleUpdateGroup = useCallback(async (
    groupId: string,
    updates: { name?: string; type?: 'pages' | 'client' | 'server' | 'external' | null }
  ) => {
    if (!activeProject?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/context-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, updates }),
      });
      
      if (response.ok) {
        // Reload project data to get updated groups
        await loadProjectData(activeProject.id);
      }
    } catch (error) {
      console.error('Failed to update group:', error);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, loadProjectData]);

  // Handle relationship creation
  const handleCreateRelationship = useCallback(async (sourceGroupId: string, targetGroupId: string) => {
    if (!activeProject?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/context-group-relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          sourceGroupId,
          targetGroupId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create relationship');
      }
      
      await loadRelationships(activeProject.id);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  // Handle relationship deletion
  const handleDeleteRelationship = useCallback(async (relationshipId: string) => {
    if (!activeProject?.id) return;
    
    setLoading(true);
    try {
      await fetch(`/api/context-group-relationships?relationshipId=${relationshipId}`, {
        method: 'DELETE',
      });
      
      await loadRelationships(activeProject.id);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  // Navigate to a module (Level 1 → Level 2)
  const handleModuleSelect = useCallback((moduleId: string) => {
    setNavState({
      level: 2,
      selectedModuleId: moduleId,
      selectedUseCaseId: null,
      transitionDirection: 'in',
    });
  }, []);

  // Navigate to a use case (Level 2 → Level 3)
  const handleUseCaseSelect = useCallback((useCaseId: string) => {
    setNavState((prev) => ({
      ...prev,
      level: 3,
      selectedUseCaseId: useCaseId,
      transitionDirection: 'in',
    }));
  }, []);

  // Navigate back from Level 2 → Level 1
  const handleBackToSystem = useCallback(() => {
    setNavState({
      level: 1,
      selectedModuleId: null,
      selectedUseCaseId: null,
      transitionDirection: 'out',
    });
  }, []);

  // Navigate back from Level 3 → Level 2
  const handleBackToModule = useCallback(() => {
    setNavState((prev) => ({
      ...prev,
      level: 2,
      selectedUseCaseId: null,
      transitionDirection: 'out',
    }));
  }, []);

  // Navigate to a specific level via breadcrumb
  const handleNavigateToLevel = useCallback((level: ZoomLevel) => {
    if (level === navState.level) return;

    const direction = level > navState.level ? 'in' : 'out';

    if (level === 1) {
      setNavState({
        level: 1,
        selectedModuleId: null,
        selectedUseCaseId: null,
        transitionDirection: direction,
      });
    } else if (level === 2) {
      setNavState((prev) => ({
        ...prev,
        level: 2,
        selectedUseCaseId: null,
        transitionDirection: direction,
      }));
    }
    // Level 3 requires a use case selection, can't navigate directly
  }, [navState.level]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 rounded-2xl overflow-hidden">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/30 bg-gray-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Architecture Explorer</h2>
            <p className="text-[10px] text-gray-500">{ZOOM_CONFIGS[navState.level].label}</p>
          </div>
        </div>

        <NavigationBreadcrumb 
          state={navState} 
          onNavigateToLevel={handleNavigateToLevel}
          groups={groups}
          contexts={contexts}
        />
      </div>

      {/* Content Area with Zoom Transitions */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={navState.transitionDirection}>
          {navState.level === 1 && (
            <motion.div
              key="level-1"
              className="absolute inset-0"
              variants={zoomVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              custom={navState.transitionDirection}
            >
              <SystemMap 
                onModuleSelect={handleModuleSelect}
                groups={groups}
                relationships={relationships}
              />
            </motion.div>
          )}

          {navState.level === 2 && navState.selectedModuleId && (
            <motion.div
              key="level-2"
              className="absolute inset-0"
              variants={zoomVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              custom={navState.transitionDirection}
            >
              <ModuleExplorer
                moduleId={navState.selectedModuleId}
                onBack={handleBackToSystem}
                onUseCaseSelect={handleUseCaseSelect}
                group={selectedGroup}
                contexts={selectedGroupContexts}
              />
            </motion.div>
          )}

          {navState.level === 3 && navState.selectedUseCaseId && (
            <motion.div
              key="level-3"
              className="absolute inset-0 bg-gray-950/80"
              variants={zoomVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              custom={navState.transitionDirection}
            >
              <ContextDocumentation
                useCaseId={navState.selectedUseCaseId}
                onBack={handleBackToModule}
                context={selectedContext}
                group={selectedGroup}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Management Panel - Collapsible - Full height overlay when expanded */}
      <AnimatePresence>
        {isPanelExpanded && (
          <motion.div
            className="absolute inset-0 top-[52px] z-20 bg-gray-900/95 backdrop-blur-md border-t border-gray-700/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="h-full flex flex-col">
              {/* Panel Header */}
              <button
                onClick={() => setIsPanelExpanded(false)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800/30 transition-colors border-b border-gray-700/30"
              >
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Group Management
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Panel Content - fills remaining height */}
              <div className="flex-1 overflow-hidden p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  {/* Context Groups List */}
                  <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
                    <ArchitectureGroupList
                      groups={groups}
                      onUpdateGroup={handleUpdateGroup}
                      loading={loading}
                    />
                  </div>

                  {/* Relationships Management */}
                  <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
                    <ArchitectureRelationships
                      groups={groups}
                      relationships={relationships}
                      onCreateRelationship={handleCreateRelationship}
                      onDeleteRelationship={handleDeleteRelationship}
                      loading={loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Panel Toggle Button */}
      {!isPanelExpanded && (
        <div className="border-t border-gray-700/30 bg-gray-900/60 backdrop-blur-sm">
          <button
            onClick={() => setIsPanelExpanded(true)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800/30 transition-colors"
          >
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Group Management
            </span>
            <ChevronUp className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}
