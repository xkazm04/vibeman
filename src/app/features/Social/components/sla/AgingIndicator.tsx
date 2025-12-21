'use client';

import { ReactNode } from 'react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';
import { useSLA } from '../../hooks/useSLA';
import type { SLAStatus } from '../../lib/types/slaTypes';

interface AgingIndicatorProps {
  item: FeedbackItem;
  children: ReactNode;
}

// Gradient colors based on aging status
const AGING_GRADIENTS: Record<SLAStatus, string> = {
  ok: '',
  warning: 'ring-1 ring-yellow-500/20',
  critical: 'ring-1 ring-orange-500/30 shadow-orange-500/10 shadow-lg',
  overdue: 'ring-2 ring-red-500/40 shadow-red-500/20 shadow-lg',
};

const AGING_BACKGROUNDS: Record<SLAStatus, string> = {
  ok: '',
  warning: 'bg-gradient-to-r from-yellow-500/5 to-transparent',
  critical: 'bg-gradient-to-r from-orange-500/10 to-transparent',
  overdue: 'bg-gradient-to-r from-red-500/10 to-transparent',
};

export function AgingIndicator({ item, children }: AgingIndicatorProps) {
  const slaInfo = useSLA(item);

  // No styling for done items or ok status
  if (item.status === 'done' || slaInfo.status === 'ok') {
    return <>{children}</>;
  }

  return (
    <div className={`relative rounded-lg ${AGING_GRADIENTS[slaInfo.status]}`}>
      {/* Aging background overlay */}
      <div
        className={`absolute inset-0 rounded-lg pointer-events-none ${AGING_BACKGROUNDS[slaInfo.status]}`}
      />
      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}

// Simplified border-only version for cards
export function AgingBorder({ item, children }: AgingIndicatorProps) {
  const slaInfo = useSLA(item);

  if (item.status === 'done' || slaInfo.status === 'ok') {
    return <>{children}</>;
  }

  const borderColors: Record<SLAStatus, string> = {
    ok: '',
    warning: 'border-l-2 border-l-yellow-500/50',
    critical: 'border-l-2 border-l-orange-500/70',
    overdue: 'border-l-2 border-l-red-500',
  };

  return (
    <div className={`${borderColors[slaInfo.status]}`}>
      {children}
    </div>
  );
}

export default AgingIndicator;
