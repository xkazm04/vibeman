/**
 * ContextGenerationOverlay
 *
 * Full-screen overlay that appears during context generation scan.
 * Shows terminal output, scan status, and completion summary.
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
  FolderPlus,
  Boxes,
  Network,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  useContextGenerationStore,
  type TerminalMessage,
  type ContextGenerationSummary,
} from '@/stores/contextGenerationStore';
import { useContextGenerationStream } from '../hooks/useContextGenerationStream';

interface ContextGenerationOverlayProps {
  onComplete?: () => void;
}

/** Static lookup map for message type colors */
const MESSAGE_COLORS: Record<TerminalMessage['type'], string> = {
  error: 'text-red-300',
  system: 'text-cyan-300',
  input: 'text-blue-300',
  output: 'text-gray-300',
};

/** Format content for display (truncate if too long) */
function formatContent(content: string): string {
  return content.length > 200 ? content.slice(0, 200) + '...' : content;
}

/**
 * Render summary stats
 */
function renderSummary(summary: ContextGenerationSummary) {
  return (
    <div className="grid grid-cols-4 gap-4 mt-4">
      <div className="flex flex-col items-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <FolderPlus className="w-8 h-8 text-blue-400 mb-2" />
        <div className="text-2xl font-bold text-white">{summary.groupsCreated}</div>
        <div className="text-xs text-gray-400">Groups</div>
      </div>
      <div className="flex flex-col items-center p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <Boxes className="w-8 h-8 text-amber-400 mb-2" />
        <div className="text-2xl font-bold text-white">{summary.contextsCreated}</div>
        <div className="text-xs text-gray-400">Contexts</div>
      </div>
      <div className="flex flex-col items-center p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <Network className="w-8 h-8 text-purple-400 mb-2" />
        <div className="text-2xl font-bold text-white">{summary.relationshipsCreated}</div>
        <div className="text-xs text-gray-400">Relationships</div>
      </div>
      <div className="flex flex-col items-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <FileEdit className="w-8 h-8 text-green-400 mb-2" />
        <div className="text-2xl font-bold text-white">{summary.filesAnalyzed}</div>
        <div className="text-xs text-gray-400">Files</div>
      </div>
    </div>
  );
}

export const ContextGenerationOverlay: React.FC<ContextGenerationOverlayProps> = ({
  onComplete,
}) => {
  const { activeScan, clearScan, cancelGeneration } = useContextGenerationStore();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  // Connect to SSE stream if available
  useContextGenerationStream({
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
    clearScan();
    onComplete?.();
  };

  // Handle force clear (cancel with immediate state reset)
  const handleForceClear = async () => {
    await cancelGeneration(true);
    onComplete?.();
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

    const header = `=== CONTEXT GENERATION LOG ===
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
  }, [activeScan]);

  // If no active scan, don't render
  if (!activeScan) {
    return null;
  }

  const { status, messages, summary, error } = activeScan;
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isRunning = status === 'running' || status === 'pending';

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
        <div className="absolute inset-0 backdrop-blur-sm" onClick={isComplete || isFailed ? handleClose : undefined} />

        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            backgroundColor: '#0f172a',
            borderColor: 'rgba(6, 182, 212, 0.3)',
            boxShadow: '0 0 60px rgba(6, 182, 212, 0.2)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-500/10">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${isRunning ? 'animate-pulse bg-cyan-400' : isComplete ? 'bg-green-400' : 'bg-red-400'}`}
              />
              <h3 className="text-lg font-bold text-white font-mono">
                Context Generation
              </h3>
              {isRunning && (
                <span className="text-sm text-gray-400 font-mono">
                  Analyzing codebase...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                title="Copy log"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Minimize button */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4 text-gray-400" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Close/Cancel button */}
              <button
                onClick={isRunning ? handleForceClear : handleClose}
                className={`p-2 rounded-lg transition-colors ${
                  isRunning ? 'hover:bg-red-900/50' : 'hover:bg-gray-800/50'
                }`}
                title={isRunning ? 'Cancel' : 'Close'}
              >
                <X className={`w-4 h-4 ${isRunning ? 'text-red-400' : 'text-gray-400'}`} />
              </button>
            </div>
          </div>

          {/* Terminal Output */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="relative"
              >
                <div
                  ref={terminalRef}
                  onScroll={handleScroll}
                  className="h-80 overflow-y-auto font-mono text-sm p-4"
                >
                  {messages.length === 0 ? (
                    <div className="text-gray-500 italic">Waiting for output...</div>
                  ) : (
                    <div className="space-y-1">
                      {messages.map((msg) => {
                        // Inline icon logic - avoids function call overhead
                        const iconClass = "w-3.5 h-3.5 shrink-0";
                        let icon: React.ReactNode;
                        if (msg.type === 'error') {
                          icon = <AlertCircle className={`${iconClass} text-red-400`} />;
                        } else if (msg.type === 'system') {
                          icon = <ListOrdered className={`${iconClass} text-cyan-400`} />;
                        } else if (msg.type === 'input') {
                          icon = <Bot className={`${iconClass} text-blue-400`} />;
                        } else if (msg.content.includes('Using tool:')) {
                          icon = msg.content.includes('Edit') || msg.content.includes('Write')
                            ? <FileEdit className={`${iconClass} text-yellow-400`} />
                            : <Wrench className={`${iconClass} text-purple-400`} />;
                        } else if (msg.content.includes('group') || msg.content.includes('Group')) {
                          icon = <FolderPlus className={`${iconClass} text-green-400`} />;
                        } else if (msg.content.includes('context') || msg.content.includes('Context')) {
                          icon = <Boxes className={`${iconClass} text-amber-400`} />;
                        } else {
                          icon = <Bot className={`${iconClass} text-gray-400`} />;
                        }

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex items-start gap-2 py-0.5 ${MESSAGE_COLORS[msg.type]}`}
                          >
                            {icon}
                            <span className="break-all">{formatContent(msg.content)}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Streaming indicator */}
                  {isRunning && messages.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      Processing...
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
                    className="absolute bottom-4 right-4 p-2 bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section */}
          {isComplete && summary && (
            <div className="px-6 pb-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <div className="text-lg font-bold text-white">Generation Complete</div>
                    <div className="text-sm text-gray-400">
                      Your codebase has been analyzed and contexts have been created
                    </div>
                  </div>
                </div>
                {renderSummary(summary)}
              </div>
            </div>
          )}

          {/* Error Section */}
          {isFailed && error && (
            <div className="px-6 pb-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <div>
                    <div className="text-lg font-bold text-white">Generation Failed</div>
                    <div className="text-sm text-red-400">{error}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer with Done button */}
          <div className="flex justify-end px-6 py-4 border-t border-cyan-500/20">
            <motion.button
              onClick={handleClose}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition-all ${
                isComplete
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400'
                  : isFailed
                  ? 'bg-red-500 hover:bg-red-400'
                  : 'bg-gray-700 cursor-not-allowed'
              }`}
              whileHover={{ scale: isComplete || isFailed ? 1.02 : 1 }}
              whileTap={{ scale: isComplete || isFailed ? 0.98 : 1 }}
              disabled={isRunning}
            >
              {isComplete ? 'Done - View Contexts' : isFailed ? 'Close' : 'Running...'}
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

export default ContextGenerationOverlay;
