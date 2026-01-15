'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  User,
  Bot,
  Wrench,
  CheckCircle,
  AlertCircle,
  Send,
  Square,
  Loader2,
  Trash2,
  RotateCcw,
  ChevronDown,
  FileEdit,
  FilePlus,
  Eye,
  ListOrdered,
} from 'lucide-react';
import type {
  CompactTerminalProps,
  QueuedTask,
  FileChange,
  LogEntry,
  ExecutionInfo,
  ExecutionResult,
  CLISSEEvent,
} from './types';
import { buildSkillsPrompt } from './skills';

/**
 * Compact Terminal Component
 *
 * Minimalistic design with thin log rows for space efficiency.
 * Supports session chaining and task queue execution.
 */
export function CompactTerminal({
  instanceId,
  projectPath,
  title = 'Terminal',
  className = '',
  taskQueue = [],
  onTaskStart,
  onTaskComplete,
  onQueueEmpty,
  autoStart = false,
  enabledSkills = [],
}: CompactTerminalProps) {
  // Local state for this instance
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [executionInfo, setExecutionInfo] = useState<ExecutionInfo | null>(null);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Task queue state
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll]);

  // Detect manual scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAutoScroll(isAtBottom);
  }, []);

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
    setLogs(prev => [...prev, entry]);
  }, []);

  // Add file change
  const addFileChange = useCallback((change: FileChange) => {
    setFileChanges(prev => {
      const exists = prev.some(c => c.filePath === change.filePath && c.toolUseId === change.toolUseId);
      return exists ? prev : [...prev, change];
    });
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
        if (['Edit', 'Write', 'Read'].includes(data.toolName)) {
          const filePath = data.toolInput.file_path as string;
          if (filePath) {
            addFileChange({
              id: `fc-${Date.now()}`,
              sessionId: instanceId,
              filePath,
              changeType: data.toolName === 'Edit' ? 'edit' : data.toolName === 'Write' ? 'write' : 'read',
              timestamp: event.timestamp,
              toolUseId: data.toolUseId,
            });
          }
        }
        break;
      }
      case 'tool_result': {
        const data = event.data as { toolUseId: string; content: string };
        addLog({
          id: `result-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'tool_result',
          content: typeof data.content === 'string' ? data.content.slice(0, 200) : JSON.stringify(data.content).slice(0, 200),
          timestamp: event.timestamp,
        });
        break;
      }
      case 'result': {
        const data = event.data as ExecutionResult;
        if (data.sessionId) setSessionId(data.sessionId);
        setLastResult(data);
        setIsStreaming(false);

        // Handle task completion
        if (currentTaskId) {
          const success = !data.isError;
          onTaskComplete?.(currentTaskId, success);
          setCurrentTaskId(null);
        }
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

        // Handle task failure
        if (currentTaskId) {
          onTaskComplete?.(currentTaskId, false);
          setCurrentTaskId(null);
        }
        break;
      }
    }
  }, [addLog, addFileChange, instanceId, currentTaskId, onTaskComplete]);

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

  // Execute task from queue
  const executeTask = useCallback(async (task: QueuedTask, resumeSession: boolean) => {
    setIsStreaming(true);
    setError(null);
    setCurrentTaskId(task.id);
    onTaskStart?.(task.id);

    // Build skills prefix for first task in session
    const skillsPrefix = !resumeSession && enabledSkills.length > 0
      ? buildSkillsPrompt(enabledSkills)
      : '';

    // Add system log
    addLog({
      id: `task-${Date.now()}`,
      type: 'system',
      content: `Starting: ${task.requirementName}${enabledSkills.length > 0 && !resumeSession ? ` [${enabledSkills.join(', ')}]` : ''}`,
      timestamp: Date.now(),
    });

    try {
      const response = await fetch('/api/claude-terminal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: task.projectPath,
          prompt: `${skillsPrefix}Execute the requirement file: ${task.requirementName}`,
          resumeSessionId: resumeSession ? sessionId : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error);
        setIsStreaming(false);
        onTaskComplete?.(task.id, false);
        setCurrentTaskId(null);
        return;
      }

      const { streamUrl } = await response.json();
      connectToStream(streamUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start task');
      setIsStreaming(false);
      onTaskComplete?.(task.id, false);
      setCurrentTaskId(null);
    }
  }, [sessionId, addLog, connectToStream, onTaskStart, onTaskComplete, enabledSkills]);

  // Track pending next task execution
  const pendingNextTaskRef = useRef<NodeJS.Timeout | null>(null);

  // Process task queue - serialized execution with delay between tasks
  useEffect(() => {
    // Clear any pending next task timer
    if (pendingNextTaskRef.current) {
      clearTimeout(pendingNextTaskRef.current);
      pendingNextTaskRef.current = null;
    }

    if (isStreaming || taskQueue.length === 0) return;

    // Find next pending task (store status is the single source of truth)
    const nextTask = taskQueue.find(t => t.status === 'pending');

    if (nextTask && autoStart) {
      // Add delay before starting next task to allow cleanup to complete
      // This ensures requirement file deletion happens before next task starts
      pendingNextTaskRef.current = setTimeout(() => {
        // Resume session if we have one (for chaining)
        const shouldResume = sessionId !== null;
        executeTask(nextTask, shouldResume);
      }, 3000); // 3 second delay between tasks for cleanup
    } else if (!nextTask && taskQueue.length > 0 && autoStart) {
      // All tasks processed and we were actively running - signal queue empty
      // Guard with autoStart to prevent infinite loop (onQueueEmpty sets autoStart=false)
      onQueueEmpty?.();
    }

    return () => {
      if (pendingNextTaskRef.current) {
        clearTimeout(pendingNextTaskRef.current);
      }
    };
  }, [taskQueue, isStreaming, autoStart, sessionId, executeTask, onQueueEmpty]);

  // Submit prompt (manual input)
  const handleSubmit = useCallback(async (resumeSession = false) => {
    if (!input.trim() || isStreaming) return;

    const prompt = input.trim();
    setInput('');
    setIsStreaming(true);
    setError(null);

    // Add to history
    setInputHistory(prev => [...prev, prompt].slice(-50));
    setHistoryIndex(-1);

    // Add user log
    addLog({
      id: `user-${Date.now()}`,
      type: 'user',
      content: prompt,
      timestamp: Date.now(),
    });

    try {
      const response = await fetch('/api/claude-terminal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          prompt,
          resumeSessionId: resumeSession ? sessionId : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error);
        setIsStreaming(false);
        return;
      }

      const { streamUrl } = await response.json();
      connectToStream(streamUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
      setIsStreaming(false);
    }
  }, [input, isStreaming, projectPath, sessionId, addLog, connectToStream]);

  // Abort execution
  const handleAbort = useCallback(async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    if (currentTaskId) {
      onTaskComplete?.(currentTaskId, false);
      setCurrentTaskId(null);
    }
  }, [currentTaskId, onTaskComplete]);

  // Clear logs and reset session
  const handleClear = useCallback(() => {
    setLogs([]);
    setFileChanges([]);
    setError(null);
    setSessionId(null);
    setCurrentTaskId(null);
  }, []);

  // History navigation
  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    if (inputHistory.length === 0) return;

    let newIndex = historyIndex;
    if (direction === 'up') {
      newIndex = historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
    } else {
      newIndex = historyIndex === -1 ? -1 : Math.min(inputHistory.length - 1, historyIndex + 1);
      if (newIndex === inputHistory.length) newIndex = -1;
    }

    setHistoryIndex(newIndex);
    setInput(newIndex >= 0 ? inputHistory[newIndex] : '');
  }, [inputHistory, historyIndex]);

  // Get icon for log type
  const getLogIcon = (type: LogEntry['type'], toolName?: string) => {
    const size = 'w-3 h-3';
    switch (type) {
      case 'user':
        return <User className={`${size} text-blue-400`} />;
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
        return <ListOrdered className={`${size} text-cyan-400`} />;
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
      return log.content.length > 80 ? log.content.slice(0, 80) + '...' : log.content;
    }
    return log.content.length > 150 ? log.content.slice(0, 150) + '...' : log.content;
  };

  const editCount = fileChanges.filter(c => c.changeType === 'edit').length;
  const writeCount = fileChanges.filter(c => c.changeType === 'write').length;
  const queuePendingCount = taskQueue.filter(t => t.status === 'pending').length;

  return (
    <div className={`flex flex-col bg-gray-900 border border-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-gray-300">{title}</span>
          {sessionId && (
            <span className="text-[10px] text-purple-400/70 font-mono">
              {sessionId.slice(0, 6)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Queue count */}
          {queuePendingCount > 0 && (
            <span className="text-[10px] text-cyan-400 px-1.5 py-0.5 bg-cyan-500/10 rounded">
              Q:{queuePendingCount}
            </span>
          )}
          {/* File change stats */}
          {(editCount > 0 || writeCount > 0) && (
            <div className="flex items-center gap-1 mr-2 text-[10px]">
              {editCount > 0 && <span className="text-yellow-400">{editCount}E</span>}
              {writeCount > 0 && <span className="text-green-400">{writeCount}W</span>}
            </div>
          )}
          {/* Resume button */}
          {sessionId && !isStreaming && (
            <button
              onClick={() => {
                setInput('Continue');
                setTimeout(() => handleSubmit(true), 0);
              }}
              className="p-1 hover:bg-gray-700 rounded text-purple-400"
              title="Resume session"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          {/* Clear button */}
          <button
            onClick={handleClear}
            disabled={isStreaming}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 disabled:opacity-50"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 text-[10px] text-gray-500 bg-gray-900/50 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="flex items-center gap-1 text-yellow-400">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Running
            </span>
          ) : lastResult?.isError ? (
            <span className="text-red-400">Error</span>
          ) : lastResult ? (
            <span className="text-green-400">Done</span>
          ) : (
            <span>Ready</span>
          )}
          {executionInfo?.model && (
            <span className="text-gray-600">{executionInfo.model.split('-').slice(-2).join('-')}</span>
          )}
        </div>
        {lastResult?.usage && (
          <span className="text-gray-600">
            {(lastResult.usage.inputTokens / 1000).toFixed(1)}k/{(lastResult.usage.outputTokens / 1000).toFixed(1)}k
          </span>
        )}
      </div>

      {/* Log area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-[120px] max-h-[300px]"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            {queuePendingCount > 0 ? 'Waiting to start...' : 'Enter a prompt to start'}
          </div>
        ) : (
          <div className="py-1">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 px-3 py-0.5 hover:bg-gray-800/30"
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.type, log.toolName)}
                  </span>
                  <span className={`text-xs leading-relaxed break-all ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'user' ? 'text-blue-300' :
                    log.type === 'tool_result' ? 'text-gray-500 font-mono' :
                    log.type === 'system' ? 'text-cyan-400' :
                    'text-gray-300'
                  }`}>
                    {formatContent(log)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 px-3 py-1 text-purple-400 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Working...</span>
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isAutoScroll && logs.length > 10 && (
        <button
          onClick={() => {
            setIsAutoScroll(true);
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
          className="absolute bottom-14 right-3 p-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-white"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-800 bg-gray-900/50">
        <span className="text-purple-400 text-xs">❯</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e.ctrlKey || e.metaKey); // Ctrl/Cmd+Enter to resume
            }
            if (e.key === 'ArrowUp') navigateHistory('up');
            if (e.key === 'ArrowDown') navigateHistory('down');
            if (e.key === 'Escape' && isStreaming) handleAbort();
          }}
          placeholder="Prompt... (Ctrl+Enter to resume)"
          className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none"
        />
        {isStreaming ? (
          <button onClick={handleAbort} className="p-1 text-red-400 hover:bg-red-500/20 rounded">
            <Square className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={() => handleSubmit(false)}
            disabled={!input.trim()}
            className="p-1 text-purple-400 hover:bg-purple-500/20 rounded disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
