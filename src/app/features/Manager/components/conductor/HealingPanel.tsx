/**
 * HealingPanel — Self-healing error/patch viewer
 *
 * Shows error classifications grouped by type, active healing patches
 * with effectiveness scores, and apply/revert controls.
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, AlertTriangle, CheckCircle2, Undo2, ChevronDown,
  ShieldAlert, FileQuestion, Timer, Bug, Lock, Package, FileWarning, HelpCircle,
} from 'lucide-react';
import { useConductorStore } from '../../lib/conductor/conductorStore';
import type { ErrorType, HealingPatch, ErrorClassification } from '../../lib/conductor/types';

const ERROR_TYPE_CONFIG: Record<ErrorType, { icon: typeof Bug; label: string; color: string }> = {
  prompt_ambiguity: { icon: FileQuestion, label: 'Prompt Ambiguity', color: 'amber' },
  missing_context: { icon: FileWarning, label: 'Missing Context', color: 'orange' },
  tool_failure: { icon: Bug, label: 'Tool Failure', color: 'red' },
  timeout: { icon: Timer, label: 'Timeout', color: 'purple' },
  permission_error: { icon: Lock, label: 'Permission Error', color: 'red' },
  dependency_missing: { icon: Package, label: 'Missing Dependency', color: 'amber' },
  invalid_output: { icon: ShieldAlert, label: 'Invalid Output', color: 'pink' },
  unknown: { icon: HelpCircle, label: 'Unknown', color: 'gray' },
};

function ErrorSummaryRow({ classification }: { classification: ErrorClassification }) {
  const config = ERROR_TYPE_CONFIG[classification.errorType];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
      <Icon className={`w-3.5 h-3.5 text-${config.color}-400 flex-shrink-0`} />
      <span className="text-[11px] text-gray-300 flex-1 truncate">{config.label}</span>
      <span className={`text-[10px] font-mono font-bold text-${config.color}-400 px-1.5 py-0.5 rounded bg-${config.color}-500/10`}>
        x{classification.occurrenceCount}
      </span>
      <span className="text-[10px] text-gray-500 capitalize">{classification.stage}</span>
    </div>
  );
}

function PatchCard({ patch, onRevert }: { patch: HealingPatch; onRevert: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const effectivenessColor = !patch.effectiveness
    ? 'text-gray-400'
    : patch.effectiveness >= 0.7
      ? 'text-emerald-400'
      : patch.effectiveness >= 0.4
        ? 'text-amber-400'
        : 'text-red-400';

  return (
    <div className="border border-gray-800/50 rounded-lg overflow-hidden bg-gray-900/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-gray-800/30 transition-colors"
      >
        {patch.reverted ? (
          <Undo2 className="w-3 h-3 text-gray-500 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        )}
        <span className="text-[11px] text-gray-300 flex-1 truncate">{patch.reason}</span>
        {patch.effectiveness !== undefined && (
          <span className={`text-[10px] font-mono font-bold ${effectivenessColor}`}>
            {Math.round(patch.effectiveness * 100)}%
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2.5 space-y-2">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500">Target</span>
                <div className="text-[11px] font-mono text-cyan-400 bg-gray-800/50 px-2 py-1 rounded">
                  {patch.targetType}:{patch.targetId}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500">Error Pattern</span>
                <div className="text-[11px] text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                  {patch.errorPattern}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500">Patch</span>
                <div className="text-[11px] text-emerald-300 bg-emerald-900/10 border border-emerald-800/30 px-2 py-1 rounded font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {patch.patchedValue}
                </div>
              </div>
              {!patch.reverted && (
                <button
                  onClick={() => onRevert(patch.id)}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <Undo2 className="w-3 h-3" />
                  Revert Patch
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HealingPanel() {
  const {
    healingPatches,
    errorClassifications,
    config,
    updateConfig,
    revertHealingPatch,
  } = useConductorStore();

  const activeErrors = errorClassifications.filter((e) => !e.resolved);
  const activePatches = healingPatches.filter((p) => !p.reverted);
  const revertedPatches = healingPatches.filter((p) => p.reverted);

  return (
    <motion.div
      className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      data-testid="healing-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-medium text-gray-300">Self-Healing</span>
          {activePatches.length > 0 && (
            <span className="text-[10px] font-mono font-bold text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full">
              {activePatches.length} active
            </span>
          )}
        </div>
        <button
          onClick={() => updateConfig({ healingEnabled: !config.healingEnabled })}
          className={`w-8 h-4 rounded-full transition-colors relative ${
            config.healingEnabled ? 'bg-pink-600' : 'bg-gray-700'
          }`}
          title={config.healingEnabled ? 'Auto-heal enabled' : 'Auto-heal disabled'}
        >
          <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
            config.healingEnabled ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {/* Error Classifications */}
        {activeErrors.length > 0 && (
          <div className="p-3 border-b border-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-gray-400">
                Error Patterns ({activeErrors.length})
              </span>
            </div>
            <div className="space-y-1">
              {activeErrors.map((err) => (
                <ErrorSummaryRow key={err.id} classification={err} />
              ))}
            </div>
          </div>
        )}

        {/* Active Patches */}
        {activePatches.length > 0 && (
          <div className="p-3 border-b border-gray-800/50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-gray-400">
                Active Patches ({activePatches.length})
              </span>
            </div>
            <div className="space-y-2">
              {activePatches.map((patch) => (
                <PatchCard key={patch.id} patch={patch} onRevert={revertHealingPatch} />
              ))}
            </div>
          </div>
        )}

        {/* Reverted Patches */}
        {revertedPatches.length > 0 && (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Undo2 className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-500">
                Reverted ({revertedPatches.length})
              </span>
            </div>
            <div className="space-y-2 opacity-50">
              {revertedPatches.slice(0, 3).map((patch) => (
                <PatchCard key={patch.id} patch={patch} onRevert={() => {}} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeErrors.length === 0 && healingPatches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wrench className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-xs text-gray-500">No errors detected yet</p>
            <p className="text-[10px] text-gray-600 mt-1">
              Errors will appear here as the pipeline runs
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
