'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { ScanTypeStats } from '../lib/types';
import { SCAN_TYPE_CONFIG, STATUS_CONFIG } from '../lib/config';

interface ScanTypeCardProps {
  stats: ScanTypeStats;
  index: number;
  onScanTypeClick?: (scanType: ScanType) => void;
}

export default function ScanTypeCard({ stats, index, onScanTypeClick }: ScanTypeCardProps) {
  const config = SCAN_TYPE_CONFIG[stats.scanType];
  const Icon = config.icon;

  const handleClick = () => {
    if (onScanTypeClick) {
      onScanTypeClick(stats.scanType);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onScanTypeClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onScanTypeClick(stats.scanType);
    }
  };

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
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`relative bg-gradient-to-br ${config.bgGradient} border ${config.borderColor} rounded-md p-2 backdrop-blur-sm overflow-hidden group ${onScanTypeClick ? 'cursor-pointer' : ''}`}
      data-testid={`scan-type-card-${stats.scanType}`}
      role={onScanTypeClick ? 'button' : undefined}
      tabIndex={onScanTypeClick ? 0 : undefined}
    >
      {/* Header Row - Icon, Name, Total */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`p-1 bg-gray-900/60 rounded border ${config.borderColor} flex-shrink-0`}>
          <Icon className={`w-3 h-3 ${config.color}`} />
        </div>
        <h3 className={`text-xs font-semibold ${config.color} truncate flex-1`}>
          {config.label}
        </h3>
        <span className={`text-xs font-mono ${config.color} opacity-50`}>
          {stats.total}
        </span>
      </div>

      {/* Acceptance Rate - Centered */}
      <div className="flex items-center justify-center gap-1 mb-1.5">
        <AcceptanceIcon className={`w-3 h-3 ${acceptanceColor}`} />
        <span className={`text-lg font-bold ${acceptanceColor} font-mono`}>
          {stats.acceptanceRatio}%
        </span>
      </div>

      {/* Status Numbers - Compact Row */}
      <div className="flex items-center justify-between text-[10px] font-mono px-0.5">
        <span className={STATUS_CONFIG.pending.color} title="Pending">{stats.pending}p</span>
        <span className={STATUS_CONFIG.rejected.color} title="Rejected">{stats.rejected}r</span>
        <span className={STATUS_CONFIG.accepted.color} title="Accepted">{stats.accepted}a</span>
        <span className={STATUS_CONFIG.implemented.color} title="Implemented">{stats.implemented}i</span>
      </div>
    </motion.div>
  );
}
