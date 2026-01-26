/**
 * MiniTerminal
 *
 * A compact CLI terminal component designed for embedding in Annette chat messages.
 * Shows real-time execution progress for Claude Code tasks with minimal footprint.
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Bot,
  Wrench,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileEdit,
  FilePlus,
  Eye,
  XCircle,
} from 'lucide-react';
import type {
  QueuedTask,
  LogEntry,
  ExecutionInfo,
  ExecutionResult,
  CLISSEEvent,
} from '@/components/cli/types';

export interface MiniTerminalProps {
  /** Unique instance identifier */
  instanceId: string;
  /** Project path for execution */
  projectPath: string;
  /** Requirement name to execute */
  requirementName: string;
  /** Project ID */
  projectId: string;
  /** Optional title override */
  title?: string;
  /** Start execution immediately */
  autoStart?: boolean;
  /** Callback when execution completes */
  onComplete?: (success: boolean, result?: ExecutionResult) => void;
  /** Callback when execution starts */
  onStart?: () => void;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact terminal for inline chat display
 */
export function MiniTerminal({
  instanceId,
  projectPath,
  requirementName,
  projectId,
  title,
  autoStart = false,
  onComplete,
  onStart,
  defaultCollapsed = false,
  className = '',
}: MiniTerminalProps) {
  // UI state
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [executionInfo, setExecutionInfo] = useState<ExecutionInfo | null>(null);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileStats, setFileStats] = useState({ edits: 0, writes: 0 });
  const [hasStarted, setHasStarted] = useState(false);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Add log entry
  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev.slice(-30), entry]); // Keep last 30 logs for memory
  }, []);

  // Handle SSE event
  const handleSSEEvent = useCallback((event: CLISSEEvent) => {
    switch (event.type) {
      case 'connected': {
        const data = event.data as ExecutionInfo & { executionId?: string };
        if (data.sessionId) setSessionId(data.sessionId);
        setExecutionInfo(data);
        setError(null);
        break;
      }
      case 'message': {
        const data = event.data as { type: string; content: string; model?: string };
        if (data.type === 'assistant' && data.content) {
          addLog({
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: 'assistant',
            content: data.content,
            timestamp: event.timestamp,
            model: data.model,
          });
        }
        break;
      }
      case 'tool_use': {
        const data = event.data as { toolUseId: string; toolName: string; toolInput: Record<string, unknown> };
        addLog({
          id: `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'tool_use',
          content: data.toolName,
          timestamp: event.timestamp,
          toolName: data.toolName,
          toolInput: data.toolInput,
        });

        // Track file changes
        if (data.toolName === 'Edit') {
          setFileStats(prev => ({ ...prev, edits: prev.edits + 1 }));
        } else if (data.toolName === 'Write') {
          setFileStats(prev => ({ ...prev, writes: prev.writes + 1 }));
        }
        break;
      }
      case 'tool_result': {
        const data = event.data as { toolUseId: string; content: string };
        addLog({
          id: `result-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'tool_result',
          content: typeof data.content === 'string' ? data.content.slice(0, 100) : JSON.stringify(data.content).slice(0, 100),
          timestamp: event.timestamp,
        });
        break;
      }
      case 'result': {
        const data = event.data as ExecutionResult;
        if (data.sessionId) setSessionId(data.sessionId);
        setLastResult(data);
        setIsStreaming(false);
        onComplete?.(!data.isError, data);
        break;
      }
      case 'error': {
        const data = event.data as { error: string };
        setError(data.error);
        setIsStreaming(false);
        addLog({
          id: `error-${Date.now()}`,
          type: 'error',
          content: data.error,
          timestamp: event.timestamp,
        });
        onComplete?.(false);
        break;
      }
    }
  }, [addLog, onComplete]);

  // Connect to SSE stream
  const connectToStream = useCallback((streamUrl: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as CLISSEEvent;
        handleSSEEvent(data);
        if (data.type === 'result' || data.type === 'error') {
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (e) {
        console.error('Failed to parse SSE:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [handleSSEEvent]);

  // Start execution
  const startExecution = useCallback(async () => {
    if (hasStarted || isStreaming) return;

    setHasStarted(true);
    setIsStreaming(true);
    setError(null);
    setIsCollapsed(false);
    onStart?.();

    addLog({
      id: `start-${Date.now()}`,
      type: 'system',
      content: `Executing: ${requirementName}`,
      timestamp: Date.now(),
    });

    try {
      const response = await fetch('/api/claude-terminal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          prompt: `Execute the requirement file: ${requirementName}`,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Failed to start execution');
        setIsStreaming(false);
        onComplete?.(false);
        return;
      }

      const { streamUrl } = await response.json();
      connectToStream(streamUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
      setIsStreaming(false);
      onComplete?.(false);
    }
  }, [hasStarted, isStreaming, projectPath, requirementName, addLog, connectToStream, onStart, onComplete]);

  // Auto-start on mount if enabled
  useEffect(() => {
    if (autoStart && !hasStarted) {
      startExecution();
    }
  }, [autoStart, hasStarted, startExecution]);

  // Get icon for log type
  const getLogIcon = (type: LogEntry['type'], toolName?: string) => {
    const size = 'w-2.5 h-2.5';
    switch (type) {
      case 'assistant':
        return <Bot className={`${size} text-purple-400`} />;
      case 'tool_use':
        if (toolName === 'Edit') return <FileEdit className={`${size} text-yellow-400`} />;
        if (toolName === 'Write') return <FilePlus className={`${size} text-green-400`} />;
        if (toolName === 'Read') return <Eye className={`${size} text-blue-400`} />;
        return <Wrench className={`${size} text-yellow-400`} />;
      case 'tool_result':
        return <CheckCircle className={`${size} text-green-400`} />;
      case 'error':
        return <AlertCircle className={`${size} text-red-400`} />;
      case 'system':
        return <Terminal className={`${size} text-cyan-400`} />;
      default:
        return <Bot className={`${size} text-gray-400`} />;
    }
  };

  // Format log content
  const formatContent = (log: LogEntry) => {
    if (log.type === 'tool_use' && log.toolInput?.file_path) {
      const fileName = String(log.toolInput.file_path).split(/[/\\]/).pop();
      return `${log.toolName}: ${fileName}`;
    }
    if (log.type === 'tool_result') {
      return log.content.length > 50 ? log.content.slice(0, 50) + '...' : log.content;
    }
    return log.content.length > 80 ? log.content.slice(0, 80) + '...' : log.content;
  };

  // Status indicator
  const StatusIndicator = () => {
    if (isStreaming) {
      return (
        <span className="flex items-center gap-1 text-yellow-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-[10px]">Running</span>
        </span>
      );
    }
    if (error || lastResult?.isError) {
      return (
        <span className="flex items-center gap-1 text-red-400">
          <XCircle className="w-3 h-3" />
          <span className="text-[10px]">Failed</span>
        </span>
      );
    }
    if (lastResult) {
      return (
        <span className="flex items-center gap-1 text-green-400">
          <CheckCircle className="w-3 h-3" />
          <span className="text-[10px]">Complete</span>
        </span>
      );
    }
    if (!hasStarted) {
      return (
        <button
          onClick={startExecution}
          className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 hover:bg-cyan-500/30 rounded text-cyan-400 text-[10px] transition-colors"
        >
          <Terminal className="w-3 h-3" />
          Start
        </button>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-900/80 border border-gray-700/50 rounded-lg overflow-hidden mt-2 ${className}`}
    >
      {/* Compact Header */}
      <div
        className="flex items-center justify-between px-2.5 py-1.5 bg-gray-800/50 cursor-pointer hover:bg-gray-800/70 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-purple-400" />
          <span className="text-[11px] font-medium text-gray-300">
            {title || requirementName}
          </span>
          {sessionId && (
            <span className="text-[9px] text-purple-400/60 font-mono">
              {sessionId.slice(0, 6)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* File stats */}
          {(fileStats.edits > 0 || fileStats.writes > 0) && (
            <div className="flex items-center gap-1 text-[9px]">
              {fileStats.edits > 0 && <span className="text-yellow-400">{fileStats.edits}E</span>}
              {fileStats.writes > 0 && <span className="text-green-400">{fileStats.writes}W</span>}
            </div>
          )}

          <StatusIndicator />

          {isCollapsed ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronUp className="w-3 h-3 text-gray-500" />
          )}
        </div>
      </div>

      {/* Collapsible Log Area */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div
              ref={scrollRef}
              className="max-h-[150px] overflow-y-auto border-t border-gray-800/50"
            >
              {logs.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-gray-600 text-[10px]">
                  {hasStarted ? 'Initializing...' : 'Click Start to begin execution'}
                </div>
              ) : (
                <div className="py-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-1.5 px-2.5 py-0.5 hover:bg-gray-800/30"
                    >
                      <span className="flex-shrink-0 mt-0.5">
                        {getLogIcon(log.type, log.toolName)}
                      </span>
                      <span className={`text-[10px] leading-relaxed break-all ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'tool_result' ? 'text-gray-500 font-mono' :
                        log.type === 'system' ? 'text-cyan-400' :
                        'text-gray-300'
                      }`}>
                        {formatContent(log)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 text-purple-400 text-[10px]">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Working...</span>
                </div>
              )}
            </div>

            {/* Token usage footer */}
            {lastResult?.usage && (
              <div className="flex items-center justify-between px-2.5 py-1 border-t border-gray-800/50 text-[9px] text-gray-600">
                <span>
                  {(lastResult.usage.inputTokens / 1000).toFixed(1)}k in / {(lastResult.usage.outputTokens / 1000).toFixed(1)}k out
                </span>
                {lastResult.durationMs && (
                  <span>{(lastResult.durationMs / 1000).toFixed(1)}s</span>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MiniTerminal;
