'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Lightbulb,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
} from 'lucide-react';
import { StandupSummaryResponse } from '../lib/types';

interface StandupStatsRowProps {
  stats: StandupSummaryResponse['stats'];
  insights: StandupSummaryResponse['insights'];
}

export default function StandupStatsRow({ stats, insights }: StandupStatsRowProps) {
  const acceptanceRate =
    stats.ideasGenerated > 0
      ? Math.round(((stats.ideasAccepted + stats.ideasImplemented) / stats.ideasGenerated) * 100)
      : 0;

  const getTrendIcon = (trend: 'increasing' | 'stable' | 'decreasing' | null) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getBurnoutRiskColor = (risk: 'low' | 'medium' | 'high' | null) => {
    switch (risk) {
      case 'high':
        return 'text-red-400 bg-red-900/30 border-red-500/40';
      case 'medium':
        return 'text-amber-400 bg-amber-900/30 border-amber-500/40';
      default:
        return 'text-green-400 bg-green-900/30 border-green-500/40';
    }
  };

  const cards = [
    {
      label: 'Implementations',
      value: stats.implementationsCount,
      icon: <CheckCircle className="w-5 h-5 text-green-400" />,
      color: 'bg-green-900/20 border-green-500/30',
    },
    {
      label: 'Ideas Generated',
      value: stats.ideasGenerated,
      icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
      color: 'bg-amber-900/20 border-amber-500/30',
    },
    {
      label: 'Accepted',
      value: stats.ideasAccepted,
      icon: <CheckCircle className="w-5 h-5 text-blue-400" />,
      color: 'bg-blue-900/20 border-blue-500/30',
    },
    {
      label: 'Rejected',
      value: stats.ideasRejected,
      icon: <XCircle className="w-5 h-5 text-gray-400" />,
      color: 'bg-gray-800/50 border-gray-600/30',
    },
    {
      label: 'Implemented',
      value: stats.ideasImplemented,
      icon: <Zap className="w-5 h-5 text-purple-400" />,
      color: 'bg-purple-900/20 border-purple-500/30',
    },
    {
      label: 'Acceptance Rate',
      value: `${acceptanceRate}%`,
      icon: <Target className="w-5 h-5 text-cyan-400" />,
      color: 'bg-cyan-900/20 border-cyan-500/30',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-lg border ${card.color}`}
            data-testid={`standup-stat-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {card.icon}
              <span className="text-xs text-gray-400 uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Insights Row */}
      <div className="flex flex-wrap gap-3">
        {/* Velocity Trend */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/40"
          data-testid="standup-velocity-trend"
        >
          {getTrendIcon(insights.velocityTrend)}
          <span className="text-sm text-gray-300">
            Velocity:{' '}
            <span className="capitalize">
              {insights.velocityTrend || 'Unknown'}
            </span>
          </span>
        </div>

        {/* Burnout Risk */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getBurnoutRiskColor(
            insights.burnoutRisk
          )}`}
          data-testid="standup-burnout-risk"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">
            Burnout Risk:{' '}
            <span className="capitalize font-medium">
              {insights.burnoutRisk || 'Low'}
            </span>
          </span>
        </div>

        {/* Focus Areas Count */}
        {insights.focusAreas.length > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-900/30 border border-indigo-500/40 text-indigo-300"
            data-testid="standup-focus-areas-count"
          >
            <Target className="w-4 h-4" />
            <span className="text-sm">{insights.focusAreas.length} Focus Areas</span>
          </div>
        )}
      </div>
    </div>
  );
}
