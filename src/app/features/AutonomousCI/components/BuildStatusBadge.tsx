'use client';

import React from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Ban,
  SkipForward,
} from 'lucide-react';
import type { BuildStatus } from '@/app/db/models/autonomous-ci.types';
import { getStatusColors } from '../lib/ciHelpers';

interface BuildStatusBadgeProps {
  status: BuildStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function BuildStatusBadge({
  status,
  size = 'md',
  showLabel = true,
}: BuildStatusBadgeProps) {
  const colors = getStatusColors(status);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const getIcon = () => {
    const className = `${iconSizes[size]} ${colors.icon}`;
    switch (status) {
      case 'success':
        return <CheckCircle className={className} />;
      case 'failure':
        return <XCircle className={className} />;
      case 'running':
        return <Loader2 className={`${className} animate-spin`} />;
      case 'pending':
        return <Clock className={className} />;
      case 'cancelled':
        return <Ban className={className} />;
      case 'skipped':
        return <SkipForward className={className} />;
      default:
        return <Clock className={className} />;
    }
  };

  const getLabel = () => {
    const labels: Record<BuildStatus, string> = {
      success: 'Success',
      failure: 'Failed',
      running: 'Running',
      pending: 'Pending',
      cancelled: 'Cancelled',
      skipped: 'Skipped',
    };
    return labels[status] || status;
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colors.bg} ${colors.text} border ${colors.border} ${sizeClasses[size]}`}
      data-testid={`build-status-badge-${status}`}
    >
      {getIcon()}
      {showLabel && <span>{getLabel()}</span>}
    </span>
  );
}
