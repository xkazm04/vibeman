'use client';
import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, History, ChevronDown } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import TaskRunnerHeader from '@/app/features/TaskRunner/TaskRunnerHeader';
import TaskColumn from '@/app/features/TaskRunner/TaskColumn';
import ImplementationLogList from '@/app/features/Goals/sub_ImplementationLog/ImplementationLogList';
import { loadRequirementsBatch, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import type { ProjectRequirement, TaskRunnerActions } from '@/app/features/TaskRunner/lib/types';
import { createIdleStatus } from '@/app/features/TaskRunner/lib/types';
import LazyContentSection from '@/components/Navigation/LazyContentSection';



export default function TaskRunnerPage() {
  const { projects, initializeProjects } = useProjectConfigStore();
  const [requirements, setRequirements] = useState<ProjectRequirement[]>([]);
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [showLogs, setShowLogs] = useState(false);

  // Get the vibeman project ID for showing logs
  // TODO: Make this dynamic based on selected project or current context
  const vibemanProject = projects.find(p => p.name === 'vibeman');
  const firstProjectId = vibemanProject?.id || (projects.length > 0 ? projects[0].id : undefined);

  const actions: TaskRunnerActions = {
    setRequirements,
    setSelectedRequirements,
    setIsRunning,
    setProcessedCount,
    setError,
  };

  // Initialize projects on mount
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Load requirements from all projects in a single batch request
  useEffect(() => {
    const loadAllRequirements = async () => {
      // CRITICAL: Don't reload requirements while a batch is running
      if (isRunning) {
        return;
      }

      setIsLoading(true);

      try {
        // Single batch request for all projects
        const requirementsMap = await loadRequirementsBatch(
          projects.map(p => ({ id: p.id, path: p.path }))
        );

        const allRequirements: ProjectRequirement[] = [];

        for (const project of projects) {
          const reqNames = requirementsMap[project.id] || [];
          // Filter out system requirements
          const filtered = reqNames.filter(
            (name) => name !== 'scan-contexts' && name !== 'structure-rules'
          );

          filtered.forEach((reqName) => {
            allRequirements.push({
              projectId: project.id,
              projectName: project.name,
              projectPath: project.path,
              requirementName: reqName,
              status: createIdleStatus(),
            });
          });
        }

        setRequirements(allRequirements);
      } catch (error) {
        console.error('Failed to load requirements:', error);
      }

      setIsLoading(false);
    };

    if (projects.length > 0) {
      loadAllRequirements();
    }
  }, [projects, isRunning]);

  // Group requirements by project
  const groupedRequirements = useMemo(() => {
    const grouped: Record<string, ProjectRequirement[]> = {};

    requirements.forEach((req) => {
      if (!grouped[req.projectId]) {
        grouped[req.projectId] = [];
      }
      grouped[req.projectId].push(req);
    });

    return grouped;
  }, [requirements]);

  const getRequirementId = (req: ProjectRequirement) =>
    `${req.projectId}:${req.requirementName}`;

  const toggleSelection = (reqId: string) => {
    const req = requirements.find((r) => getRequirementId(r) === reqId);
    if (!req || req.status.type === 'running' || req.status.type === 'queued') return;

    setSelectedRequirements((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reqId)) {
        newSet.delete(reqId);
      } else {
        newSet.add(reqId);
      }
      return newSet;
    });
  };

  const toggleProjectSelection = (projectId: string) => {
    const projectReqs = groupedRequirements[projectId] || [];
    const selectableReqs = projectReqs.filter(
      (req) => req.status.type !== 'running' && req.status.type !== 'queued'
    );

    // Check if all selectable requirements are selected
    const allSelected = selectableReqs.every((req) =>
      selectedRequirements.has(getRequirementId(req))
    );

    setSelectedRequirements((prev) => {
      const newSet = new Set(prev);

      if (allSelected) {
        // Deselect all
        selectableReqs.forEach((req) => {
          newSet.delete(getRequirementId(req));
        });
      } else {
        // Select all
        selectableReqs.forEach((req) => {
          newSet.add(getRequirementId(req));
        });
      }

      return newSet;
    });
  };

  const handleDelete = async (reqId: string) => {
    const req = requirements.find((r) => getRequirementId(r) === reqId);
    if (!req) return;

    try {
      const success = await deleteRequirement(req.projectPath, req.requirementName);
      if (success) {
        setRequirements((prev) => prev.filter((r) => getRequirementId(r) !== reqId));
        setSelectedRequirements((prev) => {
          const newSet = new Set(prev);
          newSet.delete(reqId);
          return newSet;
        });
      }
    } catch (error) {    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          <p className="text-gray-400">Loading requirements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-8">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <LazyContentSection delay={0}>
          <TaskRunnerHeader
            selectedCount={selectedRequirements.size}
            totalCount={requirements.length}
            processedCount={processedCount}
            isRunning={isRunning}
            error={error}
            requirements={requirements}
            selectedRequirements={selectedRequirements}
            actions={actions}
            getRequirementId={getRequirementId}
          />
        </LazyContentSection>

        {/* Requirements Grid - Column Layout */}
        <LazyContentSection delay={0.2}>
          {requirements.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                No requirements found. Create requirements in your projects&apos; .claude/commands directory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {Object.entries(groupedRequirements).map(([projectId, projectReqs]) => {
                  const projectName = projectReqs[0]?.projectName || 'Unknown Project';
                  const projectPath = projectReqs[0]?.projectPath || '';
                  return (
                    <TaskColumn
                      key={projectId}
                      projectId={projectId}
                      projectName={projectName}
                      projectPath={projectPath}
                      requirements={projectReqs}
                      selectedRequirements={selectedRequirements}
                      onToggleSelect={toggleSelection}
                      onDelete={handleDelete}
                      onToggleProjectSelection={toggleProjectSelection}
                      getRequirementId={getRequirementId}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </LazyContentSection>

        {/* Implementation Logs Section */}
        {firstProjectId && (
          <LazyContentSection delay={0.4}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              {/* Ambient Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-cyan-900/10 rounded-lg blur-xl" />

              <div className="relative bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-lg overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-lg">
                      <History className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-semibold text-white">
                        Implementation Logs
                      </h2>
                      <p className="text-sm text-gray-500">
                        Recent automated implementations by Claude Code
                      </p>
                    </div>
                  </div>

                  <motion.div
                    animate={{ rotate: showLogs ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </motion.div>
                </button>

                {/* Logs Content */}
                <AnimatePresence>
                  {showLogs && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-800/50 overflow-hidden"
                    >
                      <div className="p-6">
                        <ImplementationLogList projectId={firstProjectId} limit={5} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </LazyContentSection>
        )}
      </div>
    </div>
  );
}
