'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ClaudeRequirement from './sub_ClaudeRequirement/ClaudeRequirement';
import ClaudeActionStructureScan from './components/ClaudeActionStructureScan';
import ClaudeActionContextScan from './components/ClaudeActionContextScan';
import ClaudeActionAutoGenerate from './components/ClaudeActionAutoGenerate';
import ClaudeActionBuildFixer from './components/ClaudeActionBuildFixer';
import {
  Requirement,
  loadRequirements as apiLoadRequirements,
  hasContextScanRequirement,
} from './lib/requirementApi';

interface ClaudeRequirementsListProps {
  projectPath: string;
  refreshTrigger: number;
}

const ITEMS_PER_PAGE = 20;

export default function ClaudeRequirementsList({
  projectPath,
  refreshTrigger,
}: ClaudeRequirementsListProps) {
  const { activeProject } = useActiveProjectStore();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [hasContextScan, setHasContextScan] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const executionQueueRef = useRef<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRequirements();
    checkContextScanExists();
    setDisplayedCount(ITEMS_PER_PAGE); // Reset displayed count when project changes
  }, [projectPath, refreshTrigger]);

  // Auto-process queue - requirements state changes trigger queue processing in child components
  // This effect just forces a re-render when queue should be processed
  useEffect(() => {
    const runningReq = requirements.find((r) => r.status === 'running');
    if (!runningReq && executionQueueRef.current.length > 0) {
      // Queue will be processed by ClaudeRequirementRun component
      console.log(`[Queue] Ready to auto-process queue (${executionQueueRef.current.length} items)`);
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

  // Handler for status updates from child components
  const handleStatusUpdate = (name: string, updates: Partial<Requirement>) => {
    setRequirements((prev) =>
      prev.map((r) => (r.name === name ? { ...r, ...updates } : r))
    );

    // If session limit reached, clear queue
    if (updates.status === 'session-limit') {
      console.log('[Queue] Session limit reached, clearing queue');
      setRequirements((prev) =>
        prev.map((r) => (r.status === 'queued' ? { ...r, status: 'idle' as const } : r))
      );
      executionQueueRef.current = [];
    }
  };

  // Handler for successful deletion
  const handleDeleteSuccess = (name: string) => {
    setRequirements((prev) => prev.filter((r) => r.name !== name));
  };

  // Handler to trigger queue processing
  const handleQueueUpdate = () => {
    // Force re-render to trigger queue processing
    setRequirements((prev) => [...prev]);
  };

  const handleBatchCode = (requirementNames: string[]) => {
    console.log(`[BatchCode] 📋 Starting batch code for ${requirementNames.length} requirements`);

    // Queue all requirements
    requirementNames.forEach((name) => {
      if (!executionQueueRef.current.includes(name)) {
        executionQueueRef.current.push(name);
      }
    });

    console.log(`[BatchCode] Queue now has ${executionQueueRef.current.length} items`);

    // Update all as queued
    setRequirements((prev) =>
      prev.map((r) =>
        requirementNames.includes(r.name) && r.status !== 'running'
          ? { ...r, status: 'queued' as const }
          : r
      )
    );

    // Trigger queue processing via handleQueueUpdate
    setTimeout(() => {
      handleQueueUpdate();
    }, 100);
  };

  const handleToggleExpand = (name: string) => {
    setExpandedReq(expandedReq === name ? null : name);
  };

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrolledToBottom =
      container.scrollHeight - container.scrollTop <= container.clientHeight + 100;

    if (scrolledToBottom && displayedCount < requirements.length) {
      setDisplayedCount((prev) => Math.min(prev + ITEMS_PER_PAGE, requirements.length));
    }
  };

  const isAnyRunning = requirements.some((r) => r.status === 'running');
  const queueCount = executionQueueRef.current.length;
  const displayedRequirements = requirements.slice(0, displayedCount);
  const hasMore = displayedCount < requirements.length;

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
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-sm text-amber-400">
                {queueCount} in queue
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 relative">
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

            {/* Build Fixer Button - Always visible */}
            <ClaudeActionBuildFixer
              projectPath={projectPath}
              projectId={activeProject?.id || ''}
              disabled={!activeProject}
              onScanComplete={loadRequirements}
            />

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
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="space-y-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
        >
          {displayedRequirements.map((req) => (
            <ClaudeRequirement
              key={req.name}
              requirement={req}
              projectPath={projectPath}
              projectId={activeProject?.id || ''}
              isAnyRunning={isAnyRunning}
              isExpanded={expandedReq === req.name}
              executionQueueRef={executionQueueRef}
              onStatusUpdate={handleStatusUpdate}
              onDeleteSuccess={handleDeleteSuccess}
              onToggleExpand={handleToggleExpand}
              onQueueUpdate={handleQueueUpdate}
            />
          ))}
          {hasMore && (
            <div className="text-center py-3 text-gray-500 text-sm">
              Showing {displayedCount} of {requirements.length} requirements
            </div>
          )}
        </div>
      )}
    </div>
  );
}
