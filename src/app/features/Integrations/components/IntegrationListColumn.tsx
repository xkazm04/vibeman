'use client';

/**
 * IntegrationListColumn
 * CompactList for displaying configured integrations
 */

import { useMemo } from 'react';
import CompactList, { CompactListItem } from '@/components/lists/CompactList';
import type { IntegrationProvider, IntegrationStatus, DbIntegration } from '@/app/db/models/integration.types';

// Parsed integration with JSON fields parsed
export interface ParsedIntegration extends Omit<DbIntegration, 'config' | 'enabled_events'> {
  config: Record<string, unknown>;
  enabled_events: string[];
}

// Provider configuration
export const PROVIDER_CONFIG: Record<IntegrationProvider, {
  label: string;
  icon: string;
  gradient: string;
  border: string;
  text: string;
}> = {
  github: {
    label: 'GitHub',
    icon: '🐙',
    gradient: 'from-gray-700/20 to-gray-800/20',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
  },
  gitlab: {
    label: 'GitLab',
    icon: '🦊',
    gradient: 'from-orange-700/20 to-orange-900/20',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
  },
  slack: {
    label: 'Slack',
    icon: '💬',
    gradient: 'from-purple-700/20 to-purple-900/20',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
  },
  discord: {
    label: 'Discord',
    icon: '🎮',
    gradient: 'from-indigo-700/20 to-indigo-900/20',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
  },
  webhook: {
    label: 'Webhook',
    icon: '🔗',
    gradient: 'from-blue-700/20 to-blue-900/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  jira: {
    label: 'Jira',
    icon: '📋',
    gradient: 'from-blue-600/20 to-blue-800/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  linear: {
    label: 'Linear',
    icon: '📐',
    gradient: 'from-violet-700/20 to-violet-900/20',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
  },
  notion: {
    label: 'Notion',
    icon: '📝',
    gradient: 'from-gray-600/20 to-gray-800/20',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
  },
  supabase: {
    label: 'Supabase',
    icon: '⚡',
    gradient: 'from-emerald-700/20 to-emerald-900/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  postgres: {
    label: 'PostgreSQL',
    icon: '🐘',
    gradient: 'from-blue-800/20 to-blue-950/20',
    border: 'border-blue-600/30',
    text: 'text-blue-400',
  },
};

// Status to CompactList status mapping
const STATUS_MAP: Record<IntegrationStatus, CompactListItem['status']> = {
  active: 'accepted',
  inactive: 'pending',
  error: 'rejected',
  pending: 'pending',
};

interface IntegrationListColumnProps {
  integrations: ParsedIntegration[];
  selectedIntegrationId: string | null;
  onSelect: (integration: ParsedIntegration) => void;
  onDelete: (integrationId: string) => void;
}

export function IntegrationListColumn({
  integrations,
  selectedIntegrationId,
  onSelect,
  onDelete,
}: IntegrationListColumnProps) {
  // Convert integrations to CompactListItem format
  const items: CompactListItem[] = useMemo(() => {
    return integrations.map((integration) => {
      const providerConfig = PROVIDER_CONFIG[integration.provider];
      const badges: CompactListItem['badges'] = [];

      // Add event count badge
      const eventCount = integration.enabled_events?.length || 0;
      if (eventCount > 0) {
        badges.push({
          label: `${eventCount} events`,
          color: 'text-gray-400',
        });
      }

      return {
        id: integration.id,
        title: integration.name,
        emoji: providerConfig?.icon || '🔌',
        status: selectedIntegrationId === integration.id
          ? 'accepted'
          : STATUS_MAP[integration.status] || 'pending',
        badges,
      };
    });
  }, [integrations, selectedIntegrationId]);

  // Handle item click
  const handleItemClick = (item: CompactListItem) => {
    const integration = integrations.find((i) => i.id === item.id);
    if (integration) {
      onSelect(integration);
    }
  };

  return (
    <CompactList
      title="Configured Integrations"
      items={items}
      onItemClick={handleItemClick}
      onItemDelete={onDelete}
      emptyMessage="No integrations configured"
      maxHeight="max-h-[320px]"
    />
  );
}
