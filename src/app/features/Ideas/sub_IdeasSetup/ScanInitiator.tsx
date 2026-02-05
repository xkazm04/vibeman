'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
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
  /** Groups selected as whole units for requirement generation */
  selectedGroupIds?: string[];
  onBatchScan?: () => void;
}

export default function ScanInitiator({
  onScanComplete,
  selectedScanTypes,
  onScanTypesChange,
  selectedContextIds: propSelectedContextIds,
  selectedGroupIds: propSelectedGroupIds = [],
}: ScanInitiatorProps) {
  const [message, setMessage] = React.useState<string>('');

  // Generated Ideas state
  const [isProcessing, setIsProcessing] = React.useState(false);

  const { activeProject } = useActiveProjectStore();

  // Use prop selected context IDs directly - context loading is handled by IdeasHeaderWithFilter
  const currentSelectedContextIds = propSelectedContextIds;
  const currentSelectedGroupIds = propSelectedGroupIds;

  // Generated Ideas: Create requirement files directly
  const handleGeneratedIdeasClick = async () => {
    console.log('[ScanInitiator] handleGeneratedIdeasClick called');
    console.log('[ScanInitiator] activeProject:', activeProject);
    console.log('[ScanInitiator] selectedScanTypes:', selectedScanTypes);
    console.log('[ScanInitiator] currentSelectedContextIds:', currentSelectedContextIds);
    console.log('[ScanInitiator] currentSelectedGroupIds:', currentSelectedGroupIds);

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
      // Count individual contexts + whole groups (each counts as 1 item per scan type)
      const contextCount = currentSelectedContextIds.length;
      const groupCount = currentSelectedGroupIds.length;
      const totalItems = contextCount + groupCount;
      const itemCount = totalItems > 0 ? totalItems : 1; // At least 1 for full project
      const expectedFiles = selectedScanTypes.length * itemCount;

      console.log('[ScanInitiator] Calling executeClaudeIdeasWithContexts with config:', {
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        scanTypes: selectedScanTypes,
        contextIds: currentSelectedContextIds,
        groupIds: currentSelectedGroupIds,
      });

      const result = await executeClaudeIdeasWithContexts({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        scanTypes: selectedScanTypes,
        contextIds: currentSelectedContextIds,
        groupIds: currentSelectedGroupIds,
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
              groupsCount={currentSelectedGroupIds.length}
            />
          )}
        </div>
      </div>
    </div>
  );
}
