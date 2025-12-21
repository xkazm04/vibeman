'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useContextStore } from '@/stores/contextStore';
import { ScanType } from '../lib/scanTypes';
import { executeClaudeIdeasWithContexts } from './lib/claudeIdeasExecutor';

// Component imports
import ClaudeIdeasButton from './components/ClaudeIdeasButton';
import ScanTypeSelector from './ScanTypeSelector';

interface ScanInitiatorProps {
  onScanComplete: () => void;
  selectedScanTypes: ScanType[];
  onScanTypesChange?: (types: ScanType[]) => void;
  selectedContextIds: string[];
  onBatchScan?: () => void;
}

export default function ScanInitiator({
  onScanComplete,
  selectedScanTypes,
  onScanTypesChange,
  selectedContextIds: propSelectedContextIds,
}: ScanInitiatorProps) {
  const [message, setMessage] = React.useState<string>('');

  // Generated Ideas state
  const [isProcessing, setIsProcessing] = React.useState(false);

  const { activeProject } = useActiveProjectStore();
  const { selectedContextIds, contexts, loadProjectData } = useContextStore();

  // Load contexts for active project when it changes
  React.useEffect(() => {
    if (activeProject?.id) {
      loadProjectData(activeProject.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  // Use prop selected context IDs, or fall back to store's selected context IDs
  const currentSelectedContextIds = propSelectedContextIds.length > 0
    ? propSelectedContextIds
    : (selectedContextIds.size > 0 ? Array.from(selectedContextIds) : []);

  // Generated Ideas: Create requirement files directly
  const handleGeneratedIdeasClick = async () => {
    console.log('[ScanInitiator] handleGeneratedIdeasClick called');
    console.log('[ScanInitiator] activeProject:', activeProject);
    console.log('[ScanInitiator] selectedScanTypes:', selectedScanTypes);
    console.log('[ScanInitiator] currentSelectedContextIds:', currentSelectedContextIds);

    if (!activeProject) {
      setMessage('No active project selected');
      console.error('[ScanInitiator] ERROR: No active project');
      return;
    }

    if (!activeProject.path) {
      setMessage('Project path is not defined');
      console.error('[ScanInitiator] ERROR: Project has no path:', activeProject);
      return;
    }

    setIsProcessing(true);
    setMessage('Creating Claude Code requirement files...');

    try {
      // Calculate expected file count for user feedback
      const contextCount = currentSelectedContextIds.length > 0 ? currentSelectedContextIds.length : 1;
      const expectedFiles = selectedScanTypes.length * contextCount;

      console.log('[ScanInitiator] Calling executeClaudeIdeasWithContexts with config:', {
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        scanTypes: selectedScanTypes,
        contextIds: currentSelectedContextIds,
      });

      const result = await executeClaudeIdeasWithContexts({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        scanTypes: selectedScanTypes,
        contextIds: currentSelectedContextIds,
      });

      console.log('[ScanInitiator] executeClaudeIdeasWithContexts result:', result);

      if (result.success) {
        setMessage(`${result.filesCreated}/${expectedFiles} requirement files created! Use TaskRunner to execute them.`);
        onScanComplete();

        // Clear message after delay
        setTimeout(() => {
          setMessage('');
        }, 8000);
      } else {
        setMessage(`Partial success: ${result.filesCreated} files created. Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ScanInitiator] executeClaudeIdeasWithContexts EXCEPTION:', error);
      setMessage(`Failed to create requirement files: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Controls Row */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/40 space-y-4">
        {/* Status message */}
        {message && (
          <motion.div
            className="text-sm text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {message}
          </motion.div>
        )}

        {/* Scan Type Selector */}
        {onScanTypesChange && (
          <ScanTypeSelector
            selectedTypes={selectedScanTypes}
            onChange={onScanTypesChange}
          />
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-700/20">
          {/* Generated Ideas Button */}
          {activeProject && (
            <ClaudeIdeasButton
              onClick={handleGeneratedIdeasClick}
              disabled={isProcessing || !activeProject}
              isProcessing={isProcessing}
              scanTypesCount={selectedScanTypes.length}
              contextsCount={currentSelectedContextIds.length}
            />
          )}
        </div>
      </div>
    </div>
  );
}
