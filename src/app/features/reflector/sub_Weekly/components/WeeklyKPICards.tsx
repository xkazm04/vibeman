'use client';

import React from 'react';
import { CheckCircle, Clock, Zap, Sparkles } from 'lucide-react';
import { WeeklyStats } from '../lib/types';
import { REFLECTOR_CHART_COLORS } from '../../lib/chartColors';
import ReflectorKPICard from '../../components/ReflectorKPICard';

interface WeeklyKPICardsProps {
  stats: WeeklyStats;
}

export default function WeeklyKPICards({ stats }: WeeklyKPICardsProps) {
  const { overall, comparison } = stats;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <ReflectorKPICard
        title="Total Ideas"
        value={overall.total}
        subtitle={`${comparison.lastWeekTotal} LAST_WEEK`}
        icon={Zap}
        accentColor={REFLECTOR_CHART_COLORS.generated}
        trend={{ value: comparison.changePercent, direction: comparison.trend }}
        delay={0}
      />

      <ReflectorKPICard
        title="Accepted"
        value={overall.accepted}
        subtitle={`${overall.acceptanceRate}% RATE`}
        icon={CheckCircle}
        accentColor={REFLECTOR_CHART_COLORS.accepted}
        delay={0.1}
      />

      <ReflectorKPICard
        title="Implemented"
        value={overall.implemented}
        subtitle="COMPLETED"
        icon={Sparkles}
        accentColor={REFLECTOR_CHART_COLORS.acceptance_rate}
        delay={0.2}
      />

      <ReflectorKPICard
        title="Pending"
        value={overall.pending}
        subtitle="AWAITING_REVIEW"
        icon={Clock}
        accentColor={REFLECTOR_CHART_COLORS.pending}
        delay={0.3}
      />
    </div>
  );
}
