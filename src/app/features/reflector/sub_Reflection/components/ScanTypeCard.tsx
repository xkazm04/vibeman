'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ScanTypeStats } from '../lib/types';
import { SCAN_TYPE_CONFIG, STATUS_CONFIG } from '../lib/config';

interface ScanTypeCardProps {
  stats: ScanTypeStats;
  index: number;
}

export default function ScanTypeCard({ stats, index }: ScanTypeCardProps) {
  const config = SCAN_TYPE_CONFIG[stats.scanType];
  const Icon = config.icon;

  const getAcceptanceIcon = () => {
    if (stats.acceptanceRatio >= 70) return TrendingUp;
    if (stats.acceptanceRatio <= 30) return TrendingDown;
    return Minus;
  };

  const getAcceptanceColor = () => {
    if (stats.acceptanceRatio >= 70) return 'text-green-400';
    if (stats.acceptanceRatio <= 30) return 'text-red-500';
    return 'text-yellow-400';
  };

  const AcceptanceIcon = getAcceptanceIcon();
  const acceptanceColor = getAcceptanceColor();

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`relative bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} rounded-lg p-4 backdrop-blur-sm overflow-hidden group`}
    >
      {/* Background decoration */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 ${config.color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />

      {/* Total Ideas - Top Right Corner */}
      <div className="absolute top-3 right-3">
        <div className={`text-4xl font-bold ${config.color} opacity-20 font-mono leading-none`}>
          {stats.total}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-2 mb-4 pr-12">
        <div className={`p-2 bg-gray-900/60 rounded-lg border ${config.borderColor} flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${config.color} truncate`}>
            {config.label}
          </h3>
          <p className="text-xs text-gray-500 truncate">{config.description}</p>
        </div>
      </div>

      {/* Acceptance Ratio - Large Display */}
      <div className="mb-4">
        <div className="flex items-center justify-center gap-2">
          <AcceptanceIcon className={`w-5 h-5 ${acceptanceColor}`} />
          <div className={`text-4xl font-bold ${acceptanceColor} font-mono`}>
            {stats.acceptanceRatio}%
          </div>
        </div>
      </div>

      {/* Status Numbers - Inline with Dividers */}
      <div className="flex items-center justify-center gap-3 text-lg font-thin font-mono">
        <span className={STATUS_CONFIG.pending.color}>{stats.pending}</span>
        <span className="h-2 border border-l-gray-700"></span>
        <span className={STATUS_CONFIG.rejected.color}>{stats.rejected}</span>
        <span className="h-2 border border-l-gray-700"></span>
        <span className={STATUS_CONFIG.accepted.color}>{stats.accepted}</span>
        <span className="h-2 border border-l-gray-700"></span>
        <span className={STATUS_CONFIG.implemented.color}>{stats.implemented}</span>
      </div>
    </motion.div>
  );
}
