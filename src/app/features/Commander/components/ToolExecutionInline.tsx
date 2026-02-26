/**
 * ToolExecutionInline
 *
 * Renders inline MiniTerminal components for CLI executions in chat messages.
 * Parses tool results and displays execution progress for tools that trigger
 * Claude Code execution (execute_now, execute_requirement, accept_direction, etc.)
 */

'use client';

import { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import type { CLIExecutionInfo } from '@/stores/annetteStore';
import MiniTerminal from '@/app/features/Annette/components/MiniTerminal';

interface ToolExecutionInlineProps {
  /** CLI executions to display */
  executions: CLIExecutionInfo[];
  /** Message ID for unique terminal instances */
  messageId: string;
}

interface ExecutionState {
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: {
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
  };
}

/**
 * Inline CLI execution display for chat messages
 */
export default function ToolExecutionInline({
  executions,
  messageId,
}: ToolExecutionInlineProps) {
  // Track execution states
  const [executionStates, setExecutionStates] = useState<Record<string, ExecutionState>>({});

  // Handle execution start
  const handleStart = useCallback((execIndex: number) => {
    setExecutionStates(prev => ({
      ...prev,
      [execIndex]: { status: 'running' },
    }));
  }, []);

  // Handle execution complete
  const handleComplete = useCallback((execIndex: number, success: boolean, result?: { usage?: { inputTokens: number; outputTokens: number }; durationMs?: number }) => {
    setExecutionStates(prev => ({
      ...prev,
      [execIndex]: {
        status: success ? 'completed' : 'failed',
        result: result?.usage ? {
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          durationMs: result.durationMs || 0,
        } : undefined,
      },
    }));
  }, []);

  if (!executions || executions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mt-2">
      <AnimatePresence>
        {executions.map((exec, index) => {
          const state = executionStates[index] || { status: 'pending' };
          const instanceId = `${messageId}-exec-${index}`;

          return (
            <motion.div
              key={instanceId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ delay: index * 0.1 }}
            >
              <MiniTerminal
                instanceId={instanceId}
                projectPath={exec.projectPath}
                projectId={exec.projectId}
                requirementName={exec.requirementName}
                autoStart={exec.autoStart}
                onStart={() => handleStart(index)}
                onComplete={(success, result) => handleComplete(index, success, result)}
                defaultCollapsed={false}
                className="border-cyan-500/20"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact summary for multiple completed executions
 */
export function ExecutionSummary({
  executions,
  states,
}: {
  executions: CLIExecutionInfo[];
  states: Record<string, ExecutionState>;
}) {
  const completed = Object.values(states).filter(s => s.status === 'completed').length;
  const failed = Object.values(states).filter(s => s.status === 'failed').length;
  const total = executions.length;

  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
      <Terminal className="w-3 h-3" />
      <span>
        {completed + failed} / {total} executions
      </span>
      {completed > 0 && (
        <span className="flex items-center gap-0.5 text-green-400">
          <CheckCircle className="w-2.5 h-2.5" />
          {completed}
        </span>
      )}
      {failed > 0 && (
        <span className="flex items-center gap-0.5 text-red-400">
          <XCircle className="w-2.5 h-2.5" />
          {failed}
        </span>
      )}
    </div>
  );
}
