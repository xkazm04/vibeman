/**
 * InlineScanOverlay
 *
 * Compact terminal overlay that sits inside a ContextSection during scans.
 * Shows real-time CLI output without blocking other groups.
 * Supports minimize to just show status bar.
 *
 * Modeled after CompactTerminal.tsx patterns for consistent UX.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Minimize2,
  Maximize2,
  ChevronDown,
  Copy,
  Check,
  Bot,
  Wrench,
  CheckCircle,
  AlertCircle,
  ListOrdered,
  FileEdit,
  Eye,
} from 'lucide-react';
import { useGroupHealthStore, type TerminalMessage } from '@/stores/groupHealthStore';
import { useHealthScanStream } from '../hooks/useHealthScanStream';

interface InlineScanOverlayProps {
  groupId: string;
  groupName: string;
  color: string;
  scanType?: 'refactor' | 'beautify' | 'performance' | 'production';
}

/**
 * Format content for compact display (following CompactTerminal patterns)
 */
function formatContent(msg: TerminalMessage): string {
  const content = msg.content || '';

  // Truncate long messages
  if (content.length > 150) {
    return content.slice(0, 150) + '...';
  }

  return content;
}

/**
 * Get icon for message type (following CompactTerminal patterns)
 */
function getMessageIcon(msg: TerminalMessage) {
  switch (msg.type) {
    case 'error':
      return <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />;
    case 'system':
      return <ListOrdered className="w-3 h-3 text-cyan-400 shrink-0" />;
    case 'input':
      return <Eye className="w-3 h-3 text-blue-400 shrink-0" />;
    case 'output':
    default:
      // Check content for tool-related output
      if (msg.content.includes('Using tool:')) {
        if (msg.content.includes('Edit') || msg.content.includes('Write')) {
          return <FileEdit className="w-3 h-3 text-yellow-400 shrink-0" />;
        }
        return <Wrench className="w-3 h-3 text-purple-400 shrink-0" />;
      }
      if (msg.content.includes('✓') || msg.content.includes('fixed') || msg.content.includes('completed')) {
        return <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />;
      }
      return <Bot className="w-3 h-3 text-gray-400 shrink-0" />;
  }
}

/**
 * Get text color for message type
 */
function getMessageColor(msg: TerminalMessage): string {
  switch (msg.type) {
    case 'error':
      return 'text-red-300';
    case 'system':
      return 'text-cyan-300';
    case 'input':
      return 'text-blue-300';
    default:
      return 'text-gray-300';
  }
}

