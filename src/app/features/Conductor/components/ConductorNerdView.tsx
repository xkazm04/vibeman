/**
 * ConductorNerdView — Stripped-down, animation-free pipeline monitor
 *
 * Zero Framer Motion. Zero gradients/glows/particles. Pure monospace text.
 * Designed to spare resources while providing full pipeline visibility.
 * Toggled via nerd mode button in PipelineControls.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useConductorStore } from '../lib/conductorStore';
import { PIPELINE_STAGES } from '../lib/types';
import type { StageState, ProcessLogEntry, PipelineMetrics, ExecutionTaskState } from '../lib/types';

function stageLabel(state: StageState): string {
  switch (state.status) {
    case 'completed': return 'DONE';
    case 'running': return ' RUN';
    case 'failed': return 'FAIL';
    case 'skipped': return 'SKIP';
    case 'pending': return '----';
    default: return '????';
  }
}

function stageClass(state: StageState): string {
  switch (state.status) {
    case 'completed': return 'border-emerald-600/50 text-emerald-400';
    case 'running': return 'border-cyan-500 text-cyan-400 bg-cyan-500/10';
    case 'failed': return 'border-red-600/50 text-red-400';
    case 'skipped': return 'border-gray-700 text-gray-600';
    default: return 'border-gray-700 text-gray-500';
  }
}

function formatMetrics(m: PipelineMetrics): string {
  const parts = [
    `ideas=${m.ideasGenerated}`,
    `accept=${m.ideasAccepted}`,
    `reject=${m.ideasRejected}`,
    `tasks=${m.tasksCreated}`,
    `done=${m.tasksCompleted}`,
    `fail=${m.tasksFailed}`,
    `healed=${m.healingPatchesApplied}`,
  ];
  const seconds = Math.round(m.totalDurationMs / 1000);
  parts.push(`time=${seconds}s`);
  if (m.estimatedCost > 0) parts.push(`cost=$${m.estimatedCost.toFixed(2)}`);
  return parts.join('  ');
}

function formatTs(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function eventClass(event: ProcessLogEntry['event']): string {
  switch (event) {
    case 'completed': return 'text-emerald-400';
    case 'started': return 'text-cyan-400';
    case 'failed': return 'text-red-400';
    case 'skipped': return 'text-gray-600';
    case 'info': return 'text-blue-400';
    default: return 'text-gray-400';
  }
}

interface ConductorNerdViewProps {
  projectId: string;
}

export default function ConductorNerdView({ projectId }: ConductorNerdViewProps) {
  const { currentRun, isRunning, isPaused, processLog } = useConductorStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const status = currentRun?.status ?? 'idle';
  const cycle = currentRun?.cycle ?? 0;
  const maxCycles = currentRun?.config?.maxCyclesPerRun ?? 0;

  // Extract per-task execution data
  const executionTasks: ExecutionTaskState[] =
    currentRun?.stages?.execute?.details?.executionTasks &&
    Array.isArray(currentRun.stages.execute.details.executionTasks)
      ? (currentRun.stages.execute.details.executionTasks as ExecutionTaskState[])
      : [];

  // Auto-scroll log
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [processLog.length, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  }, []);

  return (
    <div className="font-mono text-xs text-gray-300 space-y-3" data-testid="conductor-nerd-view">
      {/* Header */}
      <div className="text-sm text-gray-100 border-b border-gray-800 pb-2">
        CONDUCTOR :: {status.toUpperCase()}
        {isPaused && ' (PAUSED)'}
        {' :: '}cycle {cycle}/{maxCycles}
        {' :: '}project={projectId.slice(0, 8)}
      </div>

      {/* Stage status bar */}
      <div className="flex gap-1.5 flex-wrap">
        {PIPELINE_STAGES.map((stage) => {
          const state = currentRun?.stages[stage] ?? { status: 'pending', itemsIn: 0, itemsOut: 0 };
          return (
            <span
              key={stage}
              className={`px-2 py-1 border text-[11px] ${stageClass(state)}`}
            >
              {stage.toUpperCase().padEnd(7)} {stageLabel(state)}
              {(state.itemsIn > 0 || state.itemsOut > 0) && (
                <span className="text-gray-500 ml-1">{state.itemsIn}&gt;{state.itemsOut}</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Metrics */}
      {currentRun?.metrics && (
        <div className="text-gray-400 border-t border-gray-800 pt-2">
          {formatMetrics(currentRun.metrics)}
        </div>
      )}

      {/* Execution tasks (when execute stage has task data) */}
      {executionTasks.length > 0 && (
        <div className="border-t border-gray-800 pt-2">
          <div className="text-gray-500 mb-1">EXECUTE TASKS:</div>
          {executionTasks.map((task) => (
            <div key={task.requirementName} className="leading-5">
              <span className="text-gray-600">  </span>
              <span className={
                task.status === 'running' ? 'text-cyan-400' :
                task.status === 'completed' ? 'text-emerald-400' :
                task.status === 'failed' || task.status === 'aborted' ? 'text-red-400' :
                'text-gray-500'
              }>
                {task.status.toUpperCase().padEnd(9)}
              </span>
              <span className="text-gray-300">{task.requirementName.padEnd(20).slice(0, 20)}</span>
              {' '}
              <span className="text-gray-500">{task.provider}/{task.model}</span>
              {task.durationMs !== undefined && (
                <span className="text-gray-600"> ({Math.round(task.durationMs / 1000)}s)</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Process log */}
      <div className="border border-gray-800 bg-gray-950 relative">
        <div className="px-2 py-1 border-b border-gray-800 text-gray-500 flex items-center justify-between">
          <span>-- process log ({processLog.length} entries) --</span>
          {isRunning && <span className="text-emerald-500">[LIVE]</span>}
        </div>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[400px] overflow-y-auto p-2 space-y-0"
        >
          {processLog.length === 0 ? (
            <div className="text-gray-600 py-4 text-center">awaiting pipeline start...</div>
          ) : (
            processLog.map((entry) => (
              <div
                key={entry.id}
                className={`leading-5 ${entry.event === 'failed' ? 'bg-red-950/20' : ''}`}
              >
                <span className="text-gray-600">{formatTs(entry.timestamp)}</span>
                {' '}
                <span className="text-gray-500">[{entry.stage.toUpperCase().padEnd(7)}]</span>
                {' '}
                <span className={eventClass(entry.event)}>
                  {entry.event.padEnd(9)}
                </span>
                {' '}
                <span className={entry.event === 'failed' ? 'text-red-300' : 'text-gray-300'}>
                  {entry.message}
                </span>
                {entry.durationMs !== undefined && (
                  <span className="text-gray-600"> ({Math.round(entry.durationMs / 1000)}s)</span>
                )}
                {entry.error && (
                  <div className="text-red-400/70 ml-[22ch] text-[10px]">{entry.error}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Scroll indicator */}
        {!autoScroll && processLog.length > 0 && (
          <button
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                setAutoScroll(true);
              }
            }}
            className="absolute bottom-1 right-2 text-[10px] text-gray-500 hover:text-gray-300 px-2 py-0.5 bg-gray-900 border border-gray-700"
          >
            scroll to bottom
          </button>
        )}
      </div>
    </div>
  );
}
