'use client';

import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import ObservatoryDashboard from '@/app/features/reflector/sub_Observability/ObservatoryDashboard';
import { ViewToggleHeader, type OverviewView } from './sub_WorkspaceArchitecture';
import ArchitectureBottomBar from './sub_WorkspaceArchitecture/components/ArchitectureBottomBar';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { getWorkspaceProjects } from '@/lib/workspaceProjects';

// Lazy load views
const MatrixDiagramCanvas = lazy(() => import('./sub_WorkspaceArchitecture/views/MatrixDiagramCanvas'));
const ArchitecturePlayground = lazy(() => import('./sub_WorkspaceArchitecture/views/ArchitecturePlayground'));

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-[#0a0a0c]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">Loading view...</span>
      </div>
    </div>
  );
}

export default function OverviewLayout() {
  const [view, setView] = useState<OverviewView>('architecture');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);

  const { activeWorkspaceId, workspaceProjectMap } = useWorkspaceStore();
  const { projects } = useServerProjectStore();

  // Get workspace projects for bottom bar (all projects when no workspace selected)
  const workspaceProjects = useMemo(
    () => (!activeWorkspaceId || activeWorkspaceId === 'default')
      ? projects
      : getWorkspaceProjects(projects, activeWorkspaceId, workspaceProjectMap),
    [activeWorkspaceId, workspaceProjectMap, projects],
  );

  // Handle project selection from architecture view
  const handleProjectSelect = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, []);

  // Handle drill-down to observatory view
  const handleDrillDown = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(`Project ${projectId.slice(-1)}`);
    setView('observatory');
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    setView('architecture');
    setSelectedProjectName(null);
  }, []);

  return (
    <div
      className="flex flex-col bg-[#0a0a0c] relative overflow-hidden"
      style={{ height: 'calc(100vh - 2.5rem)' }}
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0c]/50 to-[#0a0a0c] pointer-events-none" />

      {/* Ambient Glow Effects */}
      <div className="absolute top-0 left-1/4 w-1/3 h-1/3 bg-cyan-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-1/4 h-1/4 bg-purple-500/5 blur-[80px] pointer-events-none" />

      {/* View Toggle Header */}
      <div className="flex-shrink-0 relative z-10">
        <ViewToggleHeader
          view={view}
          onViewChange={setView}
          selectedProjectName={selectedProjectName}
          onBack={view === 'observatory' && selectedProjectName ? handleBack : undefined}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10" style={{ minHeight: 0 }}>
        <div className="absolute inset-0">
          {view === 'architecture' && (
            <Suspense fallback={<LoadingFallback />}>
              <MatrixDiagramCanvas
                workspaceId={activeWorkspaceId}
                onProjectSelect={handleProjectSelect}
              />
            </Suspense>
          )}
          {view === 'observatory' && (
            <div className="w-full h-full overflow-auto">
              <ObservatoryDashboard />
            </div>
          )}
          {view === 'playground' && (
            <Suspense fallback={<LoadingFallback />}>
              <ArchitecturePlayground
                workspaceId={activeWorkspaceId}
                projects={workspaceProjects}
                onClose={() => setView('architecture')}
              />
            </Suspense>
          )}
        </div>
      </div>

      {/* Bottom Bar - only show in architecture view */}
      {view === 'architecture' && (
        <div className="relative z-10">
          <ArchitectureBottomBar
            workspaceId={activeWorkspaceId}
            projects={workspaceProjects}
          />
        </div>
      )}
    </div>
  );
}
