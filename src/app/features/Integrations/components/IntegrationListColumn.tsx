'use client';

/**
 * IntegrationListColumn
 * CompactList for displaying configured integrations
 */

import { useMemo } from 'react';
import CompactList, { CompactListItem } from '@/components/lists/CompactList';
import type { DbIntegration } from '@/app/db/models/integration.types';
import { PROVIDER_CONFIG, STATUS_MAP } from '@/lib/integrations/displayConfig';

// Parsed integration with JSON fields parsed
export interface ParsedIntegration extends Omit<DbIntegration, 'config' | 'enabled_events'> {
  config: Record<string, unknown>;
  enabled_events: string[];
}

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
