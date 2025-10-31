'use client';
import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
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

export default function ClaudeRequirementsList({
  projectPath,
  refreshTrigger,
}: ClaudeRequirementsListProps) {
  const { activeProject } = useActiveProjectStore();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasContextScan, setHasContextScan] = useState(false);
  const executionQueueRef = useRef<string[]>([]);


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
    </div>
  );
}
