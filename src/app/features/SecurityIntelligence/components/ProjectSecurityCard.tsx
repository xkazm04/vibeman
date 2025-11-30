'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { SecurityIntelligence } from '@/app/db/models/security-intelligence.types';
import RiskScoreGauge from './RiskScoreGauge';
import VulnerabilityBreakdown from './VulnerabilityBreakdown';

interface ProjectSecurityCardProps {
  intelligence: SecurityIntelligence;
  onClick?: () => void;
}

/**
 * ProjectSecurityCard - Display security summary for a single project
 */
export default function ProjectSecurityCard({
  intelligence,
  onClick,
}: ProjectSecurityCardProps) {
  const ciStatusConfig = {
    passing: { icon: CheckCircle, color: 'text-green-400', label: 'Passing' },
    failing: { icon: XCircle, color: 'text-red-400', label: 'Failing' },
    unknown: { icon: Clock, color: 'text-gray-400', label: 'Unknown' },
    pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
  };

  const trendConfig = {
    improving: { icon: TrendingDown, color: 'text-green-400' },
    stable: { icon: Minus, color: 'text-gray-400' },
    degrading: { icon: TrendingUp, color: 'text-red-400' },
  };

  const ciConfig = ciStatusConfig[intelligence.ciStatus];
  const CiIcon = ciConfig.icon;
  const trendIconConfig = trendConfig[intelligence.riskTrend];
  const TrendIcon = trendIconConfig.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={`border border-white/10 rounded-xl p-5 bg-gradient-to-br from-white/5 to-white/[0.02] ${
        onClick ? 'cursor-pointer' : ''
      }`}
      data-testid={`project-security-card-${intelligence.projectId}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">{intelligence.projectName}</h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">
              {intelligence.projectPath}
            </p>
          </div>
        </div>

        <RiskScoreGauge score={intelligence.riskScore} size="sm" showLabel={false} />
      </div>

      {/* Vulnerability Breakdown */}
      <div className="mb-4">
        <VulnerabilityBreakdown
          critical={intelligence.criticalCount}
          high={intelligence.highCount}
          medium={intelligence.mediumCount}
          low={intelligence.lowCount}
          compact
        />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
        {/* CI Status */}
        <div className="text-center">
          <div className={`flex items-center justify-center gap-1 ${ciConfig.color}`}>
            <CiIcon className="w-4 h-4" />
            <span className="text-xs">{ciConfig.label}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">CI Status</p>
        </div>

        {/* Patch Health */}
        <div className="text-center">
          <p className={`text-lg font-light ${
            intelligence.patchHealthScore >= 80 ? 'text-green-400' :
            intelligence.patchHealthScore >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {intelligence.patchHealthScore}%
          </p>
          <p className="text-xs text-gray-500">Patch Health</p>
        </div>

        {/* Trend */}
        <div className="text-center">
          <div className={`flex items-center justify-center gap-1 ${trendIconConfig.color}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-xs capitalize">{intelligence.riskTrend}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Trend</p>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs text-gray-400">
        <span>
          {intelligence.patchesPending} pending • {intelligence.patchesApplied} applied
        </span>
        {intelligence.staleBranchesCount > 0 && (
          <span className="text-orange-400">
            {intelligence.staleBranchesCount} stale branches
          </span>
        )}
      </div>
    </motion.div>
  );
}
