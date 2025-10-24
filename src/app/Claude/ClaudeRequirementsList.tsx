'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import ClaudeRequirement from './ClaudeRequirement';
import ClaudeRequirementDetailModal from './ClaudeRequirementDetailModal';
import ClaudeActionStructureScan from './components/ClaudeActionStructureScan';
import ClaudeActionContextScan from './components/ClaudeActionContextScan';
import ClaudeActionAutoGenerate from './components/ClaudeActionAutoGenerate';
import ClaudeActionBatchCode from './components/ClaudeActionBatchCode';
import {
  Requirement,
  loadRequirements as apiLoadRequirements,
  executeRequirementAsync,
  getTaskStatus,
  deleteRequirement as apiDeleteRequirement,
  hasContextScanRequirement,
} from './lib/requirementApi';

interface ClaudeRequirementsListProps {
  projectPath: string;
  refreshTrigger: number;
}

export default function ClaudeRequirementsList({
  projectPath,
  refreshTrigger,
}: ClaudeRequirementsListProps) {
  const { activeProject } = useActiveProjectStore();
  const { showShellModal } = useGlobalModal();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [hasContextScan, setHasContextScan] = useState(false);
  const executionQueueRef = useRef<string[]>([]);

  useEffect(() => {
    loadRequirements();
    checkContextScanExists();
  }, [projectPath, refreshTrigger]);

  // Auto-process queue
  useEffect(() => {
    const runningReq = requirements.find((r) => r.status === 'running');
    if (!runningReq && executionQueueRef.current.length > 0) {
      const nextReqName = executionQueueRef.current[0];
      executeRequirement(nextReqName);
    }
  }, [requirements]);

  const loadRequirements = async () => {
    setIsLoading(true);
    try {
      const requirementNames = await apiLoadRequirements(projectPath);
      // Filter out system requirement files (scan-contexts, structure-rules only)
      // Keep refactor-structure files as they are user-actionable
      const filteredNames = requirementNames.filter(
        (name) =>
          name !== 'scan-contexts' &&
          name !== 'structure-rules'
      );
      const reqs = filteredNames.map((name) => ({
        name,
        status: 'idle' as const,
      }));
      setRequirements(reqs);
    } catch (err) {
      console.error('Error loading requirements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkContextScanExists = async () => {
    try {
      const exists = await hasContextScanRequirement(projectPath);
      setHasContextScan(exists);
    } catch (err) {
      console.error('Error checking context scan requirement:', err);
      setHasContextScan(false);
    }
  };

  const executeRequirement = async (name: string) => {
    // Update status to running
    setRequirements((prev) =>
      prev.map((r) =>
        r.name === name
          ? {
              ...r,
              status: 'running' as const,
              startTime: new Date(),
              output: undefined,
              error: undefined,
            }
          : r
      )
    );

    // Remove from queue
    executionQueueRef.current = executionQueueRef.current.filter((n) => n !== name);

    try {
      // Use async execution (non-blocking)
      const { taskId } = await executeRequirementAsync(projectPath, name, activeProject?.id);

      // Store task ID
      setRequirements((prev) =>
        prev.map((r) => (r.name === name ? { ...r, taskId } : r))
      );

      // Poll for task status
      let pollCount = 0;
      const maxPolls = 600; // 10 minutes max (300 * 2 seconds)

      const pollInterval = setInterval(async () => {
        pollCount++;

        // Timeout safeguard
        if (pollCount >= maxPolls) {
          console.error('Task polling timeout - marking as failed');
          clearInterval(pollInterval);
          setRequirements((prev) =>
            prev.map((r) =>
              r.name === name
                ? {
                    ...r,
                    status: 'failed' as const,
                    error: 'Execution timeout - task did not complete within 10 minutes',
                  }
                : r
            )
          );
          return;
        }

        try {
          const task = await getTaskStatus(taskId);

          setRequirements((prev) =>
            prev.map((r) => {
              if (r.name === name) {
                return {
                  ...r,
                  status: task.status,
                  output: task.output,
                  error: task.error,
                  logFilePath: task.logFilePath,
                  sessionLimitReached: task.sessionLimitReached,
                };
              }
              return r;
            })
          );

          // Stop polling if completed
          if (
            task.status === 'completed' ||
            task.status === 'failed' ||
            task.status === 'session-limit'
          ) {
            clearInterval(pollInterval);

            // If session limit, cancel queue
            if (task.status === 'session-limit') {
              setRequirements((prev) =>
                prev.map((r) => (r.status === 'queued' ? { ...r, status: 'idle' as const } : r))
              );
              executionQueueRef.current = [];
            }
          }
        } catch (pollErr) {
          console.error('Error polling task status:', pollErr);
          // Don't stop polling on error, retry
        }
      }, 2000); // Poll every 2 seconds
    } catch (err: any) {
      // Failed to queue task
      setRequirements((prev) =>
        prev.map((r) =>
          r.name === name
            ? {
                ...r,
                status: 'failed' as const,
                error: err instanceof Error ? err.message : 'Failed to queue execution',
              }
            : r
        )
      );
    }
  };

  const handleRun = (name: string) => {
    const runningReq = requirements.find((r) => r.status === 'running');

    if (runningReq) {
      // Add to queue
      if (!executionQueueRef.current.includes(name)) {
        executionQueueRef.current.push(name);
        setRequirements((prev) =>
          prev.map((r) => (r.name === name ? { ...r, status: 'queued' as const } : r))
        );
      }
    } else {
      // Execute immediately
      executeRequirement(name);
    }
  };

  const handleDelete = async (name: string) => {
    const req = requirements.find((r) => r.name === name);
    if (req?.status === 'queued') {
      return; // Cannot delete queued items
    }

    try {
      const success = await apiDeleteRequirement(projectPath, name);
      if (success) {
        setRequirements((prev) => prev.filter((r) => r.name !== name));
      }
    } catch (err) {
      console.error('Error deleting requirement:', err);
    }
  };

  const handleBatchCode = (requirementNames: string[]) => {
    console.log(`[BatchCode] 📋 Queueing ${requirementNames.length} requirements`);

    // Queue all requirements
    requirementNames.forEach((name) => {
      if (!executionQueueRef.current.includes(name)) {
        executionQueueRef.current.push(name);
      }
    });

    // Update all as queued
    setRequirements((prev) =>
      prev.map((r) =>
        requirementNames.includes(r.name) && r.status !== 'running'
          ? { ...r, status: 'queued' as const }
          : r
      )
    );

    // If nothing is running, start the first one
    const runningReq = requirements.find((r) => r.status === 'running');
    if (!runningReq && executionQueueRef.current.length > 0) {
      const nextReqName = executionQueueRef.current[0];
      executeRequirement(nextReqName);
    }
  };

  const handleViewDetail = (name: string) => {
    showShellModal(
      {
        title: 'Requirement Details',
        subtitle: 'View Claude Code requirement specification',
        icon: FileText,
        iconBgColor: 'from-purple-600/20 to-pink-600/20',
        iconColor: 'text-purple-400',
        maxWidth: 'max-w-4xl',
        maxHeight: 'max-h-[85vh]',
      },
      {
        content: { enabled: true },
        customContent: (
          <ClaudeRequirementDetailModal projectPath={projectPath} requirementName={name} />
        ),
        isTopMost: true,
      }
    );
  };

  const handleToggleExpand = (name: string) => {
    setExpandedReq(expandedReq === name ? null : name);
  };

  const isAnyRunning = requirements.some((r) => r.status === 'running');
  const queueCount = executionQueueRef.current.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Generate Buttons */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-400">
              Requirements ({requirements.length})
            </h3>
            {queueCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400">
                {queueCount} in queue
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 relative">
            {/* Batch Code Button - NEW */}
            <ClaudeActionBatchCode
              requirements={requirements}
              disabled={!activeProject}
              onBatchStart={handleBatchCode}
            />

            {/* Structure Scan Button - Always visible for nextjs/fastapi projects */}
            {activeProject?.type && (
              <ClaudeActionStructureScan
                projectPath={projectPath}
                projectType={activeProject.type}
                projectId={activeProject.id}
                disabled={!activeProject}
                onScanComplete={loadRequirements}
              />
            )}

            {/* Context Scan Button - Only show if scan-contexts.md exists */}
            <ClaudeActionContextScan
              projectPath={projectPath}
              projectId={activeProject?.id || ''}
              disabled={!activeProject}
              visible={hasContextScan}
            />

            {/* Auto-Generate Button */}
            <ClaudeActionAutoGenerate
              projectPath={projectPath}
              projectId={activeProject?.id || ''}
              disabled={!activeProject}
              onGenerateComplete={loadRequirements}
            />
          </div>
        </div>
      </div>

      {/* Requirements List */}
      {requirements.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No requirements yet. Add one above or use Auto-Generate.
        </div>
      ) : (
        <div className="space-y-2">
          {requirements.map((req) => (
            <ClaudeRequirement
              key={req.name}
              requirement={req}
              isAnyRunning={isAnyRunning}
              isExpanded={expandedReq === req.name}
              onRun={handleRun}
              onDelete={handleDelete}
              onToggleExpand={handleToggleExpand}
              onViewDetail={handleViewDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}
