'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Requirement } from '../lib/requirementApi';
import { useGlobalModal } from '@/hooks/useGlobalModal';
import ClaudeLogViewer from '../ClaudeLogViewer';
import ClaudeRequirementRun from './ClaudeRequirementRun';
import ClaudeRequirementDelete from './ClaudeRequirementDelete';
import ClaudeRequirementDetail from './ClaudeRequirementDetail';
import {
  getStatusIcon,
  getStatusColor,
  getStatusIconColor,
} from '../lib/requirementUtils';

interface ClaudeRequirementProps {
  requirement: Requirement;
  projectPath: string;
  projectId: string;
  isAnyRunning: boolean;
  isExpanded: boolean;
  executionQueueRef: React.MutableRefObject<string[]>;
  onStatusUpdate: (name: string, updates: Partial<Requirement>) => void;
  onDeleteSuccess: (name: string) => void;
  onToggleExpand: (name: string) => void;
  onQueueUpdate: () => void;
}

export default function ClaudeRequirement({
  requirement,
  projectPath,
  projectId,
  isAnyRunning,
  isExpanded,
  executionQueueRef,
  onStatusUpdate,
  onDeleteSuccess,
  onToggleExpand,
  onQueueUpdate,
}: ClaudeRequirementProps) {
  const { showShellModal } = useGlobalModal();
  const StatusIconComponent = getStatusIcon(requirement.status);
  const statusColor = getStatusColor(requirement.status);
  const iconColor = getStatusIconColor(requirement.status);
  const isRunning = requirement.status === 'running';

  const handleViewLog = () => {
    if (!requirement.logFilePath) return;

    showShellModal(
      {
        title: 'Execution Log',
        subtitle: `${requirement.name}`,
        icon: FileText,
        iconBgColor: 'from-blue-600/20 to-cyan-600/20',
        iconColor: 'text-blue-400',
        maxWidth: 'max-w-5xl',
        maxHeight: 'max-h-[85vh]',
      },
      {
        content: { enabled: true },
        customContent: (
          <ClaudeLogViewer logFilePath={requirement.logFilePath} requirementName={requirement.name} />
        ),
        isTopMost: true,
      }
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border transition-all ${statusColor} relative overflow-hidden`}
    >
      {/* Shimmer loader overlay for running status */}
      {isRunning && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent shimmer-wave"
            style={{
              animation: 'shimmer 2s infinite linear',
            }}
          />
        </div>
      )}

      {/* Main Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status Icon */}
        <div className="flex-shrink-0">
          <StatusIconComponent className={`w-4 h-4 ${iconColor} ${isRunning ? 'animate-spin' : ''}`} />
        </div>

        {/* Requirement Name */}
        <ClaudeRequirementDetail
          requirement={requirement}
          projectPath={projectPath}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Run/Queue Button */}
          <ClaudeRequirementRun
            requirement={requirement}
            projectPath={projectPath}
            projectId={projectId}
            isAnyRunning={isAnyRunning}
            executionQueueRef={executionQueueRef}
            onStatusUpdate={onStatusUpdate}
            onQueueUpdate={onQueueUpdate}
          />

          {/* Delete Button */}
          <ClaudeRequirementDelete
            requirement={requirement}
            projectPath={projectPath}
            onDeleteSuccess={onDeleteSuccess}
          />

          {/* View Log Button */}
          {requirement.logFilePath && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleViewLog}
              className="p-1.5 hover:bg-blue-500/20 rounded-md transition-colors"
              title="View execution log"
            >
              <FileText className="w-4 h-4 text-blue-400" />
            </motion.button>
          )}

          {/* Expand/Collapse Button */}
          {(requirement.output || requirement.error) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleExpand(requirement.name)}
              className="px-2 py-1 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              {isExpanded ? '▼' : '▶'}
            </motion.button>
          )}
        </div>
      </div>

      {/* Expanded Output/Error */}
      <AnimatePresence>
        {isExpanded && (requirement.output || requirement.error) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-700/50 px-4 py-3"
          >
            {requirement.output && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-semibold">Output:</p>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-900/50 p-3 rounded border border-gray-700/30 max-h-48 overflow-y-auto">
                  {requirement.output}
                </pre>
              </div>
            )}
            {requirement.error && (
              <div className="space-y-1">
                <p className="text-sm text-red-400 font-semibold">Error:</p>
                <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono bg-red-900/20 p-3 rounded border border-red-700/30 max-h-48 overflow-y-auto">
                  {requirement.error}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
