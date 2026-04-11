'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, Clock, AlertTriangle, Wrench } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { DORASnapshot, DORATrendPoint, DORARating } from '@/lib/metrics/doraMetricsEngine';

interface DORAMetricsPanelProps {
  snapshot: DORASnapshot | null;
  trend: DORATrendPoint[];
  isLoading: boolean;
}

const RATING_COLORS: Record<DORARating, { bg: string; text: string; border: string }> = {
  elite:  { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  high:   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low:    { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

const METRIC_META = [
  { key: 'deploymentFrequency' as const, label: 'Deploy Frequency', icon: Rocket, color: '#a855f7' },
  { key: 'leadTime' as const, label: 'Lead Time', icon: Clock, color: '#06b6d4' },
  { key: 'changeFailureRate' as const, label: 'Failure Rate', icon: AlertTriangle, color: '#f59e0b' },
  { key: 'meanTimeToRecovery' as const, label: 'MTTR', icon: Wrench, color: '#22c55e' },
];

function MetricCard({ metric, meta, delay }: {
  metric: DORASnapshot[keyof Pick<DORASnapshot, 'deploymentFrequency' | 'leadTime' | 'changeFailureRate' | 'meanTimeToRecovery'>];
  meta: typeof METRIC_META[number];
  delay: number;
}) {
  const ratingStyle = RATING_COLORS[metric.rating];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`rounded-xl border ${ratingStyle.border} bg-zinc-900/80 p-4 relative overflow-hidden`}
    >
      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-600/50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-600/50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-600/50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-600/50" />

      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${ratingStyle.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${ratingStyle.text}`} />
        </div>
        <span className="text-xs text-zinc-400">{meta.label}</span>
      </div>

      <div className="flex items-end gap-2 mb-1">
        <span className="text-2xl font-bold text-white tabular-nums">{metric.value}</span>
        <span className="text-xs text-zinc-500 mb-0.5">{metric.unit}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ratingStyle.bg} ${ratingStyle.text} uppercase`}>
          {metric.rating}
        </span>
        <span className="text-[10px] text-zinc-500">{metric.label}</span>
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <div className="text-zinc-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-zinc-200">
          {p.name}: <span className="font-medium">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function DORAMetricsPanel({ snapshot, trend, isLoading }: DORAMetricsPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 animate-pulse">
              <div className="h-3 w-20 bg-zinc-800 rounded mb-3" />
              <div className="h-8 w-16 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-8 text-center">
        <Rocket className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">No DORA metrics available. Run some tasks first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {METRIC_META.map((meta, i) => (
          <MetricCard key={meta.key} metric={snapshot[meta.key]} meta={meta} delay={i * 0.1} />
        ))}
      </div>

      {/* Trend Charts */}
      {trend.length > 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Deployment Frequency Trend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4"
          >
            <h4 className="text-xs text-zinc-400 mb-3 uppercase tracking-wider">Deploy Frequency Trend</h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="deploymentFrequency" name="Deploys/day" fill="#a855f7" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Lead Time Trend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4"
          >
            <h4 className="text-xs text-zinc-400 mb-3 uppercase tracking-wider">Lead Time Trend (p50)</h4>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="leadTimeP50" name="Hours (p50)" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}
    </div>
  );
}
