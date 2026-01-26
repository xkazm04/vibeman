'use client';

import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Terminal } from 'lucide-react';
import ObservatoryDashboard from '@/app/features/reflector/sub_Observability/ObservatoryDashboard';
import { ViewToggleHeader, type OverviewView } from './sub_WorkspaceArchitecture';
import ArchitectureBottomBar from './sub_WorkspaceArchitecture/components/ArchitectureBottomBar';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import type { QueuedTask } from '@/components/cli/types';

// Lazy load the Matrix architecture view
const MatrixDiagramCanvas = lazy(() => import('./sub_WorkspaceArchitecture/views/MatrixDiagramCanvas'));

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

  // Terminal state for architecture analysis
  const [showTerminal, setShowTerminal] = useState(false);
  const [analysisTask, setAnalysisTask] = useState<QueuedTask | null>(null);
  const [autoStartAnalysis, setAutoStartAnalysis] = useState(false);

  const { activeWorkspaceId, workspaceProjectMap } = useWorkspaceStore();
  const { projects } = useServerProjectStore();

  // Get workspace projects for bottom bar
  const workspaceProjects = useMemo(() => {
    if (!activeWorkspaceId || activeWorkspaceId === 'default') {
      return projects;
    }
    const projectIds = workspaceProjectMap[activeWorkspaceId] || [];
    return projects.filter((p) => projectIds.includes(p.id));
  }, [activeWorkspaceId, workspaceProjectMap, projects]);

  // Get the first project path for terminal context
  const getProjectPathForTerminal = useCallback(() => {
    if (!activeWorkspaceId || activeWorkspaceId === 'default') {
      // Use first project if no workspace selected
      return projects[0]?.path || '.';
    }
    const projectIds = workspaceProjectMap[activeWorkspaceId] || [];
    const firstProject = projects.find(p => projectIds.includes(p.id));
    return firstProject?.path || projects[0]?.path || '.';
  }, [activeWorkspaceId, workspaceProjectMap, projects]);

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

  // Handle analysis prompt from MatrixDiagramCanvas
  const handleAnalysisPrompt = useCallback((prompt: string, analysisId: string) => {
    const projectPath = getProjectPathForTerminal();

    const task: QueuedTask = {
      id: `arch-analysis-${analysisId}`,
      projectId: activeWorkspaceId || 'default',
      projectPath,
      projectName: 'Architecture Analysis',
      requirementName: `Analysis ${analysisId.slice(-8)}`,
      status: 'pending',
      addedAt: Date.now(),
      directPrompt: prompt,
    };

    setAnalysisTask(task);
    setShowTerminal(true);
    setAutoStartAnalysis(true);
  }, [activeWorkspaceId, getProjectPathForTerminal]);

  // Handle batch onboarding prompt from MatrixDiagramCanvas
  const handleBatchOnboarding = useCallback((prompt: string, onboardingId: string) => {
    // Use Vibeman's own project path for the terminal context
    const projectPath = 'C:\\Users\\kazda\\kiro\\vibeman';

    const task: QueuedTask = {
      id: `batch-onboard-${onboardingId}`,
      projectId: activeWorkspaceId || 'default',
      projectPath,
      projectName: 'Batch Project Onboarding',
      requirementName: `Onboarding ${onboardingId.slice(-8)}`,
      status: 'pending',
      addedAt: Date.now(),
      directPrompt: prompt,
    };

    setAnalysisTask(task);
    setShowTerminal(true);
    setAutoStartAnalysis(true);
  }, [activeWorkspaceId]);

  // Handle task completion
  const handleTaskComplete = useCallback((taskId: string, success: boolean) => {
    setAutoStartAnalysis(false);
    if (analysisTask) {
      setAnalysisTask({
        ...analysisTask,
        status: success ? 'completed' : 'failed',
        completedAt: Date.now(),
      });
    }
  }, [analysisTask]);

  // Handle task start
  const handleTaskStart = useCallback((taskId: string) => {
    if (analysisTask) {
      setAnalysisTask({
        ...analysisTask,
        status: 'running',
        startedAt: Date.now(),
      });
    }
  }, [analysisTask]);

  // Close terminal
  const handleCloseTerminal = useCallback(() => {
    setShowTerminal(false);
    // Keep task for reference but don't clear it immediately
  }, []);

  const taskQueue = analysisTask ? [analysisTask] : [];

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

      {/* Main Content with optional Terminal */}
      <div className="flex-1 overflow-hidden relative flex z-10" style={{ minHeight: 0 }}>
        {/* Architecture/Observatory View */}
        <div className={`flex-1 relative ${showTerminal ? 'border-r border-cyan-500/10' : ''}`}>
          <div className="absolute inset-0">
            {view === 'architecture' ? (
              <Suspense fallback={<LoadingFallback />}>
                <MatrixDiagramCanvas
                  workspaceId={activeWorkspaceId}
                  onProjectSelect={handleProjectSelect}
                  onAnalysisPrompt={handleAnalysisPrompt}
                  onBatchOnboarding={handleBatchOnboarding}
                />
              </Suspense>
            ) : (
              <div className="w-full h-full overflow-auto">
                <ObservatoryDashboard />
              </div>
            )}
          </div>
        </div>

        {/* Terminal Panel (slides in from right) */}
        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 480, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 h-full flex flex-col bg-zinc-900/80 backdrop-blur-md border-l border-cyan-500/10 overflow-hidden shadow-[-20px_0_60px_rgba(6,182,212,0.05)]"
            >
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/10 bg-cyan-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-sm font-medium text-zinc-200">
                    {analysisTask?.id.startsWith('batch-onboard') ? 'Batch Onboarding' : 'Architecture Analysis'}
                  </span>
                  {analysisTask?.status === 'running' && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      Running
                    </span>
                  )}
                  {analysisTask?.status === 'completed' && (
                    <span className="px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                      Complete
                    </span>
                  )}
                  {analysisTask?.status === 'failed' && (
                    <span className="px-2.5 py-1 text-xs bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                      Failed
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCloseTerminal}
                  className="p-1.5 hover:bg-zinc-800/80 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
                </button>
              </div>

              {/* Terminal Content */}
              <div className="flex-1 overflow-hidden">
                <CompactTerminal
                  instanceId="architecture-analysis"
                  projectPath={getProjectPathForTerminal()}
                  taskQueue={taskQueue}
                  onTaskStart={handleTaskStart}
                  onTaskComplete={handleTaskComplete}
                  autoStart={autoStartAnalysis}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Bar - only show in architecture view */}
      {view === 'architecture' && (
        <div className="relative z-10">
          <ArchitectureBottomBar
            workspaceId={activeWorkspaceId}
            projects={workspaceProjects}
            onAnalysisPrompt={handleAnalysisPrompt}
          />
        </div>
      )}
    </div>
  );
}
