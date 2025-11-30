'use client';

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, TrendingUp, ChevronRight, Zap } from 'lucide-react';
import { useDebtPredictionStore } from '@/stores/debtPredictionStore';
import { useEffect } from 'react';

interface DebtPreventionWidgetProps {
  projectId: string;
  onOpenFull?: () => void;
}

/**
 * Compact widget showing debt prediction summary
 * Can be embedded in other features like RefactorWizard results
 */
export default function DebtPreventionWidget({
  projectId,
  onOpenFull,
}: DebtPreventionWidgetProps) {
  const { stats, opportunityCards, fetchStats, isEnabled } = useDebtPredictionStore();

  useEffect(() => {
    if (projectId && isEnabled) {
      fetchStats(projectId);
    }
  }, [projectId, isEnabled]);

  if (!isEnabled) return null;

  const urgentCount = stats?.predictions.urgent || 0;
  const acceleratingCount = stats?.predictions.accelerating || 0;
  const quickWins = opportunityCards.filter((c) => c.card_type === 'quick-win').length;

  // Don't show if no issues
  if (urgentCount === 0 && acceleratingCount === 0 && quickWins === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 backdrop-blur-sm overflow-hidden"
      data-testid="debt-prevention-widget"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">Debt Prevention</span>
          </div>
          {onOpenFull && (
            <button
              onClick={onOpenFull}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              data-testid="open-full-dashboard"
            >
              View All
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {urgentCount > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <div>
                <p className="text-lg font-bold text-red-400">{urgentCount}</p>
                <p className="text-[10px] text-red-400/60">Urgent</p>
              </div>
            </div>
          )}

          {acceleratingCount > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-lg font-bold text-orange-400">{acceleratingCount}</p>
                <p className="text-[10px] text-orange-400/60">Growing</p>
              </div>
            </div>
          )}

          {quickWins > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <Zap className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-lg font-bold text-green-400">{quickWins}</p>
                <p className="text-[10px] text-green-400/60">Quick Wins</p>
              </div>
            </div>
          )}
        </div>

        {/* Health score mini */}
        {stats?.healthScore !== undefined && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-gray-500">Code Health Score</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-black/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.healthScore}%` }}
                  className={`h-full rounded-full ${
                    stats.healthScore >= 80
                      ? 'bg-green-500'
                      : stats.healthScore >= 60
                      ? 'bg-yellow-500'
                      : stats.healthScore >= 40
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                />
              </div>
              <span
                className={`text-sm font-bold ${
                  stats.healthScore >= 80
                    ? 'text-green-400'
                    : stats.healthScore >= 60
                    ? 'text-yellow-400'
                    : stats.healthScore >= 40
                    ? 'text-orange-400'
                    : 'text-red-400'
                }`}
              >
                {stats.healthScore}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