export const InlineScanOverlay: React.FC<InlineScanOverlayProps> = ({
  groupId,
  groupName,
  color,
  scanType = 'refactor',
}) => {
  const { getActiveScan, clearScan, forceClearScan } = useGroupHealthStore();
  const activeScan = getActiveScan(groupId);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  // Connect to SSE stream if available
  useHealthScanStream({
    groupId,
    streamUrl: activeScan?.streamUrl || null,
  });

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (isAutoScroll && terminalRef.current && !isMinimized) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeScan?.messages, isAutoScroll, isMinimized]);

  // Detect manual scroll
  const handleScroll = useCallback(() => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAutoScroll(isAtBottom);
  }, []);

  // Handle close
  const handleClose = () => {
    clearScan(groupId);
  };

  // Handle force clear (for stuck scans)
  const handleForceClear = async () => {
    await forceClearScan(groupId);
  };

  // Copy log to clipboard
  const handleCopy = useCallback(async () => {
    if (!activeScan?.messages) return;

    const logText = activeScan.messages
      .map(msg => {
        const prefix = msg.type === 'error' ? '[ERROR]' :
                       msg.type === 'system' ? '[SYSTEM]' :
                       msg.type === 'input' ? '[INPUT]' : '';
        const timestamp = new Date(msg.timestamp).toISOString().split('T')[1].split('.')[0];
        return `${timestamp} ${prefix} ${msg.content}`;
      })
      .join('\n');

    const header = `=== ${scanType.toUpperCase()} SCAN LOG ===
Group: ${groupName}
Group ID: ${groupId}
Status: ${activeScan.status}
Messages: ${activeScan.messages.length}
Timestamp: ${new Date().toISOString()}
${'='.repeat(40)}

`;

    try {
      await navigator.clipboard.writeText(header + logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy log:', err);
    }
  }, [activeScan, groupId, groupName, scanType]);

  // If no active scan, don't render
  if (!activeScan) {
    return null;
  }

  const { status, messages } = activeScan;
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isRunning = status === 'running' || status === 'pending';

  // Get scan type from active scan or fallback to prop
  const effectiveScanType = activeScan.scanType || scanType;

  // Get scan type label
  const scanLabel = effectiveScanType === 'beautify' ? 'Beautify' :
                    effectiveScanType === 'performance' ? 'Performance' :
                    effectiveScanType === 'production' ? 'Production' : 'Refactor';

  // Count tool uses for stats
  const toolUseCount = messages.filter(m => m.content.includes('Using tool:')).length;
  const editCount = messages.filter(m => m.content.includes('Edit') || m.content.includes('Write')).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute inset-0 z-30 flex flex-col rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b shrink-0"
        style={{
          borderColor: `${color}30`,
          background: `linear-gradient(to right, ${color}15, transparent)`,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div
            className={`w-2 h-2 rounded-full ${isRunning ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: isComplete ? '#4ade80' : isFailed ? '#f87171' : color }}
          />

          <span className="text-xs font-medium text-white font-mono">
            {scanLabel}
          </span>

          {/* Stats badge */}
          {toolUseCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
              {editCount > 0 ? `${editCount}E` : ''} {toolUseCount}T
            </span>
          )}

          {isComplete && activeScan.summary && (
            <span className="text-[10px] text-green-400 font-mono">
              {activeScan.summary.filesFixed} fixed
            </span>
          )}

          {isFailed && (
            <span className="text-[10px] text-red-400 font-mono">
              failed
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-gray-800/50 transition-colors"
            title="Copy log to clipboard"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-gray-800/50 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-3 h-3 text-gray-400" />
            ) : (
              <Minimize2 className="w-3 h-3 text-gray-400" />
            )}
          </button>

          {/* Close button for completed/failed */}
          {(isComplete || isFailed) && (
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-gray-800/50 transition-colors"
              title="Close"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}

          {/* Force clear for stuck running scans */}
          {isRunning && (
            <button
              onClick={handleForceClear}
              className="p-1 rounded hover:bg-red-900/50 transition-colors"
              title="Force stop scan"
            >
              <X className="w-3 h-3 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output - collapsible */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex-1 min-h-0 overflow-hidden relative"
          >
            <div
              ref={terminalRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto font-mono text-[11px] leading-relaxed"
              style={{ maxHeight: 'calc(100% - 32px)' }}
            >
              {messages.length === 0 ? (
                <div className="text-gray-500 italic p-3">Waiting for output...</div>
              ) : (
                <div className="py-1">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`flex items-start gap-1.5 px-2 py-0.5 hover:bg-gray-800/30 ${getMessageColor(msg)}`}
                    >
                      {getMessageIcon(msg)}
                      <span className="break-all">{formatContent(msg)}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Streaming indicator */}
              {isRunning && messages.length > 0 && (
                <div className="px-2 py-1 text-[10px] text-gray-500 flex items-center gap-1">
                  <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
                  Scanning...
                </div>
              )}
            </div>

            {/* Scroll to bottom button */}
            {!isAutoScroll && messages.length > 5 && (
              <button
                onClick={() => {
                  setIsAutoScroll(true);
                  terminalRef.current?.scrollTo({
                    top: terminalRef.current.scrollHeight,
                    behavior: 'smooth',
                  });
                }}
                className="absolute bottom-2 right-2 p-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized status bar */}
      {isMinimized && (
        <div className="px-3 py-1.5 text-[10px] text-gray-400 font-mono flex items-center justify-between">
          <span>
            {isRunning ? (
              <>Processing {messages.length} lines...</>
            ) : isComplete ? (
              <span className="text-green-400">Completed - {activeScan.summary?.filesFixed || 0} files fixed</span>
            ) : isFailed ? (
              <span className="text-red-400">Failed - {activeScan.error || 'Unknown error'}</span>
            ) : null}
          </span>

          {/* Copy in minimized view too */}
          <button
            onClick={handleCopy}
            className="p-0.5 rounded hover:bg-gray-800/50 transition-colors"
            title="Copy log"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-gray-500" />
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default InlineScanOverlay;
