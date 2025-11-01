'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import type { TechDebtStats } from '@/app/db/models/tech-debt.types';

interface TechDebtStatsPanelProps {
  stats: TechDebtStats;
}

export default function TechDebtStatsPanel({ stats }: TechDebtStatsPanelProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Total Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-lg bg-gradient-to-br from-gray-800/50 to-gray-900/50
          border border-gray-700/50"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Total Items</span>
          <AlertTriangle className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-3xl font-bold text-white">
          {stats.totalItems}
        </div>
      </motion.div>

      {/* Critical Count */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10
          border border-red-500/30"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-red-300">Critical</span>
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div className="text-3xl font-bold text-red-400">
          {stats.criticalCount}
        </div>
      </motion.div>

      {/* Average Risk Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-amber-500/10
          border border-yellow-500/30"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-yellow-300">Avg Risk</span>
          <TrendingUp className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="text-3xl font-bold text-yellow-400">
          {stats.averageRiskScore.toFixed(1)}
        </div>
      </motion.div>

      {/* Estimated Hours */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10
          border border-blue-500/30"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-blue-300">Est. Hours</span>
          <Clock className="w-5 h-5 text-blue-400" />
        </div>
        <div className="text-3xl font-bold text-blue-400">
          {stats.totalEstimatedHours.toFixed(1)}
        </div>
      </motion.div>

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
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-400">Critical</span>
            <span className="text-sm font-medium text-white">{stats.bySeverity.critical}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-400">High</span>
            <span className="text-sm font-medium text-white">{stats.bySeverity.high}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-400">Medium</span>
            <span className="text-sm font-medium text-white">{stats.bySeverity.medium}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-400">Low</span>
            <span className="text-sm font-medium text-white">{stats.bySeverity.low}</span>
          </div>
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
          {Object.entries(stats.byCategory)
            .filter(([_, count]) => count > 0)
            .sort(([_, a], [__, b]) => b - a)
            .slice(0, 4)
            .map(([category, count]) => (
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
