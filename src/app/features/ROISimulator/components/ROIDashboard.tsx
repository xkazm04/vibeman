'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  AlertTriangle,
  Zap,
  BarChart3,
  ArrowRight,
  RefreshCcw,
} from 'lucide-react';
import { useROISimulatorStore } from '@/stores/roiSimulatorStore';
import { ROIGauge } from './ROIGauge';
import {
  formatCurrency,
  formatPercentage,
  REFACTORING_CATEGORIES,
} from '../lib/types';

interface ROIDashboardProps {
  projectId: string;
}

export function ROIDashboard({ projectId }: ROIDashboardProps) {
  const {
    summary,
    isLoading,
    loadSummary,
    setViewMode,
  } = useROISimulatorStore();

  useEffect(() => {
    loadSummary(projectId);
  }, [projectId, loadSummary]);

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCcw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Data Available</h3>
        <p className="text-gray-400 mb-4">Start by adding refactoring items to simulate ROI.</p>
        <button
          onClick={() => setViewMode('refactorings')}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          data-testid="add-refactorings-btn"
        >
          Add Refactorings
        </button>
      </div>
    );
  }

  const { portfolio, economics, recommendations, simulations } = summary;

  return (
    <div className="space-y-6" data-testid="roi-dashboard">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                    rounded-xl border border-gray-700/50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Total Investment</span>
            <DollarSign className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(portfolio.totalInvestment)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {portfolio.totalRefactorings} refactorings
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                    rounded-xl border border-gray-700/50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Expected Benefit</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCurrency(portfolio.totalExpectedBenefit)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {formatPercentage(portfolio.averageROI)} avg ROI
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                    rounded-xl border border-gray-700/50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Net Debt Trend</span>
            {economics.netDebtTrend === 'decreasing' ? (
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            ) : economics.netDebtTrend === 'increasing' ? (
              <TrendingUp className="w-5 h-5 text-red-400" />
            ) : (
              <Clock className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div className={`text-2xl font-bold ${
            economics.netDebtTrend === 'decreasing'
              ? 'text-emerald-400'
              : economics.netDebtTrend === 'increasing'
                ? 'text-red-400'
                : 'text-amber-400'
          }`}>
            {economics.netDebtTrend.charAt(0).toUpperCase() + economics.netDebtTrend.slice(1)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {formatCurrency(economics.monthlyDebtPaydown)}/mo paydown
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                    rounded-xl border border-gray-700/50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Velocity Trend</span>
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div className={`text-2xl font-bold ${
            economics.velocityTrend === 'improving'
              ? 'text-emerald-400'
              : economics.velocityTrend === 'declining'
                ? 'text-red-400'
                : 'text-amber-400'
          }`}>
            {economics.velocityTrend.charAt(0).toUpperCase() + economics.velocityTrend.slice(1)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Development velocity
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ROI Gauge + Recommendations */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                    rounded-xl border border-gray-700/50 p-6"
        >
          <h3 className="text-lg font-medium text-white mb-4">Portfolio Health</h3>

          <div className="flex justify-center mb-6">
            <ROIGauge value={portfolio.averageROI} size={160} label="Average ROI" />
          </div>

          {/* Optimal Allocation */}
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-white mb-2">Optimal Time Allocation</h4>
            <div className="flex gap-2 mb-2">
              <div
                className="h-2 bg-cyan-500 rounded-full"
                style={{ width: `${recommendations.optimalAllocation.refactoringPercent}%` }}
              />
              <div
                className="h-2 bg-purple-500 rounded-full"
                style={{ width: `${recommendations.optimalAllocation.featurePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Refactoring: {recommendations.optimalAllocation.refactoringPercent}%</span>
              <span>Features: {recommendations.optimalAllocation.featurePercent}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {recommendations.optimalAllocation.explanation}
            </p>
          </div>

          {/* Status Breakdown */}
          <div className="space-y-2">
            {Object.entries(portfolio.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-400 capitalize">
                  {status.replace('_', ' ')}
                </span>
                <span className="text-sm font-medium text-white">{count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top ROI Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                    rounded-xl border border-gray-700/50 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Top ROI Opportunities</h3>
            <button
              onClick={() => setViewMode('refactorings')}
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              data-testid="view-all-refactorings-btn"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {recommendations.topROIRefactorings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No refactoring items yet
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.topROIRefactorings.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg
                           hover:bg-gray-700/50 transition-colors cursor-pointer"
                  data-testid={`top-roi-item-${item.id}`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/20
                                flex items-center justify-center">
                    <span className="text-sm font-bold text-emerald-400">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                    <div className="text-xs text-gray-400">
                      Payback: {item.paybackMonths.toFixed(1)} months
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      item.roi >= 100 ? 'text-emerald-400' :
                      item.roi >= 50 ? 'text-green-400' :
                      item.roi >= 0 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {item.roi >= 0 ? '+' : ''}{item.roi.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-400">ROI</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Urgent Items */}
          {recommendations.urgentItems.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h4 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />
                Urgent Items
              </h4>
              <div className="space-y-2">
                {recommendations.urgentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 bg-amber-500/10 border border-amber-500/30
                             rounded-lg text-sm"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-white flex-1 truncate">{item.title}</span>
                    <span className="text-amber-400 text-xs">{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Category Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm
                  rounded-xl border border-gray-700/50 p-6"
      >
        <h3 className="text-lg font-medium text-white mb-4">ROI by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {REFACTORING_CATEGORIES.map((cat) => {
            const stats = portfolio.byCategory[cat.value as keyof typeof portfolio.byCategory];
            if (!stats) return null;

            return (
              <div
                key={cat.value}
                className={`p-4 rounded-lg bg-${cat.color}-500/10 border border-${cat.color}-500/30`}
              >
                <div className={`text-sm font-medium text-${cat.color}-400 mb-2`}>
                  {cat.label}
                </div>
                <div className="text-xl font-bold text-white">{stats.count}</div>
                <div className="text-xs text-gray-400">
                  {formatCurrency(stats.investment)} invested
                </div>
                <div className={`text-xs mt-1 ${
                  stats.roi >= 50 ? 'text-emerald-400' :
                  stats.roi >= 0 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(0)}% ROI
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Active Simulation */}
      {simulations.active && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 backdrop-blur-sm
                    rounded-xl border border-cyan-500/30 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-cyan-400" />
              <div>
                <h3 className="text-lg font-medium text-white">Active Simulation</h3>
                <p className="text-sm text-gray-400">{simulations.active.name}</p>
              </div>
            </div>
            <button
              onClick={() => setViewMode('simulations')}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300
                       rounded-lg transition-colors text-sm flex items-center gap-2"
              data-testid="view-simulations-btn"
            >
              View Details <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400">Total Cost</div>
              <div className="text-lg font-bold text-white">
                {formatCurrency(simulations.active.total_cost)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Expected ROI</div>
              <div className="text-lg font-bold text-emerald-400">
                {formatPercentage(simulations.active.overall_roi)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Break Even</div>
              <div className="text-lg font-bold text-white">
                {simulations.active.break_even_month
                  ? `Month ${simulations.active.break_even_month}`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Velocity Gain</div>
              <div className="text-lg font-bold text-cyan-400">
                {formatPercentage(simulations.active.final_velocity_improvement)}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
