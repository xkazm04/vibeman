'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import type { TechDebtStats } from '@/app/db/models/tech-debt.types';

interface TechDebtStatsPanelProps {
  stats: TechDebtStats;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClasses: string;
  textColor: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, colorClasses, textColor, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`p-4 rounded-lg ${colorClasses}`}
  >
    <div className="flex items-center justify-between mb-2">
      <span className={`text-sm ${textColor}`}>{label}</span>
      <Icon className={`w-5 h-5 ${textColor}`} />
    </div>
    <div className={`text-3xl font-bold ${textColor.includes('gray-400') ? 'text-white' : textColor}`}>
      {value}
    </div>
  </motion.div>
);

interface SeverityRowProps {
  label: string;
  count: number;
  textColor: string;
}

const SeverityRow: React.FC<SeverityRowProps> = ({ label, count, textColor }) => (
  <div className="flex items-center justify-between">
    <span className={`text-sm ${textColor}`}>{label}</span>
    <span className="text-sm font-medium text-white">{count}</span>
  </div>
);

export default function TechDebtStatsPanel({ stats }: TechDebtStatsPanelProps) {
  const topCategories = Object.entries(stats.byCategory)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Total Items */}
      <StatCard
        label="Total Items"
        value={stats.totalItems}
        icon={AlertTriangle}
        colorClasses="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50"
        textColor="text-gray-400"
      />

      {/* Critical Count */}
      <StatCard
        label="Critical"
        value={stats.criticalCount}
        icon={AlertTriangle}
        colorClasses="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30"
        textColor="text-red-400"
        delay={0.1}
      />

      {/* Average Risk Score */}
      <StatCard
        label="Avg Risk"
        value={stats.averageRiskScore.toFixed(1)}
        icon={TrendingUp}
        colorClasses="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/30"
        textColor="text-yellow-400"
        delay={0.2}
      />

      {/* Estimated Hours */}
      <StatCard
        label="Est. Hours"
        value={stats.totalEstimatedHours.toFixed(1)}
        icon={Clock}
        colorClasses="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30"
        textColor="text-blue-400"
        delay={0.3}
      />

      {/* Breakdown by Severity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="col-span-2 p-4 rounded-lg bg-gradient-to-br from-gray-800/50 to-gray-900/50
          border border-gray-700/50"
      >
        <div className="text-sm text-gray-400 mb-3">Severity Breakdown</div>
        <div className="space-y-2">
          <SeverityRow label="Critical" count={stats.bySeverity.critical} textColor="text-red-400" />
          <SeverityRow label="High" count={stats.bySeverity.high} textColor="text-orange-400" />
          <SeverityRow label="Medium" count={stats.bySeverity.medium} textColor="text-yellow-400" />
          <SeverityRow label="Low" count={stats.bySeverity.low} textColor="text-blue-400" />
        </div>
      </motion.div>

      {/* Breakdown by Category */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="col-span-2 p-4 rounded-lg bg-gradient-to-br from-gray-800/50 to-gray-900/50
          border border-gray-700/50"
      >
        <div className="text-sm text-gray-400 mb-3">Top Categories</div>
        <div className="space-y-2">
          {topCategories.map(([category, count]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-sm text-gray-300 capitalize">
                {category.replace('_', ' ')}
              </span>
              <span className="text-sm font-medium text-white">{count}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
