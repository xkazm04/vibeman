/**
 * Evidence Panel
 * Bottom panel showing execution status, phases, and logs
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  RotateCcw,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Search,
  Cog,
  Sparkles,
  Shield,
  Check,
  X,
  StopCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { ScanEvidence, COLOR_PALETTE } from '../types';
import { useBlueprintComposerStore } from '../store/blueprintComposerStore';
import type { ExecutionState, ExecutionLog, ExecutionPhase } from '../lib/executionEngine';

interface EvidencePanelProps {
  onRunTest?: () => void;
  isRunning?: boolean;
  executionState?: ExecutionState | null;
  onDecisionAccept?: () => void;
  onDecisionReject?: () => void;
  onAbort?: () => void;
  useDecisionGate?: boolean;
  onToggleDecisionGate?: () => void;
}

// Phase display configuration
const PHASE_CONFIG: Record<ExecutionPhase, { label: string; icon: React.ReactNode; color: string }> = {
  idle: { label: 'Ready', icon: <Sparkles className="w-3 h-3" />, color: '#6b7280' },
  analyzer: { label: 'Analyzing', icon: <Search className="w-3 h-3" />, color: '#06b6d4' },
  processor: { label: 'Processing', icon: <Cog className="w-3 h-3" />, color: '#8b5cf6' },
  decision: { label: 'Awaiting Decision', icon: <Shield className="w-3 h-3" />, color: '#f59e0b' },
  executor: { label: 'Executing', icon: <Sparkles className="w-3 h-3" />, color: '#10b981' },
  completed: { label: 'Completed', icon: <CheckCircle className="w-3 h-3" />, color: '#22c55e' },
  failed: { label: 'Failed', icon: <XCircle className="w-3 h-3" />, color: '#ef4444' },
};

export default function EvidencePanel({
  onRunTest,
  isRunning,
  executionState,
  onDecisionAccept,
  onDecisionReject,
  onAbort,
  useDecisionGate = true,
  onToggleDecisionGate,
}: EvidencePanelProps) {
  const { evidence, savedBlueprints, clearEvidence } = useBlueprintComposerStore();
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionState?.logs, showLogs]);

  // Get color info for an evidence item
  const getColorMeta = (color: string) => {
    return COLOR_PALETTE.find((c) => c.value === color) || COLOR_PALETTE[0];
  };

  const currentPhase = executionState?.phase || 'idle';
  const phaseConfig = PHASE_CONFIG[currentPhase];
  const hasDecision = executionState?.pendingDecision;

  return (
    <div className="relative h-full flex flex-col">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Main Panel Content */}
      <div className="relative flex-1 flex items-center px-4 min-h-[64px]">
        {/* Left: Controls */}
        <div className="flex items-center gap-2 mr-4">
          {isRunning ? (
            <motion.button
              onClick={onAbort}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
            >
              <StopCircle className="w-3.5 h-3.5" />
              Abort
            </motion.button>
          ) : (
            <motion.button
              onClick={onRunTest}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
            >
              <Play className="w-3.5 h-3.5" />
              Test Run
            </motion.button>
          )}

          {/* Decision Gate Toggle */}
          <button
            onClick={onToggleDecisionGate}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              useDecisionGate
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-gray-800/50 text-gray-500 border border-gray-700/30'
            }`}
            title={useDecisionGate ? 'Decision Gate: ON - Will pause for approval before fixing' : 'Decision Gate: OFF - Will proceed without pause'}
          >
            {useDecisionGate ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            <Shield className="w-3 h-3" />
          </button>

          <button
            onClick={clearEvidence}
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-gray-800/50 transition-colors"
            title="Clear evidence"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-800 mr-4" />

        {/* Center: Phase Status & Progress */}
        <div className="flex-1 flex items-center gap-4">
          {/* Phase indicator */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border"
              style={{
                backgroundColor: `${phaseConfig.color}15`,
                borderColor: `${phaseConfig.color}40`,
              }}
            >
              <span style={{ color: phaseConfig.color }}>{phaseConfig.icon}</span>
              <span className="text-xs font-medium" style={{ color: phaseConfig.color }}>
                {phaseConfig.label}
              </span>
            </div>

            {/* Progress bar */}
            {isRunning && executionState && (
              <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: phaseConfig.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${executionState.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </div>

          {/* Decision Gate UI */}
          {hasDecision && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400">
                {executionState?.issues.length} issues found
              </span>
              <div className="flex gap-1.5 ml-2">
                <button
                  onClick={onDecisionAccept}
                  className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Accept
                </button>
                <button
                  onClick={onDecisionReject}
                  className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Reject
                </button>
              </div>
            </motion.div>
          )}

          {/* Evidence dots */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-gray-800">
            <AnimatePresence mode="popLayout">
              {evidence.length === 0 && !isRunning ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full bg-gray-800/50 border border-gray-700/50"
                      />
                    ))}
                  </div>
                  <span className="text-[10px]">Run tests to see evidence</span>
                </div>
              ) : (
                evidence.map((item, index) => {
                  const colorMeta = getColorMeta(item.color);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="relative group"
                    >
                      {/* Glow effect */}
                      <div
                        className="absolute inset-0 rounded-full blur-md opacity-40"
                        style={{ backgroundColor: colorMeta.glow }}
                      />

                      {/* Main dot */}
                      <motion.div
                        className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer"
                        style={{
                          backgroundColor: `${item.color}20`,
                          borderColor: item.color,
                        }}
                        whileHover={{ scale: 1.15 }}
                      >
                        {item.status === 'running' && (
                          <Loader2 className="w-3 h-3 animate-spin" style={{ color: item.color }} />
                        )}
                        {item.status === 'completed' && (
                          <CheckCircle className="w-3 h-3" style={{ color: item.color }} />
                        )}
                        {item.status === 'failed' && <XCircle className="w-3 h-3 text-red-400" />}
                        {item.status === 'pending' && (
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: item.color, opacity: 0.5 }}
                          />
                        )}
                      </motion.div>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-gray-800 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-gray-500">
                          {item.status === 'completed' && `${item.issueCount || 0} issues`}
                          {item.status === 'running' && `${item.progress}%`}
                          {item.status === 'failed' && 'Failed'}
                          {item.status === 'pending' && 'Pending'}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Log toggle & saved blueprints */}
        <div className="flex items-center gap-2 ml-4">
          {/* Log toggle */}
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              showLogs
                ? 'bg-gray-700 text-gray-300'
                : 'text-gray-600 hover:text-gray-400 hover:bg-gray-800/50'
            }`}
          >
            {showLogs ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            Logs
            {executionState?.logs && executionState.logs.length > 0 && (
              <span className="ml-1 px-1 bg-gray-800 rounded text-[10px]">
                {executionState.logs.length}
              </span>
            )}
          </button>

          <div className="w-px h-6 bg-gray-800" />

          {/* Saved blueprints */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-600 mr-1">Saved:</span>
            {savedBlueprints.slice(0, 4).map((bp) => (
              <div
                key={bp.id}
                className="w-3 h-3 rounded-full border"
                style={{
                  backgroundColor: `${bp.color}20`,
                  borderColor: bp.color,
                }}
                title={bp.name}
              />
            ))}
            {savedBlueprints.length > 4 && (
              <span className="text-[10px] text-gray-600">+{savedBlueprints.length - 4}</span>
            )}
            {savedBlueprints.length === 0 && (
              <span className="text-[10px] text-gray-700">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Logs Panel (expandable) */}
      <AnimatePresence>
        {showLogs && executionState?.logs && executionState.logs.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 120, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-800/50 overflow-hidden"
          >
            <div className="h-full overflow-y-auto bg-gray-950/50 p-2 font-mono text-[10px] scrollbar-thin scrollbar-thumb-gray-800">
              {executionState.logs.map((log, i) => (
                <LogEntry key={i} log={log} />
              ))}
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Log entry component
function LogEntry({ log }: { log: ExecutionLog }) {
  const levelColors = {
    debug: 'text-gray-500',
    info: 'text-cyan-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
  };

  const phaseColors: Record<string, string> = {
    idle: 'text-gray-500',
    analyzer: 'text-cyan-400',
    processor: 'text-violet-400',
    decision: 'text-amber-400',
    executor: 'text-green-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
  };

  const time = log.timestamp.toISOString().slice(11, 23);

  return (
    <div className="flex gap-2 py-0.5 hover:bg-gray-800/30">
      <span className="text-gray-600">{time}</span>
      <span className={`w-16 ${phaseColors[log.phase] || 'text-gray-500'}`}>[{log.phase}]</span>
      <span className={levelColors[log.level]}>{log.message}</span>
    </div>
  );
}
