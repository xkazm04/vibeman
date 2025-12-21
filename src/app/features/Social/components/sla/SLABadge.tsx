'use client';

import { Clock, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import { useSLA } from '../../hooks/useSLA';
import { SLA_STATUS_COLORS } from '../../lib/config/slaConfig';

interface SLABadgeProps {
  item: FeedbackItem;
  compact?: boolean;
  showTooltip?: boolean;
}

const STATUS_ICONS = {
  ok: Clock,
  warning: AlertTriangle,
  critical: AlertCircle,
  overdue: XCircle,
};

export function SLABadge({ item, compact = false, showTooltip = true }: SLABadgeProps) {
  const slaInfo = useSLA(item);

  // Don't show for done items
  if (item.status === 'done') return null;

  const Icon = STATUS_ICONS[slaInfo.status];
  const colors = SLA_STATUS_COLORS[slaInfo.status];
  const isPulsing = slaInfo.status === 'critical' || slaInfo.status === 'overdue';

  if (compact) {
    return (
      <motion.div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium
          ${colors.bg} ${colors.text} ${colors.border} border`}
        animate={isPulsing ? { opacity: [1, 0.6, 1] } : undefined}
        transition={isPulsing ? { duration: 1.5, repeat: Infinity } : undefined}
        title={showTooltip ? `${slaInfo.formattedRemaining} remaining` : undefined}
      >
        <Icon className="w-3 h-3" />
        <span>{slaInfo.formattedRemaining}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
        ${colors.bg} ${colors.text} ${colors.border} border`}
      animate={isPulsing ? { opacity: [1, 0.6, 1] } : undefined}
      transition={isPulsing ? { duration: 1.5, repeat: Infinity } : undefined}
    >
      <Icon className="w-3.5 h-3.5" />
      <div className="flex flex-col leading-tight">
        <span className="font-semibold">
          {slaInfo.status === 'overdue' ? 'Overdue' : slaInfo.formattedRemaining}
        </span>
        {showTooltip && slaInfo.status !== 'overdue' && (
          <span className="opacity-70 text-[10px]">remaining</span>
        )}
      </div>
    </motion.div>
  );
}

export default SLABadge;
