'use client';

import { useEffect, useCallback, useRef, useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { List, RowComponentProps } from 'react-window';
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
import {
  registerTaskStart,
  registerTaskComplete,
  sendTaskHeartbeat,
  getTaskStatus,
  clearSessionTasks,
} from './taskRegistry';

// Static icon maps for O(1) lookup instead of switch statement per render
const LOG_ICON_SIZE = 'w-3 h-3';

const LOG_TYPE_ICONS: Record<LogEntry['type'], { icon: typeof User; colorClass: string }> = {
  user: { icon: User, colorClass: 'text-blue-400' },
  assistant: { icon: Bot, colorClass: 'text-purple-400' },
  tool_use: { icon: Wrench, colorClass: 'text-yellow-400' },
  tool_result: { icon: CheckCircle, colorClass: 'text-green-400' },
  error: { icon: AlertCircle, colorClass: 'text-red-400' },
  system: { icon: ListOrdered, colorClass: 'text-cyan-400' },
};

const TOOL_ICONS: Record<string, { icon: typeof FileEdit; colorClass: string }> = {
  Edit: { icon: FileEdit, colorClass: 'text-yellow-400' },
  Write: { icon: FilePlus, colorClass: 'text-green-400' },
  Read: { icon: Eye, colorClass: 'text-blue-400' },
};

// Virtualization constants
const LOG_ITEM_HEIGHT = 24; // px - matches py-0.5 + text-xs line height
const ANIMATED_LOG_COUNT = 5; // Number of recent logs to animate
const VIRTUALIZATION_THRESHOLD = 50; // Start virtualizing after this many logs

// Get icon for log type - uses static maps for O(1) lookup
const getLogIcon = (type: LogEntry['type'], toolName?: string) => {
  // For tool_use, check tool-specific icons first
  if (type === 'tool_use' && toolName) {
    const toolIcon = TOOL_ICONS[toolName];
    if (toolIcon) {
      const Icon = toolIcon.icon;
      return <Icon className={`${LOG_ICON_SIZE} ${toolIcon.colorClass}`} />;
    }
  }

  // Look up in type map
  const config = LOG_TYPE_ICONS[type];
  if (config) {
    const Icon = config.icon;
    return <Icon className={`${LOG_ICON_SIZE} ${config.colorClass}`} />;
  }

  // Default fallback
  return <Bot className={`${LOG_ICON_SIZE} text-gray-400`} />;
};

// Format log content - extracted for reuse
const formatLogContent = (log: LogEntry) => {
  if (log.type === 'tool_use' && log.toolInput?.file_path) {
    const fileName = String(log.toolInput.file_path).split(/[/\\]/).pop();
    return `${log.toolName}: ${fileName}`;
  }
  if (log.type === 'tool_result') {
    return log.content.length > 80 ? log.content.slice(0, 80) + '...' : log.content;
  }
  return log.content.length > 150 ? log.content.slice(0, 150) + '...' : log.content;
};

// Get text color class for log type
const getLogTextClass = (type: LogEntry['type']) => {
  switch (type) {
    case 'error': return 'text-red-400';
    case 'user': return 'text-blue-300';
    case 'tool_result': return 'text-gray-500 font-mono';
    case 'system': return 'text-cyan-400';
    default: return 'text-gray-300';
  }
};

// Memoized log row component for virtualized list
interface LogRowData {
  logs: LogEntry[];
}

const LogRow = memo(({ index, style, logs }: RowComponentProps<LogRowData>) => {
  const log = logs[index];
  return (
    <div
      style={style}
      className="flex items-start gap-2 px-3 py-0.5 hover:bg-gray-800/40 transition-colors duration-150"
    >
      <span className="flex-shrink-0 mt-0.5">
        {getLogIcon(log.type, log.toolName)}
      </span>
      <span className={`text-xs leading-relaxed break-all truncate ${getLogTextClass(log.type)}`}>
        {formatLogContent(log)}
      </span>
    </div>
  );
});
LogRow.displayName = 'LogRow';

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
  currentExecutionId,
  currentStoredTaskId,
  onExecutionChange,
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
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Ref for currentTaskId to avoid stale closure issues in SSE handler
  // The SSE handler callback is created when connectToStream is called,
  // but setCurrentTaskId is async - so the closure may have stale value.
  // Using a ref ensures the handler always reads the latest task ID.
  const currentTaskIdRef = useRef<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stuckCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if we should use virtualization (for performance with many logs)
  const useVirtualization = logs.length > VIRTUALIZATION_THRESHOLD;

  // Split logs: virtualized (older) and animated (recent)
  const { virtualizedLogs, animatedLogs } = useMemo(() => {
    if (!useVirtualization) {
      return { virtualizedLogs: [], animatedLogs: logs };
    }
    const splitIndex = Math.max(0, logs.length - ANIMATED_LOG_COUNT);
    return {
      virtualizedLogs: logs.slice(0, splitIndex),
      animatedLogs: logs.slice(splitIndex),
    };
  }, [logs, useVirtualization]);

  // Auto-scroll to bottom - works for both virtualized and non-virtualized
  useEffect(() => {
    if (isAutoScroll) {
      if (useVirtualization && listRef.current) {
        // Scroll virtualized list to end
        listRef.current.scrollToItem(virtualizedLogs.length - 1, 'end');
      }
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [logs, isAutoScroll, useVirtualization, virtualizedLogs.length]);

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
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (stuckCheckIntervalRef.current) {
        clearInterval(stuckCheckIntervalRef.current);
      }
    };
  }, []);

  // Track if we've attempted reconnection
  const hasAttemptedReconnectRef = useRef(false);

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

        // Stop heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Handle task completion - use ref to avoid stale closure
        const taskId = currentTaskIdRef.current;
        if (taskId) {
          const success = !data.isError;
          // Register completion with server registry (fire-and-forget)
          registerTaskComplete(taskId, instanceId, success);
          onTaskComplete?.(taskId, success);
          // Clear execution ID for background processing
          onExecutionChange?.(null, null);
          currentTaskIdRef.current = null;
          setCurrentTaskId(null);
        }
        break;
      }
      case 'error': {
        const data = event.data as { error: string };
        setError(data.error);
        setIsStreaming(false);

        // Stop heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        addLog({
          id: `error-${Date.now()}`,
          type: 'error',
          content: data.error,
          timestamp: event.timestamp,
        });

        // Handle task failure - use ref to avoid stale closure
        const taskId = currentTaskIdRef.current;
        if (taskId) {
          // Register failure with server registry (fire-and-forget)
          registerTaskComplete(taskId, instanceId, false);
          onTaskComplete?.(taskId, false);
          // Clear execution ID for background processing
          onExecutionChange?.(null, null);
          currentTaskIdRef.current = null;
          setCurrentTaskId(null);
        }
        break;
      }
    }
  }, [addLog, addFileChange, instanceId, onTaskComplete, onExecutionChange]);

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

  // Reconnect to active execution on mount (background processing support)
  useEffect(() => {
    // Only attempt reconnection once per mount
    if (hasAttemptedReconnectRef.current) return;
    if (!currentExecutionId || isStreaming) return;

    hasAttemptedReconnectRef.current = true;

    // Check if execution is still active on server
    const attemptReconnect = async () => {
      try {
        const response = await fetch(`/api/claude-terminal/query?executionId=${currentExecutionId}`);
        if (!response.ok) {
          // Execution not found - clear it
          onExecutionChange?.(null, null);
          return;
        }

        const { execution } = await response.json();

        if (execution?.status === 'running') {
          // Execution still running - reconnect!
          addLog({
            id: `reconnect-${Date.now()}`,
            type: 'system',
            content: `Reconnecting to running task...`,
            timestamp: Date.now(),
          });

          // Set state for active task
          setIsStreaming(true);
          currentTaskIdRef.current = currentStoredTaskId || null;
          setCurrentTaskId(currentStoredTaskId || null);

          // Notify parent task is running
          if (currentStoredTaskId) {
            onTaskStart?.(currentStoredTaskId);
          }

          // Start heartbeat
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(() => {
            if (currentStoredTaskId) {
              sendTaskHeartbeat(currentStoredTaskId);
            }
          }, 2 * 60 * 1000);

          // Connect to stream - server will replay events from where we left off
          connectToStream(`/api/claude-terminal/stream?executionId=${currentExecutionId}`);
        } else {
          // Execution completed while we were away
          addLog({
            id: `completed-away-${Date.now()}`,
            type: 'system',
            content: `Task completed while away (${execution?.status || 'unknown'})`,
            timestamp: Date.now(),
          });

          // Clear execution and notify completion
          onExecutionChange?.(null, null);

          if (currentStoredTaskId) {
            const success = execution?.status === 'completed';
            onTaskComplete?.(currentStoredTaskId, success);
          }
        }
      } catch (error) {
        console.error('Failed to reconnect:', error);
        // Clear on error
        onExecutionChange?.(null, null);
      }
    };

    attemptReconnect();
  }, [currentExecutionId, currentStoredTaskId, isStreaming, onExecutionChange, onTaskStart, onTaskComplete, addLog, connectToStream]);

  // Execute task from queue
  const executeTask = useCallback(async (task: QueuedTask, resumeSession: boolean) => {
    // Register task start with server registry
    let startResult = await registerTaskStart(task.id, instanceId, task.requirementName);
    if (!startResult.success && startResult.runningTask) {
      // Server says another task is running - but we're not streaming and have no current task
      // This means the server's record is stale (probably from a crash or incomplete cleanup)
      const otherTaskId = startResult.runningTask.taskId;

      // Since we're in executeTask and !isStreaming (checked by useEffect before calling us),
      // we know the client has no running task. Force clear the stale registry entry.
      addLog({
        id: `clear-${Date.now()}`,
        type: 'system',
        content: `Clearing stale registry entry ${otherTaskId.slice(0, 8)}`,
        timestamp: Date.now(),
      });
      await registerTaskComplete(otherTaskId, instanceId, false);

      // Retry registration
      startResult = await registerTaskStart(task.id, instanceId, task.requirementName);
      if (!startResult.success) {
        // Still failed - log and proceed anyway (registry shouldn't block execution)
        addLog({
          id: `warn-${Date.now()}`,
          type: 'system',
          content: `Registry conflict, proceeding anyway`,
          timestamp: Date.now(),
        });
      }
    }

    // Set ref BEFORE connecting to stream to avoid stale closure
    currentTaskIdRef.current = task.id;
    setIsStreaming(true);
    setError(null);
    setCurrentTaskId(task.id);
    onTaskStart?.(task.id);

    // Start heartbeat for long-running tasks (every 2 minutes)
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      sendTaskHeartbeat(task.id);
    }, 2 * 60 * 1000);

    // Build skills prefix for first task in session
    const skillsPrefix = !resumeSession && enabledSkills.length > 0
      ? buildSkillsPrompt(enabledSkills)
      : '';

    // Determine prompt: use direct prompt if available, otherwise execute requirement file
    const taskPrompt = task.directPrompt
      ? `${skillsPrefix}${task.directPrompt}`
      : `${skillsPrefix}Execute the requirement file: ${task.requirementName}`;

    const taskLabel = task.directPrompt
      ? `Direct prompt (${task.requirementName})`
      : task.requirementName;

    // Add system log
    addLog({
      id: `task-${Date.now()}`,
      type: 'system',
      content: `Starting: ${taskLabel}${enabledSkills.length > 0 && !resumeSession ? ` [${enabledSkills.join(', ')}]` : ''}`,
      timestamp: Date.now(),
    });

    try {
      const response = await fetch('/api/claude-terminal/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: task.projectPath,
          prompt: taskPrompt,
          resumeSessionId: resumeSession ? sessionId : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error);
        setIsStreaming(false);
        // Register failure with server
        registerTaskComplete(task.id, instanceId, false);
        onTaskComplete?.(task.id, false);
        currentTaskIdRef.current = null;
        setCurrentTaskId(null);
        // Stop heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        return;
      }

      const { streamUrl, executionId } = await response.json();

      // Store execution ID for background processing / reconnection
      if (executionId) {
        onExecutionChange?.(executionId, task.id);
      }

      connectToStream(streamUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start task');
      setIsStreaming(false);
      // Register failure with server
      registerTaskComplete(task.id, instanceId, false);
      onTaskComplete?.(task.id, false);
      currentTaskIdRef.current = null;
      setCurrentTaskId(null);
      // Stop heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
  }, [sessionId, instanceId, addLog, connectToStream, onTaskStart, onTaskComplete, onExecutionChange, enabledSkills]);

  // Track pending next task execution
  const pendingNextTaskRef = useRef<NodeJS.Timeout | null>(null);

  // Stuck task detection - periodically check server registry for stuck tasks
  useEffect(() => {
    if (!autoStart || !isStreaming || !currentTaskId) {
      // Clear stuck check when not actively running
      if (stuckCheckIntervalRef.current) {
        clearInterval(stuckCheckIntervalRef.current);
        stuckCheckIntervalRef.current = null;
      }
      return;
    }

    // Check every 30 seconds if current task is stuck
    stuckCheckIntervalRef.current = setInterval(async () => {
      // Use ref to get current task ID (avoids stale closure)
      const taskId = currentTaskIdRef.current;
      if (!taskId) return;

      const status = await getTaskStatus(taskId);

      // If server says task is completed but we're still streaming, sync state
      if (status.found && status.status !== 'running') {
        addLog({
          id: `sync-${Date.now()}`,
          type: 'system',
          content: `Server reports task ${status.status} - syncing state`,
          timestamp: Date.now(),
        });

        // Close SSE if still open
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        setIsStreaming(false);
        const success = status.status === 'completed';
        onTaskComplete?.(taskId, success);
        currentTaskIdRef.current = null;
        setCurrentTaskId(null);

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      }

      // If task is stale (running too long), mark as failed
      if (status.isStale) {
        addLog({
          id: `stale-${Date.now()}`,
          type: 'system',
          content: `Task timed out - marking as failed`,
          timestamp: Date.now(),
        });

        // Close SSE if still open
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        setIsStreaming(false);
        registerTaskComplete(taskId, instanceId, false);
        onTaskComplete?.(taskId, false);
        currentTaskIdRef.current = null;
        setCurrentTaskId(null);

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      }
    }, 30 * 1000); // Check every 30 seconds

    return () => {
      if (stuckCheckIntervalRef.current) {
        clearInterval(stuckCheckIntervalRef.current);
        stuckCheckIntervalRef.current = null;
      }
    };
  }, [autoStart, isStreaming, currentTaskId, instanceId, addLog, onTaskComplete]);

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

    // Stop heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Use ref for current task ID (avoids stale closure)
    const taskId = currentTaskIdRef.current;
    if (taskId) {
      // Register abort as failure with server
      registerTaskComplete(taskId, instanceId, false);
      onTaskComplete?.(taskId, false);
      currentTaskIdRef.current = null;
      setCurrentTaskId(null);
    }
  }, [instanceId, onTaskComplete]);

  // Clear logs and reset session
  const handleClear = useCallback(async () => {
    // Clear session tasks from server registry
    await clearSessionTasks(instanceId);

    setLogs([]);
    setFileChanges([]);
    setError(null);
    setSessionId(null);
    currentTaskIdRef.current = null;
    setCurrentTaskId(null);

    // Stop any running intervals
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (stuckCheckIntervalRef.current) {
      clearInterval(stuckCheckIntervalRef.current);
      stuckCheckIntervalRef.current = null;
    }
  }, [instanceId]);

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

  const editCount = fileChanges.filter(c => c.changeType === 'edit').length;
  const writeCount = fileChanges.filter(c => c.changeType === 'write').length;
  const queuePendingCount = taskQueue.filter(t => t.status === 'pending').length;

  return (
    <div className={`flex flex-col bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800/80 rounded-lg overflow-hidden shadow-inner ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-gray-800/50 to-gray-800/30 border-b border-gray-800/80">
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
            <span className="text-[10px] text-cyan-400 px-1.5 py-0.5 bg-cyan-500/10 rounded-md border border-cyan-500/20 tabular-nums">
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
              className="p-1 hover:bg-gray-700 rounded transition-all duration-200 text-purple-400 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30"
              title="Resume session"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          {/* Clear button */}
          <button
            onClick={handleClear}
            disabled={isStreaming}
            className="p-1 hover:bg-gray-700 rounded transition-all duration-200 text-gray-400 hover:text-red-400 hover:scale-110 active:scale-95 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
            title="Clear"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 text-[10px] text-gray-500 bg-gray-900/70 border-b border-gray-800/50 backdrop-blur-sm">
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
        ) : useVirtualization ? (
          // Virtualized rendering for long sessions (>50 logs)
          <div className="py-1">
            {/* Virtualized older logs */}
            {virtualizedLogs.length > 0 && (
              <List<LogRowData>
                ref={listRef}
                defaultHeight={Math.min(virtualizedLogs.length * LOG_ITEM_HEIGHT, 200)}
                rowCount={virtualizedLogs.length}
                rowHeight={LOG_ITEM_HEIGHT}
                overscanCount={5}
                rowComponent={LogRow}
                rowProps={{ logs: virtualizedLogs }}
              />
            )}
            {/* Animated recent logs */}
            <AnimatePresence initial={false}>
              {animatedLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 px-3 py-0.5 hover:bg-gray-800/40 transition-colors duration-150"
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.type, log.toolName)}
                  </span>
                  <span className={`text-xs leading-relaxed break-all ${getLogTextClass(log.type)}`}>
                    {formatLogContent(log)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          // Standard animated rendering for short sessions
          <div className="py-1">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 px-3 py-0.5 hover:bg-gray-800/40 transition-colors duration-150"
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.type, log.toolName)}
                  </span>
                  <span className={`text-xs leading-relaxed break-all ${getLogTextClass(log.type)}`}>
                    {formatLogContent(log)}
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
            // Scroll virtualized list to bottom if active
            if (useVirtualization && listRef.current) {
              listRef.current.scrollToItem(virtualizedLogs.length - 1, 'end');
            }
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
          }}
          className="absolute bottom-14 right-3 p-1 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-800/80 bg-gray-900/70 backdrop-blur-sm">
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
          <button onClick={handleAbort} className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30">
            <Square className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={() => handleSubmit(false)}
            disabled={!input.trim()}
            className="p-1 text-purple-400 hover:bg-purple-500/20 rounded transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30"
          >
            <Send className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
