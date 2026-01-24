'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Map } from 'lucide-react';
import { Caveat } from 'next/font/google';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useGlobalIdeaStats } from '@/hooks/useGlobalIdeaStats';
import { useProjectUpdatesStore } from '@/stores/projectUpdatesStore';
import { useWorkspaceFilteredProjects } from '@/hooks/useWorkspaceFilteredProjects';
import { useThemeStore } from '@/stores/themeStore';

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export default function ShortcutsBar() {
  const { toggleControlPanel, isControlPanelOpen, isBlueprintOpen } = useOnboardingStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspace, syncWithServer: syncWorkspaces } = useWorkspaceStore();
  const { syncWithServer } = useServerProjectStore();
  const { selectedProjectId, setSelectedProjectId, setActiveProject } = useClientProjectStore();
  const { stats, loading: statsLoading } = useGlobalIdeaStats();
  const { updateCount, lastUpdate } = useProjectUpdatesStore();
  const filteredProjects = useWorkspaceFilteredProjects();
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  const [workspaceDrawerOpen, setWorkspaceDrawerOpen] = useState(false);

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
                    className="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-lg border border-gray-700/50 bg-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
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

                    {workspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => handleWorkspaceSelect(ws.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${activeWorkspaceId === ws.id
                          ? 'text-white'
                          : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                          }`}
                        style={{
                          background: activeWorkspaceId === ws.id ? `${colors.baseColor}30` : undefined,
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ws.color || '#6366f1' }}
                        />
                        <span className="truncate">{ws.name}</span>
                      </button>
                    ))}
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
    </div>
  );
}
