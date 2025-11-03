/**
 * Monitor Utilities
 * Helper functions for monitoring operations
 */

import { MonitorCall, MonitorMessage } from './monitorTypes';

/**
 * Generate unique ID with a given prefix
 */
function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique ID for call
 */
export function generateCallId(): string {
  return generateUniqueId('call');
}

/**
 * Generate unique ID for message
 */
export function generateMessageId(): string {
  return generateUniqueId('msg');
}

/**
 * Generate unique ID for pattern
 */
export function generatePatternId(): string {
  return generateUniqueId('pattern');
}

/**
 * Calculate call duration in milliseconds
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return end - start;
}

/**
 * Format duration for display
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: MonitorCall['status']): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'completed':
      return {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/30',
        dot: 'bg-green-400'
      };
    case 'failed':
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/30',
        dot: 'bg-red-400'
      };
    case 'abandoned':
      return {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        dot: 'bg-yellow-400'
      };
    case 'active':
    default:
      return {
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30',
        dot: 'bg-cyan-400'
      };
  }
}

/**
 * Get role color for message UI
 */
export function getRoleColor(role: MonitorMessage['role']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (role) {
    case 'user':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30'
      };
    case 'assistant':
      return {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/30'
      };
    case 'system':
    default:
      return {
        bg: 'bg-gray-500/10',
        text: 'text-gray-400',
        border: 'border-gray-500/30'
      };
  }
}

/**
 * Truncate text for display
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format time only
 */
export function formatTimeOnly(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Check if monitoring is enabled in localStorage
 */
export function isMonitoringEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('voicebot_monitoring_enabled') === 'true';
  } catch {
    return false;
  }
}

/**
 * Set monitoring enabled state in localStorage
 */
export function setMonitoringEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('voicebot_monitoring_enabled', enabled.toString());
  } catch (error) {
    // Silently fail - localStorage errors are not critical for monitoring preference
  }
}
