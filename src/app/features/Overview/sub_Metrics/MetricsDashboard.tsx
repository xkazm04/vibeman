'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import ProjectHealthCard from './components/ProjectHealthCard';
import DORAMetricsPanel from './components/DORAMetricsPanel';
import type { HealthSnapshot } from '@/lib/metrics/projectHealthEngine';
import type { DORASnapshot, DORATrendPoint } from '@/lib/metrics/doraMetricsEngine';

async function fetchHealth(projectId: string): Promise<HealthSnapshot | null> {
  const res = await fetch(`/api/project-health?projectId=${projectId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

async function recalculateHealth(projectId: string): Promise<HealthSnapshot> {
  const res = await fetch('/api/project-health', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });
  const json = await res.json();
  return json.data;
}

async function fetchDORA(projectId: string): Promise<{ current: DORASnapshot; trend: DORATrendPoint[] }> {
  const res = await fetch(`/api/metrics/dora?projectId=${projectId}&days=30`);
  if (!res.ok) return { current: null as unknown as DORASnapshot, trend: [] };
  const json = await res.json();
  return json.data;
}

export default function MetricsDashboard() {
  const { activeProject } = useClientProjectStore();
  const projectId = activeProject?.id ?? null;
  const queryClient = useQueryClient();
  const [days] = useState(30);

  const healthQuery = useQuery({
    queryKey: ['project-health', projectId],
    queryFn: () => fetchHealth(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const doraQuery = useQuery({
    queryKey: ['dora-metrics', projectId, days],
    queryFn: () => fetchDORA(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const recalcMutation = useMutation({
    mutationFn: () => recalculateHealth(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-health', projectId] });
    },
  });

  const handleRecalculate = useCallback(() => {
    if (projectId) recalcMutation.mutate();
  }, [projectId, recalcMutation]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Select a project to view metrics
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto p-6 space-y-6">
      {/* Section: Health Score */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          Project Health Score
        </h3>
        <div className="max-w-sm">
          <ProjectHealthCard
            snapshot={healthQuery.data ?? null}
            isLoading={healthQuery.isLoading}
            onRecalculate={handleRecalculate}
          />
        </div>
      </div>

      {/* Section: DORA Metrics */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          DORA Engineering Metrics
          <span className="text-[10px] text-zinc-500 ml-1">Last {days} days</span>
        </h3>
        <DORAMetricsPanel
          snapshot={doraQuery.data?.current ?? null}
          trend={doraQuery.data?.trend ?? []}
          isLoading={doraQuery.isLoading}
        />
      </div>
    </div>
  );
}
