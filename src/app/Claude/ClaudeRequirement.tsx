'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Trash2, Loader2, ListPlus } from 'lucide-react';
import { Requirement } from './lib/requirementApi';
import {
  getStatusIcon,
  getStatusColor,
  getStatusIconColor,
  getRunButtonText,
  getRunButtonTitle,
  canDeleteRequirement,
  getDeleteButtonTitle,
} from './lib/requirementUtils';

interface ClaudeRequirementProps {
  requirement: Requirement;
  isAnyRunning: boolean;
  isExpanded: boolean;
  onRun: (name: string) => void;
  onDelete: (name: string) => void;
  onToggleExpand: (name: string) => void;
  onViewDetail: (name: string) => void;
}

export default function ClaudeRequirement({
  requirement,
  isAnyRunning,
  isExpanded,
  onRun,
  onDelete,
  onToggleExpand,
  onViewDetail,
}: ClaudeRequirementProps) {
  const StatusIconComponent = getStatusIcon(requirement.status);
  const statusColor = getStatusColor(requirement.status);
  const iconColor = getStatusIconColor(requirement.status);
  const runButtonText = getRunButtonText(requirement.status, isAnyRunning);
  const runButtonTitle = getRunButtonTitle(requirement.status, isAnyRunning);
  const canDelete = canDeleteRequirement(requirement.status);
  const deleteButtonTitle = getDeleteButtonTitle(requirement.status);

  const isRunning = requirement.status === 'running';
  const isQueued = requirement.status === 'queued';
  const isDisabled = isRunning || isQueued;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg border transition-all ${statusColor}`}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status Icon */}
        <div className="flex-shrink-0">
          <StatusIconComponent className={`w-4 h-4 ${iconColor} ${isRunning ? 'animate-spin' : ''}`} />
        </div>

        {/* Requirement Name */}
        <div
          className="flex-1 min-w-0 cursor-pointer hover:text-blue-400 transition-colors"
          onClick={() => onViewDetail(requirement.name)}
        >
          <p className="text-sm font-mono text-gray-300 truncate">/{requirement.name}</p>
          {requirement.startTime && (
            <p className="text-xs text-gray-500 mt-0.5">
              {requirement.startTime.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Run/Queue Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onRun(requirement.name)}
            disabled={isDisabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isDisabled
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
            }`}
            title={runButtonTitle}
          >
            {isRunning ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isQueued ? (
              <ListPlus className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            <span>{runButtonText}</span>
          </motion.button>

          {/* Delete Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(requirement.name)}
            disabled={!canDelete}
            className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={deleteButtonTitle}
          >
            <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
          </motion.button>

          {/* Expand/Collapse Button */}
          {(requirement.output || requirement.error) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleExpand(requirement.name)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
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
                <p className="text-xs text-gray-500 font-semibold">Output:</p>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-gray-900/50 p-3 rounded border border-gray-700/30 max-h-48 overflow-y-auto">
                  {requirement.output}
                </pre>
              </div>
            )}
            {requirement.error && (
              <div className="space-y-1">
                <p className="text-xs text-red-400 font-semibold">Error:</p>
                <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono bg-red-900/20 p-3 rounded border border-red-700/30 max-h-48 overflow-y-auto">
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
