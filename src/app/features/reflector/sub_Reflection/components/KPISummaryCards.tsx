'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, TrendingUp, Target } from 'lucide-react';
import { ReflectionStats } from '../lib/types';

interface KPISummaryCardsProps {
  stats: ReflectionStats;
}

interface KPICardData {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  borderColor: string;
  bgGradient: string;
  description: string;
}

export default function KPISummaryCards({ stats }: KPISummaryCardsProps) {
  // Calculate average impact across all scan types
  const calculateAverageImpact = (): number => {
    if (stats.scanTypes.length === 0) return 0;

    // Assuming impact is based on acceptance ratio
    const totalImpact = stats.scanTypes.reduce((sum, scan) => sum + scan.acceptanceRatio, 0);
    return Math.round(totalImpact / stats.scanTypes.length);
  };

  const kpiCards: KPICardData[] = [
    {
      label: 'Total Reflections',
      value: stats.overall.total,
      icon: FileText,
      color: 'text-blue-400',
      borderColor: 'border-blue-500/40',
      bgGradient: 'from-blue-500/5 to-blue-600/2',
      description: 'All ideas generated'
    },
    {
      label: 'Acceptance Rate',
      value: `${stats.overall.acceptanceRatio}%`,
      icon: CheckCircle,
      color: 'text-green-400',
      borderColor: 'border-green-500/40',
      bgGradient: 'from-green-500/5 to-green-600/2',
      description: 'Accepted & implemented'
    },
    {
      label: 'Average Impact',
      value: `${calculateAverageImpact()}%`,
      icon: TrendingUp,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/40',
      bgGradient: 'from-purple-500/5 to-purple-600/2',
      description: 'Mean specialist performance'
    },
    {
      label: 'Active Specialists',
      value: stats.scanTypes.length,
      icon: Target,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      bgGradient: 'from-amber-500/5 to-amber-600/2',
      description: 'Scan types with ideas'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpiCards.map((kpi, index) => {
        const Icon = kpi.icon;

        return (
          <motion.div
            key={kpi.label}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`relative bg-gradient-to-br ${kpi.bgGradient} border ${kpi.borderColor} rounded-lg p-4 backdrop-blur-sm overflow-hidden group`}
          >
            {/* Background decoration */}
            <div className={`absolute -top-8 -right-8 w-24 h-24 ${kpi.color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />

            {/* Content */}
            <div className="relative">
              {/* Icon and Label */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 bg-gray-900/60 rounded-lg border ${kpi.borderColor} flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-300 truncate">
                    {kpi.label}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{kpi.description}</p>
                </div>
              </div>

              {/* Value Display */}
              <div className={`text-3xl font-bold ${kpi.color} font-mono`}>
                {kpi.value}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
