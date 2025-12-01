/**
 * Implementation Log Detail Modal Component
 * Displays detailed view of an implementation log
 */

'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { EnrichedImplementationLog } from '../lib/types';
import UserInputPanel from './UserInputPanel';
import ImplementationProposalBridge from './ImplementationProposalBridge';
import { ScreenshotPreview, ProjectContextTags, BulletsList } from './LogPreview';

interface ImplementationLogDetailProps {
  log: EnrichedImplementationLog;
  onClose: () => void;
  onAccept: () => void;
  onRequirementCreated: (requirementName: string, content?: string) => void;
  onTriggerClaudeCode?: (requirementName: string, content: string) => void;
  projectPath?: string;
}

export default function ImplementationLogDetail({
  log,
  onClose,
  onAccept,
  onRequirementCreated,
  onTriggerClaudeCode,
  projectPath,
}: ImplementationLogDetailProps) {
  /**
   * Handle proposal acceptance - creates a new requirement
   * Requirements: 2.3
   */
  const handleProposalAccepted = useCallback(
    (proposalId: string, requirementName: string, content: string) => {
      onRequirementCreated(requirementName, content);
    },
    [onRequirementCreated]
  );

  /**
   * Handle proposal acceptance with code - triggers Claude Code pipeline
   * Requirements: 2.4
   */
  const handleProposalAcceptedWithCode = useCallback(
    (proposalId: string, requirementName: string, content: string) => {
      if (onTriggerClaudeCode) {
        onTriggerClaudeCode(requirementName, content);
      } else {
        // Fallback to regular requirement creation
        onRequirementCreated(requirementName, content);
      }
    },
    [onTriggerClaudeCode, onRequirementCreated]
  );

  /**
   * Handle proposal decline - records the decline action
   * Requirements: 2.5
   */
  const handleProposalDeclined = useCallback((proposalId: string) => {
    // Log decline for analytics (could be extended to persist)
    console.log('[ImplementationLogDetail] Proposal declined:', proposalId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
    >
      <motion.div
        layoutId={`card-${log.id}`}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl max-h-[90vh] flex flex-col md:flex-row rounded-2xl bg-gray-900 border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          data-testid="modal-close"
          className="absolute top-6 right-6 z-20 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Left Half - Large Screenshot or Placeholder */}
        <div className="w-full md:w-1/2 h-64 md:h-full relative bg-gradient-to-br from-gray-800 to-gray-900 flex-shrink-0">
          <ScreenshotPreview
            screenshot={log.screenshot}
            title={log.title}
            variant="detail"
            logId={log.id}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:bg-gradient-to-r" />

          <div className="absolute bottom-6 left-6 right-6">
            {/* Project & Context Tags */}
            <div className="mb-3">
              <ProjectContextTags
                projectName={log.project_name}
                contextName={log.context_name}
                variant="detail"
              />
            </div>
            <motion.h2
              layoutId={`card-title-${log.id}`}
              className="text-3xl md:text-4xl font-bold text-white mb-2"
            >
              {log.title}
            </motion.h2>
            <p className="text-gray-400 text-sm font-mono">{log.requirement_name}</p>
          </div>
        </div>

        {/* Right Half - Details */}
        <div className="w-full md:w-1/2 flex flex-col overflow-hidden">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Key Changes from Bullets */}
            <BulletsList
              bullets={log.overview_bullets}
              variant="detail"
            />

            {/* Overview */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Overview</h3>
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
                <p className="text-sm text-gray-400 leading-relaxed">
                  {log.overview}
                </p>
              </div>
            </div>

            {/* Improvement Proposals - Requirements: 2.1 */}
            <ImplementationProposalBridge
              implementationLog={log}
              projectPath={projectPath}
              onProposalAccepted={handleProposalAccepted}
              onProposalAcceptedWithCode={onTriggerClaudeCode ? handleProposalAcceptedWithCode : undefined}
              onProposalDeclined={handleProposalDeclined}
            />

            {/* Implementation Details */}
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Created</div>
                  <div className="text-gray-300 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Status</div>
                  <div className="text-cyan-400">Needs Review</div>
                </div>
              </div>
            </div>
          </div>

          {/* User Input Panel - Sticky at Bottom */}
          <UserInputPanel
            log={log}
            onAccept={onAccept}
            onRequirementCreated={onRequirementCreated}
            projectPath={projectPath}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
