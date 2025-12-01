/**
 * ManagerSystemMap Component
 * Wrapper for SystemMap that calculates change counts per context group
 * and displays them on the map nodes
 */

'use client';

import { useMemo } from 'react';
import SystemMap from '@/app/features/Docs/sub_DocsAnalysis/components/SystemMap';
import type { ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';

// Extended log type with context_group_id
export interface EnrichedLogWithGroup {
  id: string;
  project_id: string;
  project_name: string | null;
  context_id: string | null;
  context_name: string | null;
  context_group_id?: string | null;
  requirement_name: string;
  title: string;
  overview: string;
  overview_bullets: string | null;
  tested: number;
  screenshot: string | null;
  created_at: string;
}

interface ManagerSystemMapProps {
  logs: EnrichedLogWithGroup[];
  contextGroups: ContextGroup[];
  relationships: ContextGroupRelationship[];
  selectedGroupId: string | null;
  onGroupClick: (groupId: string) => void;
}

export default function ManagerSystemMap({
  logs,
  contextGroups,
  relationships,
  selectedGroupId,
  onGroupClick,
}: ManagerSystemMapProps) {
  // Calculate changes per context group
  const changeCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};

    // Initialize counts for all groups
    contextGroups.forEach(group => {
      counts[group.id] = 0;
    });

    // Count logs per group
    logs.forEach(log => {
      if (log.context_group_id) {
        counts[log.context_group_id] = (counts[log.context_group_id] || 0) + 1;
      }
    });

    return counts;
  }, [logs, contextGroups]);

  // Handle empty state
  if (contextGroups.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center bg-gray-900/50 rounded-xl border border-gray-800"
        data-testid="manager-systemmap-empty"
      >
        <div className="text-center p-6">
          <p className="text-gray-400 text-sm">No context groups available</p>
          <p className="text-gray-500 text-xs mt-1">
            Create context groups to see the system map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full" data-testid="manager-systemmap">
      <SystemMap
        groups={contextGroups}
        relationships={relationships}
        moduleCountData={changeCountByGroup}
        selectedModuleId={selectedGroupId}
        onModuleSelect={onGroupClick}
      />
    </div>
  );
}
