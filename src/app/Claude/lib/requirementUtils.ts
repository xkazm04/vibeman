/**
 * Utility functions for Claude Code requirements
 */

import { Requirement } from './requirementApi';
import { CheckCircle2, XCircle, Clock, Terminal, Loader2, AlertTriangle } from 'lucide-react';

/**
 * Get status icon component for a requirement
 */
export function getStatusIcon(status: Requirement['status']) {
  switch (status) {
    case 'running':
      return Loader2;
    case 'queued':
      return Clock;
    case 'completed':
      return CheckCircle2;
    case 'failed':
      return XCircle;
    case 'session-limit':
      return AlertTriangle;
    default:
      return Terminal;
  }
}

/**
 * Get status color classes for a requirement
 */
export function getStatusColor(status: Requirement['status']): string {
  switch (status) {
    case 'running':
      return 'border-blue-500/30 bg-blue-500/5';
    case 'queued':
      return 'border-amber-500/30 bg-amber-500/5';
    case 'completed':
      return 'border-green-500/30 bg-green-500/5';
    case 'failed':
      return 'border-red-500/30 bg-red-500/5';
    case 'session-limit':
      return 'border-orange-500/40 bg-orange-500/10';
    default:
      return 'border-gray-700/50 bg-gray-800/30';
  }
}

/**
 * Get status icon color classes
 */
export function getStatusIconColor(status: Requirement['status']): string {
  switch (status) {
    case 'running':
      return 'text-blue-400';
    case 'queued':
      return 'text-amber-400';
    case 'completed':
      return 'text-green-400';
    case 'failed':
      return 'text-red-400';
    case 'session-limit':
      return 'text-orange-400';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get button text based on status and queue state
 */
export function getRunButtonText(
  status: Requirement['status'],
  isAnyRunning: boolean
): string {
  if (status === 'queued') return 'Queued';
  if (isAnyRunning) return 'Queue';
  return 'Run';
}

/**
 * Get button title/tooltip
 */
export function getRunButtonTitle(
  status: Requirement['status'],
  isAnyRunning: boolean
): string {
  if (status === 'queued') return 'In queue';
  if (isAnyRunning) return 'Add to queue';
  return 'Run requirement';
}

/**
 * Check if requirement can be deleted
 */
export function canDeleteRequirement(status: Requirement['status']): boolean {
  return status !== 'running' && status !== 'queued';
}

/**
 * Get delete button title
 */
export function getDeleteButtonTitle(status: Requirement['status']): string {
  if (status === 'queued') return 'Cannot delete queued items';
  return 'Delete requirement';
}
