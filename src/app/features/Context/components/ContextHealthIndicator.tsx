'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import type { Context } from '@/stores/contextStore';

type HealthLevel = 'healthy' | 'warning' | 'critical' | 'unknown';

interface ContextHealthIndicatorProps {
  context: Context;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Analyzes context health based on:
 * - File count (too few = warning, none = critical)
 * - Description presence
 * - Preview image presence
 * - Test scenarios presence
 */
function analyzeHealth(context: Context): { level: HealthLevel; issues: string[] } {
  const issues: string[] = [];

  const filePaths = context.filePaths || [];
  const hasDescription = context.description && context.description.trim().length > 0;
  const hasPreview = context.preview && context.preview.trim().length > 0;

  // File count check
  if (filePaths.length === 0) {
    issues.push('No files assigned');
  } else if (filePaths.length < 2) {
    issues.push('Only one file - consider adding more');
  }

  // Description check
  if (!hasDescription) {
    issues.push('Missing description');
  }

  // Determine health level
  if (filePaths.length === 0) {
    return { level: 'critical', issues };
  }
  if (issues.length > 1) {
    return { level: 'warning', issues };
  }
  if (issues.length > 0) {
    return { level: 'warning', issues };
  }
  return { level: 'healthy', issues };
}

const healthConfig: Record<HealthLevel, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    label: 'Healthy',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    label: 'Needs Attention',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'Critical',
  },
  unknown: {
    icon: HelpCircle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    label: 'Unknown',
  },
};

export function ContextHealthIndicator({
  context,
  showLabel = false,
  size = 'sm',
  className = '',
}: ContextHealthIndicatorProps) {
  const { level, issues } = analyzeHealth(context);
  const config = healthConfig[level];
  const Icon = config.icon;

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const containerSize = size === 'sm' ? 'p-1' : 'p-1.5';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={issues.length > 0 ? issues.join('\n') : 'Context is healthy'}
    >
      <div className={`${containerSize} rounded-full ${config.bgColor}`}>
        <Icon className={`${iconSize} ${config.color}`} />
      </div>
      {showLabel && (
        <span className={`text-xs ${config.color}`}>{config.label}</span>
      )}
    </motion.div>
  );
}

/**
 * Compact health dot for use in tight spaces
 */
export function ContextHealthDot({
  context,
  className = '',
}: {
  context: Context;
  className?: string;
}) {
  const { level, issues } = analyzeHealth(context);

  const dotColors: Record<HealthLevel, string> = {
    healthy: 'bg-green-400',
    warning: 'bg-yellow-400',
    critical: 'bg-red-400',
    unknown: 'bg-gray-400',
  };

  return (
    <motion.div
      className={`w-2 h-2 rounded-full ${dotColors[level]} ${className}`}
      title={issues.length > 0 ? issues.join('\n') : 'Healthy'}
      animate={level === 'critical' ? { scale: [1, 1.2, 1] } : undefined}
      transition={level === 'critical' ? { duration: 1.5, repeat: Infinity } : undefined}
    />
  );
}

export default ContextHealthIndicator;
