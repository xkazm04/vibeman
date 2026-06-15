/**
 * StatusBadge — Multi-severity status badge with pulsing animation for
 * critical/overdue states and a compact icon-only variant.
 *
 * Salvaged from the (deleted) Social module's SLABadge atom and promoted into
 * the shared design system. Useful for scan-queue states, build-fixer, debt
 * health, task status, and any status-severity surface.
 */

'use client';

import { motion } from 'framer-motion';
import { Check, AlertTriangle, X, type LucideIcon } from 'lucide-react';

export type StatusBadgeStatus = 'ok' | 'warning' | 'critical' | 'overdue';

export interface StatusBadgeProps {
  /** Severity of the status. */
  status: StatusBadgeStatus;
  /** Icon-only pill variant. */
  compact?: boolean;
  /** Override the badge label (defaults to the upper-cased status). */
  label?: string;
  /** Optional trailing meta text shown after the label (full variant only). */
  meta?: string;
  /** Optional extra class names applied to the root element. */
  className?: string;
}

interface StatusStyle {
  bg: string;
  text: string;
  icon: LucideIcon;
}

const STATUS_STYLES: Record<StatusBadgeStatus, StatusStyle> = {
  ok: { bg: 'bg-green-500/20', text: 'text-green-400', icon: Check },
  warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
  critical: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: AlertTriangle },
  overdue: { bg: 'bg-red-500/20', text: 'text-red-400', icon: X },
};

export function StatusBadge({ status, compact = false, label, meta, className = '' }: StatusBadgeProps) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.ok;
  const Icon = s.icon;
  const isUrgent = status === 'critical' || status === 'overdue';

  if (compact) {
    return (
      <motion.div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${s.bg} ${className}`}
        animate={isUrgent ? { opacity: [1, 0.7, 1] } : {}}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        <Icon className={`w-3 h-3 ${s.text}`} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg} border border-gray-700/30 ${className}`}
      animate={isUrgent ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <Icon className={`w-4 h-4 ${s.text}`} />
      <span className={`text-sm font-medium ${s.text}`}>{label ?? status.toUpperCase()}</span>
      {meta && <span className="text-xs text-gray-500">{meta}</span>}
    </motion.div>
  );
}

export default StatusBadge;
