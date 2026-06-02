'use client';

import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Map, Plus, Trash2, Settings } from 'lucide-react';
import { caveat } from '@/app/fonts';
import { useShallow } from 'zustand/react/shallow';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useGlobalIdeaStats } from '@/hooks/useGlobalIdeaStats';
import { useProjectUpdatesStore } from '@/stores/projectUpdatesStore';
import { useWorkspaceFilteredProjects } from '@/hooks/useWorkspaceFilteredProjects';
import { useThemeStore, THEME_CONFIGS } from '@/stores/themeStore';

const WorkspaceManager = dynamic(
  () => import('@/app/projects/sub_Workspaces/WorkspaceManager'),
  { ssr: false }
);

export default memo(function ShortcutsBar() {
  // Onboarding: data via useShallow, action via individual selector
  const { isControlPanelOpen, isBlueprintOpen } = useOnboardingStore(useShallow(s => ({
    isControlPanelOpen: s.isControlPanelOpen,
    isBlueprintOpen: s.isBlueprintOpen,
  })));
  const toggleControlPanel = useOnboardingStore(s => s.toggleControlPanel);

  // Workspace: data via useShallow, actions via individual selectors
  const { workspaces, activeWorkspaceId } = useWorkspaceStore(useShallow(s => ({
    workspaces: s.workspaces,
    activeWorkspaceId: s.activeWorkspaceId,
  })));
  const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace);
  const syncWorkspaces = useWorkspaceStore(s => s.syncWithServer);
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace);
  const deleteWorkspace = useWorkspaceStore(s => s.deleteWorkspace);

  // Server project: action only
  const syncWithServer = useServerProjectStore(s => s.syncWithServer);

  // Client project: data + actions individually
  const selectedProjectId = useClientProjectStore(s => s.selectedProjectId);
  const setSelectedProjectId = useClientProjectStore(s => s.setSelectedProjectId);
  const setActiveProject = useClientProjectStore(s => s.setActiveProject);

  // Idea stats (custom hook - already isolated)
  const { stats, loading: statsLoading } = useGlobalIdeaStats();

  // Project updates: data via useShallow
  const { updateCount, lastUpdate } = useProjectUpdatesStore(useShallow(s => ({
    updateCount: s.updateCount,
    lastUpdate: s.lastUpdate,
  })));

  const filteredProjects = useWorkspaceFilteredProjects();

  // Theme: select primitive, derive colors via useMemo
  const theme = useThemeStore(s => s.theme);
  const colors = useMemo(() => THEME_CONFIGS[theme].colors, [theme]);

  const [workspaceDrawerOpen, setWorkspaceDrawerOpen] = useState(false);
  const [workspaceManagerOpen, setWorkspaceManagerOpen] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  // Initialize projects and workspaces on mount
  useEffect(() => {
    syncWithServer();
    syncWorkspaces();
  }, [syncWithServer, syncWorkspaces]);

  // Listen for project updates
  useEffect(() => {
    if (updateCount > 0 && lastUpdate) {
      syncWithServer();
      if (lastUpdate.type === 'delete' && selectedProjectId === lastUpdate.projectId) {
        setSelectedProjectId('all');
      }
    }
  }, [updateCount, lastUpdate, syncWithServer, selectedProjectId, setSelectedProjectId]);

  const handleWorkspaceSelect = useCallback((wsId: string) => {
    setActiveWorkspace(wsId);
    setSelectedProjectId('all');
    setWorkspaceDrawerOpen(false);
  }, [setActiveWorkspace, setSelectedProjectId]);

  const handleCreateWorkspace = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const ws = await createWorkspace({ name });
      if (ws) {
        setActiveWorkspace(ws.id);
        setSelectedProjectId('all');
        setNewWorkspaceName('');
        setCreatingWorkspace(false);
        setWorkspaceDrawerOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }, [newWorkspaceName, creating, createWorkspace, setActiveWorkspace, setSelectedProjectId]);

  const handleDeleteWorkspace = useCallback(async (
    e: React.MouseEvent,
    wsId: string,
    wsName: string,
  ) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete workspace "${wsName}"? Projects inside will become unassigned (not deleted).`
    );
    if (!confirmed) return;
    await deleteWorkspace(wsId);
    if (activeWorkspaceId === wsId) {
      setSelectedProjectId('all');
    }
  }, [deleteWorkspace, activeWorkspaceId, setSelectedProjectId]);

  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId !== 'all') {
      const project = filteredProjects.find(p => p.id === projectId);
      if (project) {
        setActiveProject(project);
      }
    }
  }, [setSelectedProjectId, setActiveProject, filteredProjects]);

  const sortedProjects = useMemo(
    () => [...filteredProjects].sort((a, b) => a.name.localeCompare(b.name)),
    [filteredProjects]
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-10 bg-black/40 backdrop-blur-sm border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center">
        {/* Left: Shortcuts */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Blueprint */}
          <motion.button
            onClick={() => toggleControlPanel()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-all duration-200 group"
            data-testid="shortcut-blueprint"
            style={{ background: (isControlPanelOpen || isBlueprintOpen) ? `${colors.baseColor}20` : 'transparent' }}
          >
            <Map className={`w-3 h-3 ${(isControlPanelOpen || isBlueprintOpen) ? colors.text : 'text-gray-500 group-hover:text-gray-300'}`} />
            <span className={`${caveat.className} text-sm font-semibold ${(isControlPanelOpen || isBlueprintOpen) ? colors.textLight : 'text-gray-500 group-hover:text-gray-300'}`}>
              Blueprint
            </span>
            <kbd className="text-xs text-cyan-500 font-mono ml-0.5">^B</kbd>
          </motion.button>

          {/* Workspace */}
          <div className="relative">
            <motion.button
              onClick={() => setWorkspaceDrawerOpen(prev => !prev)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-all duration-200 group"
              data-testid="shortcut-workspaces"
              style={{ background: workspaceDrawerOpen ? `${colors.baseColor}20` : 'transparent' }}
            >
              <Layers className={`w-3 h-3 ${workspaceDrawerOpen ? colors.text : 'text-gray-500 group-hover:text-gray-300'}`} />
              <span className={`${caveat.className} text-sm font-semibold ${workspaceDrawerOpen ? colors.textLight : 'text-gray-500 group-hover:text-gray-300'}`}>
                Workspace
              </span>
            </motion.button>

            {/* Workspace Drawer */}
            <AnimatePresence>
              {workspaceDrawerOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setWorkspaceDrawerOpen(false)}
                  />
                  <motion.div
                    className="absolute top-full left-0 mt-1 z-50 min-w-[220px] rounded-lg border border-gray-700/50 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                  >
                    <button
                      onClick={() => handleWorkspaceSelect('default')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${(!activeWorkspaceId || activeWorkspaceId === 'default')
                        ? 'text-white'
                        : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                        }`}
                      style={{
                        background: (!activeWorkspaceId || activeWorkspaceId === 'default') ? `${colors.baseColor}30` : undefined,
                      }}
                    >
                      <div className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                      <span>Unassigned</span>
                    </button>

                    {workspaces.map(ws => {
                      const isActive = activeWorkspaceId === ws.id;
                      return (
                        <div
                          key={ws.id}
                          className={`group w-full flex items-center transition-colors ${isActive
                            ? 'text-white'
                            : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                            }`}
                          style={{ background: isActive ? `${colors.baseColor}30` : undefined }}
                        >
                          <button
                            onClick={() => handleWorkspaceSelect(ws.id)}
                            className="flex-1 flex items-center gap-2.5 px-3 py-2 text-sm text-left min-w-0"
                          >
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: ws.color || '#6366f1' }}
                            />
                            <span className="truncate">{ws.name}</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteWorkspace(e, ws.id, ws.name)}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 mr-1 text-gray-500 hover:text-red-400 transition-all"
                            aria-label={`Delete workspace ${ws.name}`}
                            title="Delete workspace"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Inline create */}
                    <div className="border-t border-gray-800">
                      {creatingWorkspace ? (
                        <form onSubmit={handleCreateWorkspace} className="px-3 py-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setCreatingWorkspace(false);
                                setNewWorkspaceName('');
                              }
                            }}
                            placeholder="Workspace name"
                            autoFocus
                            disabled={creating}
                            className="flex-1 min-w-0 px-2 py-1 text-sm bg-gray-800/80 border border-gray-700/50 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                          />
                          <button
                            type="submit"
                            disabled={!newWorkspaceName.trim() || creating}
                            className="px-2 py-1 text-xs bg-blue-600/80 text-white rounded hover:bg-blue-500/80 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setCreatingWorkspace(true)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New workspace</span>
                        </button>
                      )}
                    </div>

                    {/* Manage footer */}
                    <button
                      onClick={() => {
                        setWorkspaceDrawerOpen(false);
                        setWorkspaceManagerOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-500 hover:bg-gray-800/60 hover:text-gray-300 border-t border-gray-800 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Manage workspaces…</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Project Buttons */}
        <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto mx-4">
          <button
            onClick={() => handleProjectSelect('all')}
            className={`${caveat.className} text-lg font-semibold px-2 py-0.5 rounded transition-all whitespace-nowrap ${selectedProjectId === 'all'
              ? 'text-white bg-white/10'
              : 'text-gray-500 hover:text-cyan-300'
              }`}
          >
            All
          </button>

          {sortedProjects.map(project => (
            <button
              key={project.id}
              onClick={() => handleProjectSelect(project.id)}
              className={`${caveat.className} text-lg font-semibold px-2 py-0.5 rounded transition-all whitespace-nowrap ${selectedProjectId === project.id
                ? 'text-white bg-white/10'
                : 'text-gray-500 hover:text-cyan-300'
                }`}
            >
              {project.name}
            </button>
          ))}
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`${caveat.className} text-lg font-semibold text-blue-400`}>
            {statsLoading ? '...' : stats.pending}
          </span>
          <span className={`${caveat.className} text-lg font-semibold text-green-400`}>
            {statsLoading ? '...' : stats.accepted}
          </span>
          <span className={`${caveat.className} text-lg font-semibold text-amber-400`}>
            {statsLoading ? '...' : stats.implemented}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {workspaceManagerOpen && (
          <WorkspaceManager
            isOpen={workspaceManagerOpen}
            onClose={() => setWorkspaceManagerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});
