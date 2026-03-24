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
} from 'lucide-react';
import { NoErrorsIllustration, HealingInProgressIllustration, RepairBotIllustration } from './ConductorEmptyStates';
import {
  PromptAmbiguityIcon, MissingContextIcon, RateLimitIcon,
  ToolFailureIcon, TimeoutIcon, PermissionErrorIcon,
  DependencyMissingIcon, InvalidOutputIcon, UnknownErrorIcon,
  type ErrorIconComponent,
} from './HealingIcons';
import { useConductorStore } from '../lib/conductorStore';
import type { ErrorType, HealingPatch, ErrorClassification } from '../lib/types';

// Full static class strings for Tailwind JIT compatibility (no dynamic interpolation)
const ERROR_TYPE_CONFIG: Record<ErrorType, {
  icon: ErrorIconComponent;
  label: string;
  iconClass: string;
  textClass: string;
  badgeBg: string;
}> = {
  prompt_ambiguity: { icon: PromptAmbiguityIcon, label: 'Prompt Ambiguity', iconClass: 'text-amber-400', textClass: 'text-amber-400', badgeBg: 'bg-amber-500/10' },
  missing_context: { icon: MissingContextIcon, label: 'Missing Context', iconClass: 'text-orange-400', textClass: 'text-orange-400', badgeBg: 'bg-orange-500/10' },
  rate_limit: { icon: RateLimitIcon, label: 'Rate Limit', iconClass: 'text-yellow-400', textClass: 'text-yellow-400', badgeBg: 'bg-yellow-500/10' },
  tool_failure: { icon: ToolFailureIcon, label: 'Tool Failure', iconClass: 'text-red-400', textClass: 'text-red-400', badgeBg: 'bg-red-500/10' },
  timeout: { icon: TimeoutIcon, label: 'Timeout', iconClass: 'text-purple-400', textClass: 'text-purple-400', badgeBg: 'bg-purple-500/10' },
  permission_error: { icon: PermissionErrorIcon, label: 'Permission Error', iconClass: 'text-red-400', textClass: 'text-red-400', badgeBg: 'bg-red-500/10' },
  dependency_missing: { icon: DependencyMissingIcon, label: 'Missing Dependency', iconClass: 'text-amber-400', textClass: 'text-amber-400', badgeBg: 'bg-amber-500/10' },
  invalid_output: { icon: InvalidOutputIcon, label: 'Invalid Output', iconClass: 'text-pink-400', textClass: 'text-pink-400', badgeBg: 'bg-pink-500/10' },
  unknown: { icon: UnknownErrorIcon, label: 'Unknown', iconClass: 'text-gray-400', textClass: 'text-gray-400', badgeBg: 'bg-gray-500/10' },
};

function ErrorSummaryRow({ classification }: { classification: ErrorClassification }) {
  const config = ERROR_TYPE_CONFIG[classification.errorType];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
      <Icon className={`w-3.5 h-3.5 ${config.iconClass} flex-shrink-0`} />
      <span className="text-caption text-gray-300 flex-1 truncate">{config.label}</span>
      <span className={`text-2xs font-mono font-bold ${config.textClass} px-1.5 py-0.5 rounded ${config.badgeBg}`}>
        x{classification.occurrenceCount}
      </span>
      <span className="text-2xs text-gray-500 capitalize">{classification.stage}</span>
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
        <span className="text-caption text-gray-300 flex-1 truncate">{patch.reason}</span>
        {patch.effectiveness !== undefined && (
          <span className={`text-2xs font-mono font-bold ${effectivenessColor}`}>
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
                <span className="text-2xs text-gray-500">Target</span>
                <div className="text-caption font-mono text-cyan-400 bg-gray-800/50 px-2 py-1 rounded">
                  {patch.targetType}:{patch.targetId}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-2xs text-gray-500">Error Pattern</span>
                <div className="text-caption text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                  {patch.errorPattern}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-2xs text-gray-500">Patch</span>
                <div className="text-caption text-emerald-300 bg-emerald-900/10 border border-emerald-800/30 px-2 py-1 rounded font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {patch.patchedValue}
                </div>
              </div>
              {!patch.reverted && (
                <button
                  onClick={() => onRevert(patch.id)}
                  className="text-2xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
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
          <span className="text-base font-semibold tracking-wide text-gray-300">Self-Healing</span>
          {activePatches.length > 0 && (
            <span className="text-2xs font-mono font-bold text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full">
              {activePatches.length} active
            </span>
          )}
        </div>
        <button
          onClick={() => updateConfig({ healingEnabled: !config.healingEnabled })}
          role="switch"
          aria-checked={config.healingEnabled}
          aria-label="Toggle self-healing auto-repair"
          className={`w-8 h-4 rounded-full transition-colors relative
            focus-visible:ring-2 focus-visible:ring-pink-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
            ${config.healingEnabled ? 'bg-pink-600' : 'bg-gray-700'}`}
          title={config.healingEnabled ? 'Auto-heal enabled' : 'Auto-heal disabled'}
        >
          <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
            config.healingEnabled ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {/* Repair-bot header — empathetic healing banner */}
        {activeErrors.length > 0 && config.healingEnabled && (
          <div className="flex flex-col items-center pt-4 pb-2 px-3">
            <RepairBotIllustration className="w-[160px] h-[60px]" />
            <p className="text-xs text-cyan-400/70 mt-1.5 font-medium">Repair bot is on it</p>
            <p className="text-2xs text-gray-500 mt-0.5">Self-healing is actively working to resolve issues</p>
          </div>
        )}

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
            <NoErrorsIllustration className="w-28 h-16 mb-2" />
            <p className="text-xs text-gray-500">No errors detected yet</p>
            <p className="text-2xs text-gray-600 mt-1">
              Errors will appear here as the pipeline runs
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
