'use client';

import React from 'react';
import { Activity, Clock, AlertTriangle, Layers } from 'lucide-react';
import ReflectorKPICard from '../../components/ReflectorKPICard';

interface ObsKPICardsProps {
  totalCalls: number;
  uniqueEndpoints: number;
  avgResponseTimeMs: number;
  errorRate: number;
}

export default function ObsKPICards({
  totalCalls,
  uniqueEndpoints,
  avgResponseTimeMs,
  errorRate
}: ObsKPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ReflectorKPICard
        title="Total API Calls"
        value={totalCalls.toLocaleString()}
        icon={Activity}
        accentColor="#22d3ee"
        delay={0}
      />
      <ReflectorKPICard
        title="Unique Endpoints"
        value={uniqueEndpoints}
        icon={Layers}
        accentColor="#c084fc"
        delay={0.1}
      />
      <ReflectorKPICard
        title="Avg Response Time"
        value={`${avgResponseTimeMs.toFixed(0)}ms`}
        icon={Clock}
        accentColor="#fbbf24"
        delay={0.2}
      />
      <ReflectorKPICard
        title="Error Rate"
        value={`${errorRate.toFixed(1)}%`}
        icon={AlertTriangle}
        accentColor={errorRate > 5 ? '#f87171' : '#4ade80'}
        delay={0.3}
      />
    </div>
  );
}
