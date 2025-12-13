'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type { RefactoringWithROI } from '../lib/types';
import {
  ROI_CATEGORY_COLORS,
  URGENCY_COLORS,
  STATUS_COLORS,
  REFACTORING_CATEGORIES,
  formatCurrency,
  formatPercentage,
  formatHours,
} from '../lib/types';

interface RefactoringCardProps {
  refactoring: RefactoringWithROI;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails?: () => void;
  index?: number;
}

export function RefactoringCard({
  refactoring,
  isSelected,
  onToggleSelect,
  onViewDetails,
  index = 0,
}: RefactoringCardProps) {
  const roiColors = ROI_CATEGORY_COLORS[refactoring.roiCategory];
  const urgencyColors = URGENCY_COLORS[refactoring.urgencyLevel];
  const statusColors = STATUS_COLORS[refactoring.status];
  const categoryConfig = REFACTORING_CATEGORIES.find(c => c.value === refactoring.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        relative rounded-xl border backdrop-blur-sm overflow-hidden
        bg-gradient-to-br from-gray-800/50 to-gray-900/50
        hover:shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer
        ${isSelected ? 'ring-2 ring-cyan-400 border-cyan-400/50' : 'border-gray-700/50'}
      `}
      onClick={onToggleSelect}
      data-testid={`refactoring-card-${refactoring.id}`}
    >
      {/* Selection indicator */}
      <div
        className={`
          absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center
          transition-all
          ${isSelected
            ? 'bg-cyan-500 border-cyan-400'
            : 'border-gray-500 hover:border-gray-400'}
        `}
        data-testid={`refactoring-select-${refactoring.id}`}
      >
        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3 pr-8">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center shrink-0
            ${categoryConfig ? `bg-${categoryConfig.color}-500/20` : 'bg-gray-500/20'}
          `}>
            {refactoring.category === 'security' ? (
              <Shield className="w-5 h-5 text-red-400" />
            ) : refactoring.category === 'performance' ? (
              <Zap className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-white truncate" title={refactoring.title}>
              {refactoring.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                ${statusColors.bg} ${statusColors.text}
              `}>
                {refactoring.status.replace('_', ' ')}
              </span>
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                ${urgencyColors.bg} ${urgencyColors.text}
              `}>
                {refactoring.urgencyLevel}
              </span>
            </div>
          </div>
        </div>

        {/* ROI Highlight */}
        <div className={`
          rounded-lg p-3 mb-3
          ${roiColors.bg} ${roiColors.border} border
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {refactoring.roi_percentage >= 0 ? (
                <TrendingUp className={`w-5 h-5 ${roiColors.text}`} />
              ) : (
                <TrendingDown className={`w-5 h-5 ${roiColors.text}`} />
              )}
              <span className={`text-2xl font-bold ${roiColors.text}`}>
                {formatPercentage(refactoring.roi_percentage)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Payback</div>
              <div className="text-sm font-medium text-white">
                {refactoring.payback_months > 99 ? '99+' : refactoring.payback_months.toFixed(1)} mo
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-xs text-gray-400">Cost</div>
            <div className="text-sm font-medium text-white">
              {formatCurrency(refactoring.calculated_cost)}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-xs text-gray-400">Benefit</div>
            <div className="text-sm font-medium text-emerald-400">
              {formatCurrency(refactoring.calculated_benefit)}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-xs text-gray-400">Effort</div>
            <div className="text-sm font-medium text-white flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatHours(refactoring.estimated_hours)}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-xs text-gray-400">Confidence</div>
            <div className="text-sm font-medium text-white">
              {refactoring.confidence_level}%
            </div>
          </div>
        </div>

        {/* Impact Preview */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-emerald-400">
            <Zap className="w-3 h-3" />
            <span>+{refactoring.velocity_improvement}% velocity</span>
          </div>
          {refactoring.security_risk_before - refactoring.security_risk_after > 0 && (
            <div className="flex items-center gap-1 text-red-400">
              <Shield className="w-3 h-3" />
              <span>-{refactoring.security_risk_before - refactoring.security_risk_after} risk</span>
            </div>
          )}
        </div>

        {/* View Details Button */}
        {onViewDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                     bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white
                     transition-colors text-sm"
            data-testid={`refactoring-details-${refactoring.id}`}
          >
            View Details
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
