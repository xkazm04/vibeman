'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, FileText } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import ClaudeRequirement from './ClaudeRequirement';
import ClaudeRequirementDetailModal from './ClaudeRequirementDetailModal';
import {
  Requirement,
  loadRequirements as apiLoadRequirements,
  executeRequirement as apiExecuteRequirement,
  deleteRequirement as apiDeleteRequirement,
  generateRequirements as apiGenerateRequirements,
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
  const executionQueueRef = useRef<string[]>([]);

  useEffect(() => {
    loadRequirements();
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
      const reqs = requirementNames.map((name) => ({
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
      const data = await apiExecuteRequirement(projectPath, name, activeProject?.id);

      // Update to completed
      setRequirements((prev) =>
        prev.map((r) =>
          r.name === name ? { ...r, status: 'completed' as const, output: data.output } : r
        )
      );
    } catch (err: any) {
      // Check if it's a session limit error
      const isSessionLimit = err.sessionLimitReached === true;

      if (isSessionLimit) {
        // Session limit reached - cancel entire queue
        setRequirements((prev) =>
          prev.map((r) => {
            if (r.name === name) {
              // Mark current requirement as session-limit
              return {
                ...r,
                status: 'session-limit' as const,
                error: err.message,
                sessionLimitReached: true,
              };
            } else if (r.status === 'queued') {
              // Cancel queued requirements
              return { ...r, status: 'idle' as const };
            }
            return r;
          })
        );

        // Clear the queue
        executionQueueRef.current = [];
      } else {
        // Regular execution error
        setRequirements((prev) =>
          prev.map((r) =>
            r.name === name
              ? {
                  ...r,
                  status: 'failed' as const,
                  error: err instanceof Error ? err.message : 'Execution failed',
                }
              : r
          )
        );
      }
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
      {/* Header with Generate Button */}
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
