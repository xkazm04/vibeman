/**
 * QualityGateChecklist — Displays quality gate pass/fail results
 *
 * Shows each configured quality gate as a checklist item with
 * green/red indicators. Required gates that fail are highlighted.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldX, ShieldAlert, CheckCircle2, XCircle, MinusCircle, Clock,
} from 'lucide-react';
import { errorSurface } from '@/lib/design-tokens';
import type { QualityGateResult } from '../lib/v3/types';

interface QualityGateChecklistProps {
  results: QualityGateResult[];
  compact?: boolean;
}

export default function QualityGateChecklist({ results, compact }: QualityGateChecklistProps) {
  if (results.length === 0) return null;

  const allPassed = results.every(g => g.passed);
  const requiredFailed = results.filter(g => g.required && !g.passed);
  const totalPassed = results.filter(g => g.passed).length;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/60">
        {allPassed ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        ) : requiredFailed.length > 0 ? (
          <ShieldX className="w-4 h-4 text-red-400" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-amber-400" />
        )}
        <span className="text-xs font-medium text-gray-300">Quality Gates</span>
        <span className={`ml-auto text-2xs font-mono px-1.5 py-0.5 rounded ${
          allPassed
            ? 'text-emerald-400 bg-emerald-500/10'
            : requiredFailed.length > 0
              ? 'text-red-400 bg-red-500/10'
              : 'text-amber-400 bg-amber-500/10'
        }`}>
          {totalPassed}/{results.length} passed
        </span>
      </div>

      {/* Gate list */}
      <div className={compact ? 'px-2 py-1.5 space-y-1' : 'px-3 py-2 space-y-1.5'}>
        <AnimatePresence mode="popLayout">
          {results.map((gate, i) => (
            <GateRow key={`${gate.type}-${i}`} gate={gate} compact={compact} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer — healing warning */}
      {requiredFailed.length > 0 && (
        <div className={`px-3 py-2 border-t border-gray-800/60 ${errorSurface.bg}`}>
          <p className={`text-2xs ${errorSurface.text}`}>
            {requiredFailed.length} required gate{requiredFailed.length > 1 ? 's' : ''} failed — triggering self-healing cycle
          </p>
        </div>
      )}
    </div>
  );
}

function GateRow({ gate, compact, index }: { gate: QualityGateResult; compact?: boolean; index: number }) {
  const StatusIcon = gate.passed ? CheckCircle2 : gate.required ? XCircle : MinusCircle;
  const iconColor = gate.passed
    ? 'text-emerald-400'
    : gate.required
      ? 'text-red-400'
      : 'text-amber-400';

  const bgClass = gate.passed
    ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
    : gate.required
      ? 'bg-red-500/5 hover:bg-red-500/10'
      : 'bg-amber-500/5 hover:bg-amber-500/10';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors ${bgClass}`}
    >
      <StatusIcon className={`w-3.5 h-3.5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-caption text-gray-200 font-medium">{gate.label}</span>
          {gate.required && (
            <span className="text-2xs text-gray-500 bg-gray-800 px-1 py-0.5 rounded">required</span>
          )}
          {gate.durationMs > 0 && (
            <span className="text-2xs text-gray-600 flex items-center gap-0.5 ml-auto">
              <Clock className="w-2.5 h-2.5" />
              {gate.durationMs > 1000 ? `${(gate.durationMs / 1000).toFixed(1)}s` : `${gate.durationMs}ms`}
            </span>
          )}
        </div>
        {!compact && gate.message && (
          <p className="text-2xs text-gray-500 mt-0.5 truncate">{gate.message}</p>
        )}
      </div>
    </motion.div>
  );
}
