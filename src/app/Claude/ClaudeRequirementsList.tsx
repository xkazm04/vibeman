'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, FileText, Scan } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import ClaudeRequirement from './ClaudeRequirement';
import ClaudeRequirementDetailModal from './ClaudeRequirementDetailModal';
import {
  Requirement,
  loadRequirements as apiLoadRequirements,
  executeRequirementAsync,
  getTaskStatus,
  deleteRequirement as apiDeleteRequirement,
  generateRequirements as apiGenerateRequirements,
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasContextScan, setHasContextScan] = useState(false);
  const [isContextScanning, setIsContextScanning] = useState(false);
  const [contextScanTaskId, setContextScanTaskId] = useState<string | null>(null);
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
      // Filter out scan-contexts from the list
      const filteredNames = requirementNames.filter((name) => name !== 'scan-contexts');
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
      const maxPolls = 300; // 10 minutes max (300 * 2 seconds)

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

  const handleGenerateRequirements = async () => {
    if (!activeProject) return;

    setIsGenerating(true);
    try {
      await apiGenerateRequirements(projectPath, activeProject.id);
      // Auto-refresh without alert
      await loadRequirements();
    } catch (err) {
      console.error('Error generating requirements:', err instanceof Error ? err.message : 'Failed to generate requirements');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContextScan = async () => {
    if (!activeProject || isContextScanning) return;

    setIsContextScanning(true);
    try {
      // Execute the scan-contexts requirement
      const { taskId } = await executeRequirementAsync(projectPath, 'scan-contexts', activeProject.id);
      setContextScanTaskId(taskId);

      // Poll for task status
      let pollCount = 0;
      const maxPolls = 300; // 10 minutes max

      const pollInterval = setInterval(async () => {
        pollCount++;

        if (pollCount >= maxPolls) {
          console.error('Context scan timeout');
          clearInterval(pollInterval);
          setIsContextScanning(false);
          setContextScanTaskId(null);
          return;
        }

        try {
          const task = await getTaskStatus(taskId);

          // Stop polling if completed
          if (task.status === 'completed' || task.status === 'failed' || task.status === 'session-limit') {
            clearInterval(pollInterval);
            setIsContextScanning(false);
            setContextScanTaskId(null);

            if (task.status === 'completed') {
              console.log('Context scan completed successfully');
              // Could show a success notification here
            } else if (task.status === 'failed') {
              console.error('Context scan failed:', task.error);
            }
          }
        } catch (pollErr) {
          console.error('Error polling context scan status:', pollErr);
        }
      }, 2000); // Poll every 2 seconds
    } catch (err) {
      console.error('Error starting context scan:', err instanceof Error ? err.message : 'Failed to start scan');
      setIsContextScanning(false);
      setContextScanTaskId(null);
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
        <div className="flex items-center gap-2">
          {/* Context Scan Button - Only show if scan-contexts.md exists */}
          {hasContextScan && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleContextScan}
              disabled={isContextScanning || !activeProject}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isContextScanning || !activeProject
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-lg'
              }`}
              title="Scan codebase and generate/update contexts"
            >
              {isContextScanning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Scan className="w-3 h-3" />
                  <span>Context Scan</span>
                </>
              )}
            </motion.button>
          )}

          {/* Auto-Generate Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleGenerateRequirements}
            disabled={isGenerating || !activeProject}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isGenerating || !activeProject
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg'
            }`}
            title="Generate requirements from goals and contexts"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                <span>Auto-Generate</span>
              </>
            )}
          </motion.button>
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
