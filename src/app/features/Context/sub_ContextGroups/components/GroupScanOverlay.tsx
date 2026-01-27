/**
 * GroupScanOverlay
 *
 * Full-screen overlay that appears over a context group during refactor scan.
 * Shows terminal output, scan visualization, and status indicators.
 * Auto-closes after scan completion (after user clicks Done).
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, GitCommit } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useGroupHealthStore } from '@/stores/groupHealthStore';
import { ScanVisualization } from '@/components/ui/ScanVisualization';
import type { HealthScanSummary } from '@/app/db/models/group-health.types';

interface GroupScanOverlayProps {
  groupId: string;
  groupName: string;
  color: string;
  onClose: () => void;
}

export const GroupScanOverlay: React.FC<GroupScanOverlayProps> = ({
  groupId,
  groupName,
  color,
  onClose,
}) => {
  const { getActiveScan, clearScan } = useGroupHealthStore();
  const activeScan = getActiveScan(groupId);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeScan?.messages]);

  // Handle close
  const handleClose = () => {
    clearScan(groupId);
    onClose();
  };

  // If no active scan, don't render
  if (!activeScan) {
    return null;
  }

  const { status, progress, messages, summary, error } = activeScan;
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isRunning = status === 'running' || status === 'pending';

  // Render issue summary
  const renderIssueSummary = (summary: HealthScanSummary) => {
    const issues = summary.issues;
    const categories = [
      { name: 'Unused Imports', data: issues.unusedImports },
      { name: 'Console Statements', data: issues.consoleStatements },
      { name: 'Any Types', data: issues.anyTypes },
      { name: 'Long Functions', data: issues.longFunctions },
      { name: 'Complexity', data: issues.complexity },
      { name: 'Duplication', data: issues.duplication },
    ];

    return (
      <div className="space-y-2 mt-4">
        <h4 className="text-sm font-semibold text-gray-300">Issue Summary</h4>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(({ name, data }) => (
            <div
              key={name}
              className="px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50"
            >
              <div className="text-xs text-gray-400">{name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-mono text-gray-300">
                  {data.found} found
                </span>
                {data.fixed > 0 && (
                  <span className="text-xs text-green-400 font-mono">
                    ({data.fixed} fixed)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      >
        {/* Backdrop blur */}
        <div className="absolute inset-0 backdrop-blur-sm" onClick={handleClose} />

        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            backgroundColor: '#0f172a',
            borderColor: `${color}30`,
            boxShadow: `0 0 60px ${color}20`,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{
              borderColor: `${color}20`,
              background: `linear-gradient(to right, ${color}10, transparent)`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
              />
              <h3 className="text-lg font-bold text-white font-mono">
                Refactor: {groupName}
              </h3>
              {isRunning && (
                <span className="text-sm text-gray-400 font-mono">
                  {progress}%
                </span>
              )}
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Scan Visualization */}
          <div className="px-6 py-4">
            <ScanVisualization progress={progress} color={color} />
          </div>

          {/* Terminal Output */}
          <div
            ref={terminalRef}
            className="mx-6 mb-4 h-64 overflow-y-auto rounded-lg bg-black/50 border border-gray-700/50 p-4 font-mono text-sm"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`py-0.5 ${
                  msg.type === 'error'
                    ? 'text-red-400'
                    : msg.type === 'system'
                    ? 'text-cyan-400'
                    : 'text-gray-300'
                }`}
              >
                {msg.type === 'system' && (
                  <span className="text-cyan-500 mr-2">[SYS]</span>
                )}
                {msg.type === 'error' && (
                  <span className="text-red-500 mr-2">[ERR]</span>
                )}
                {msg.content}
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-gray-500 italic">Waiting for output...</div>
            )}
          </div>

          {/* Results Section */}
          {isComplete && summary && (
            <div className="px-6 pb-4">
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: `${color}10`,
                  borderColor: `${color}30`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <div className="text-lg font-bold text-white">
                        Scan Complete
                      </div>
                      <div className="text-sm text-gray-400">
                        {summary.filesScanned} files scanned, {summary.filesFixed} fixed
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className="text-3xl font-bold font-mono"
                      style={{ color }}
                    >
                      {summary.filesFixed}
                    </div>
                    <div className="text-xs text-gray-400">Files Fixed</div>
                  </div>
                </div>

                {renderIssueSummary(summary)}

                {/* Git status */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700/50">
                  <GitCommit className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">
                    Changes auto-committed and pushed
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Section */}
          {isFailed && error && (
            <div className="px-6 pb-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <div>
                    <div className="text-lg font-bold text-white">Scan Failed</div>
                    <div className="text-sm text-red-400">{error}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer with Done button */}
          <div
            className="flex justify-end px-6 py-4 border-t"
            style={{ borderColor: `${color}20` }}
          >
            <motion.button
              onClick={handleClose}
              className="px-6 py-2 rounded-lg font-semibold text-white transition-all"
              style={{
                backgroundColor: isComplete || isFailed ? color : `${color}50`,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isRunning}
            >
              {isComplete || isFailed ? 'Done' : 'Cancel'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Render via portal to body
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return null;
};

export default GroupScanOverlay;
