/**
 * Consolidated integration display configuration
 * Single source of truth for provider icons, status styles, and event type mappings
 */

import type { IntegrationProvider, IntegrationStatus } from '@/app/db/models/integration.types';
import type { CompactListItem } from '@/components/lists/CompactList';

// Event status styles (used in EventsLog)
export const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  sent: { bg: 'bg-green-500/10', text: 'text-green-400' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400' },
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  skipped: { bg: 'bg-gray-500/10', text: 'text-gray-400' },
};

// Event type icons (used in EventsLog)
export const EVENT_TYPE_ICONS: Record<string, string> = {
  'goal.created': '\u{1F3AF}',
  'goal.updated': '\u270F\uFE0F',
  'goal.completed': '\u2705',
  'idea.generated': '\u{1F4A1}',
  'idea.accepted': '\u{1F44D}',
  'idea.rejected': '\u{1F44E}',
  'idea.implemented': '\u{1F680}',
  'scan.completed': '\u{1F50D}',
  'implementation.completed': '\u{1F6E0}\uFE0F',
  'context.updated': '\u{1F4C1}',
  'standup.generated': '\u{1F4CB}',
  'automation.started': '\u{1F916}',
  'automation.completed': '\u{1F389}',
  'automation.failed': '\u274C',
};

// Provider display configuration
export const PROVIDER_CONFIG: Record<IntegrationProvider, {
  label: string;
  icon: string;
  gradient: string;
  border: string;
  text: string;
}> = {
  github: {
    label: 'GitHub',
    icon: '\u{1F419}',
    gradient: 'from-gray-700/20 to-gray-800/20',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
  },
  gitlab: {
    label: 'GitLab',
    icon: '\u{1F98A}',
    gradient: 'from-orange-700/20 to-orange-900/20',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
  },
  slack: {
    label: 'Slack',
    icon: '\u{1F4AC}',
    gradient: 'from-purple-700/20 to-purple-900/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
  },
  discord: {
    label: 'Discord',
    icon: '\u{1F3AE}',
    gradient: 'from-indigo-700/20 to-indigo-900/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
  },
  webhook: {
    label: 'Webhook',
    icon: '\u{1F517}',
    gradient: 'from-blue-700/20 to-blue-900/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  jira: {
    label: 'Jira',
    icon: '\u{1F4CB}',
    gradient: 'from-blue-600/20 to-blue-800/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  linear: {
    label: 'Linear',
    icon: '\u{1F4D0}',
    gradient: 'from-violet-700/20 to-violet-900/20',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
  },
  notion: {
    label: 'Notion',
    icon: '\u{1F4DD}',
    gradient: 'from-gray-600/20 to-gray-800/20',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
  },
  supabase: {
    label: 'Supabase',
    icon: '\u26A1',
    gradient: 'from-emerald-700/20 to-emerald-900/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  postgres: {
    label: 'PostgreSQL',
    icon: '\u{1F418}',
    gradient: 'from-blue-800/20 to-blue-950/20',
    border: 'border-blue-600/30',
    text: 'text-blue-400',
  },
};

// Integration status to CompactList status mapping
export const STATUS_MAP: Record<IntegrationStatus, CompactListItem['status']> = {
  active: 'accepted',
  inactive: 'pending',
  error: 'rejected',
  pending: 'pending',
};
