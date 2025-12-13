'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import type { CIDashboardStats } from '@/app/db/models/autonomous-ci.types';
import { formatDuration, getScoreColor } from '../lib/ciHelpers';

interface CIDashboardStatsProps {
  stats: CIDashboardStats;
}

export default function CIDashboardStatsComponent({ stats }: CIDashboardStatsProps) {
  const statCards = [
    {
      label: 'Pipelines',
      value: stats.activePipelines,
      subValue: `of ${stats.totalPipelines} active`,
      icon: GitBranch,
      color: 'text-purple-400',
      bgColor: 'from-purple-500/20 to-purple-600/20',
    },
    {
      label: 'Success Rate',
      value: `${stats.successRate}%`,
      subValue: `${stats.totalBuilds} total builds`,
      icon: CheckCircle,
      color: stats.successRate >= 80 ? 'text-emerald-400' : stats.successRate >= 60 ? 'text-amber-400' : 'text-red-400',
      bgColor: stats.successRate >= 80 ? 'from-emerald-500/20 to-green-600/20' : stats.successRate >= 60 ? 'from-amber-500/20 to-yellow-600/20' : 'from-red-500/20 to-rose-600/20',
    },
    {
      label: 'Avg Build Time',
      value: formatDuration(stats.averageBuildTime),
      subValue: 'per build',
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'from-cyan-500/20 to-blue-600/20',
    },
    {
      label: 'Flaky Tests',
      value: stats.flakyTestsCount,
      subValue: stats.flakyTestsCount > 0 ? 'need attention' : 'all stable',
      icon: Zap,
      color: stats.flakyTestsCount > 0 ? 'text-amber-400' : 'text-emerald-400',
      bgColor: stats.flakyTestsCount > 0 ? 'from-amber-500/20 to-orange-600/20' : 'from-emerald-500/20 to-green-600/20',
    },
    {
      label: 'Recent Failures',
      value: stats.recentFailures,
      subValue: 'last 7 days',
      icon: XCircle,
      color: stats.recentFailures > 0 ? 'text-red-400' : 'text-emerald-400',
      bgColor: stats.recentFailures > 0 ? 'from-red-500/20 to-rose-600/20' : 'from-emerald-500/20 to-green-600/20',
    },
    {
      label: 'Predictions',
      value: stats.pendingPredictions,
      subValue: 'pending',
      icon: AlertTriangle,
      color: stats.pendingPredictions > 0 ? 'text-amber-400' : 'text-gray-400',
      bgColor: stats.pendingPredictions > 0 ? 'from-amber-500/20 to-orange-600/20' : 'from-gray-500/20 to-slate-600/20',
    },
  ];

  return (
    <div className="space-y-4" data-testid="ci-dashboard-stats">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors"
            data-testid={`stat-card-${stat.label.toLowerCase().replace(' ', '-')}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className="text-xs text-gray-400 mt-1">{stat.subValue}</div>
          </motion.div>
        ))}
      </div>

      {/* Build trend mini chart */}
      {stats.buildTrend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl border border-white/10 bg-white/5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Build Trend (14 days)</h3>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </div>

          <div className="flex items-end gap-1 h-16">
            {stats.buildTrend.map((day, index) => {
              const maxTotal = Math.max(...stats.buildTrend.map((d) => d.total));
              const height = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;
              const successRatio = day.total > 0 ? day.success / day.total : 0;

              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${day.date}: ${day.success} passed, ${day.failure} failed`}
                >
                  <div
                    className="w-full rounded-t relative overflow-hidden"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  >
                    {/* Failure portion */}
                    <div
                      className="absolute bottom-0 w-full bg-red-500/60"
                      style={{ height: `${(1 - successRatio) * 100}%` }}
                    />
                    {/* Success portion */}
                    <div
                      className="absolute top-0 w-full bg-emerald-500/60"
                      style={{ height: `${successRatio * 100}%` }}
                    />
                  </div>
                  {index === 0 || index === stats.buildTrend.length - 1 || index === Math.floor(stats.buildTrend.length / 2) ? (
                    <span className="text-[10px] text-gray-600">
                      {new Date(day.date).getDate()}
                    </span>
                  ) : (
                    <span className="text-[10px] text-transparent">.</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
              <span className="text-gray-400">Passed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500/60" />
              <span className="text-gray-400">Failed</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
