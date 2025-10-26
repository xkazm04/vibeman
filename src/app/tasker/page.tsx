'use client';
import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import TaskRunnerHeader from '@/app/features/TaskRunner/TaskRunnerHeader';
import RequirementCard from '@/app/features/TaskRunner/RequirementCard';
import { loadRequirements, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import type { ProjectRequirement, TaskRunnerActions } from '@/app/features/TaskRunner/lib/types';
import LazyContentSection from '@/components/Navigation/LazyContentSection';



export default function TaskRunnerPage() {
  const { projects, initializeProjects } = useProjectConfigStore();
  const [requirements, setRequirements] = useState<ProjectRequirement[]>([]);
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [error, setError] = useState<string | undefined>();

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

  // Load requirements from all projects
  useEffect(() => {
    const loadAllRequirements = async () => {
      setIsLoading(true);
      const allRequirements: ProjectRequirement[] = [];

      for (const project of projects) {
        try {
          const reqNames = await loadRequirements(project.path);
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
              status: 'idle',
            });
          });
        } catch (error) {
          console.error(`Failed to load requirements for ${project.name}:`, error);
        }
      }

      setRequirements(allRequirements);
      setIsLoading(false);
    };

    if (projects.length > 0) {
      loadAllRequirements();
    }
  }, [projects]);



  const getRequirementId = (req: ProjectRequirement) =>
    `${req.projectId}:${req.requirementName}`;

  const toggleSelection = (reqId: string) => {
    const req = requirements.find((r) => getRequirementId(r) === reqId);
    if (!req || req.status === 'running' || req.status === 'queued') return;

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
    } catch (error) {
      console.error('Failed to delete requirement:', error);
    }
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

        {/* Requirements Grid */}
        <LazyContentSection delay={0.2}>
          {requirements.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">
                No requirements found. Create requirements in your projects&apos; .claude/commands directory.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              <AnimatePresence>
                {requirements.map((req) => {
                  const reqId = getRequirementId(req);
                  return (
                    <RequirementCard
                      key={reqId}
                      projectName={req.projectName}
                      projectPath={req.projectPath}
                      requirementName={req.requirementName}
                      status={req.status}
                      isSelected={selectedRequirements.has(reqId)}
                      onToggleSelect={() => toggleSelection(reqId)}
                      onDelete={() => handleDelete(reqId)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </LazyContentSection>
      </div>
    </div>
  );
}
