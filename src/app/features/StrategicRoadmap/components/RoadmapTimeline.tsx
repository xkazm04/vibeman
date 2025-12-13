'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
  Wrench,
  Package,
  Layers,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  useStrategicRoadmapStore,
  useFilteredInitiatives,
  useInitiativesByMonth,
} from '@/stores/strategicRoadmapStore';
import type { DbStrategicInitiative } from '@/app/db/models/strategic-roadmap.types';

const INITIATIVE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  feature: {
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
  },
  refactoring: {
    icon: <Wrench className="w-4 h-4" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
  },
  debt_reduction: {
    icon: <Target className="w-4 h-4" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
  },
  security: {
    icon: <Shield className="w-4 h-4" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
  },
  performance: {
    icon: <Zap className="w-4 h-4" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30',
  },
  infrastructure: {
    icon: <Layers className="w-4 h-4" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/30',
  },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  proposed: { color: 'text-gray-400', bg: 'bg-gray-500/20' },
  approved: { color: 'text-blue-400', bg: 'bg-blue-500/20' },
  in_progress: { color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  deferred: { color: 'text-orange-400', bg: 'bg-orange-500/20' },
  cancelled: { color: 'text-red-400', bg: 'bg-red-500/20' },
};

export default function RoadmapTimeline() {
  const {
    milestones,
    predictions,
    interactions,
    showPredictions,
    showInteractions,
    expandedMonths,
    toggleMonth,
    selectInitiative,
    selectedInitiativeId,
  } = useStrategicRoadmapStore();

  const initiativesByMonth = useInitiativesByMonth();

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    return {
      index: i + 1,
      name: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.getFullYear(),
      quarter: Math.ceil((date.getMonth() + 1) / 3),
    };
  });

  // Get milestone for a month
  const getMilestoneForMonth = (monthIndex: number) => {
    return milestones.find(m => m.month_index === monthIndex);
  };

  // Get prediction for an initiative
  const getPredictionForInitiative = (initiativeId: string) => {
    return predictions.find(p => p.subject_id === initiativeId) || null;
  };

  // Get interactions for an initiative
  const getInteractionsForInitiative = (initiativeId: string) => {
    return interactions.filter(
      i => i.feature_a_id === initiativeId || i.feature_b_id === initiativeId
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-4">
        {months.map((month, idx) => {
          const monthInitiatives = initiativesByMonth[month.index] || [];
          const milestone = getMilestoneForMonth(month.index);
          const isExpanded = expandedMonths.includes(month.index);

          return (
            <motion.div
              key={month.index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden"
            >
              {/* Month Header */}
              <button
                onClick={() => toggleMonth(month.index)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
                data-testid={`month-${month.index}-toggle`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-lg font-semibold text-white">
                      {month.name} {month.year}
                    </span>
                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-700/50 rounded">
                      Q{month.quarter}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      {monthInitiatives.length} initiative{monthInitiatives.length !== 1 ? 's' : ''}
                    </span>
                    {milestone && (
                      <span className="text-xs text-cyan-400 px-2 py-0.5 bg-cyan-500/10 rounded">
                        Target: {milestone.target_health_score}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {monthInitiatives.map(init => {
                    const config = INITIATIVE_TYPE_CONFIG[init.initiative_type];
                    return (
                      <div
                        key={init.id}
                        className={`w-6 h-6 rounded flex items-center justify-center ${config.bgColor} border`}
                        title={init.title}
                      >
                        <span className={config.color}>{config.icon}</span>
                      </div>
                    );
                  })}
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-700/50"
                  >
                    {/* Milestone Info */}
                    {milestone && (
                      <div className="p-4 bg-gray-900/30 border-b border-gray-700/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-300">{milestone.title}</h4>
                            <p className="text-xs text-gray-500">{milestone.description}</p>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="text-center">
                              <div className="text-gray-500">Health Target</div>
                              <div className="text-cyan-400 font-bold">{milestone.target_health_score}%</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500">Debt Reduction</div>
                              <div className="text-emerald-400 font-bold">-{milestone.target_debt_reduction}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-500">Velocity</div>
                              <div className="text-blue-400 font-bold">+{milestone.target_velocity_improvement}%</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Initiatives */}
                    <div className="p-4 space-y-3">
                      {monthInitiatives.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No initiatives planned for this month
                        </div>
                      ) : (
                        monthInitiatives.map((initiative) => {
                          const config = INITIATIVE_TYPE_CONFIG[initiative.initiative_type];
                          const statusConfig = STATUS_CONFIG[initiative.status];
                          const prediction = showPredictions ? getPredictionForInitiative(initiative.id) : null;
                          const initInteractions = showInteractions ? getInteractionsForInitiative(initiative.id) : [];
                          const isSelected = selectedInitiativeId === initiative.id;

                          return (
                            <InitiativeCard
                              key={initiative.id}
                              initiative={initiative}
                              config={config}
                              statusConfig={statusConfig}
                              prediction={prediction}
                              interactions={initInteractions}
                              isSelected={isSelected}
                              onSelect={() => selectInitiative(isSelected ? null : initiative.id)}
                            />
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface InitiativeCardProps {
  initiative: DbStrategicInitiative;
  config: { icon: React.ReactNode; color: string; bgColor: string };
  statusConfig: { color: string; bg: string };
  prediction: ReturnType<typeof useStrategicRoadmapStore.getState>['predictions'][0] | null;
  interactions: ReturnType<typeof useStrategicRoadmapStore.getState>['interactions'];
  isSelected: boolean;
  onSelect: () => void;
}

function InitiativeCard({
  initiative,
  config,
  statusConfig,
  prediction,
  interactions,
  isSelected,
  onSelect,
}: InitiativeCardProps) {
  const synergies = interactions.filter(i => i.interaction_type === 'synergy').length;
  const conflicts = interactions.filter(i => i.interaction_type === 'conflict').length;

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected
          ? 'bg-cyan-500/10 border-cyan-500/50'
          : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50'
        }`}
      data-testid={`initiative-card-${initiative.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon and Main Info */}
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${config.bgColor} border`}>
            <span className={config.color}>{config.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-white truncate">{initiative.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color}`}>
                {initiative.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-400 line-clamp-2">{initiative.description}</p>

            {/* Metrics Row */}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-gray-500">
                Priority: <span className="text-white font-medium">{initiative.priority}/10</span>
              </span>
              <span className="text-xs text-gray-500">
                Effort: <span className="text-white font-medium">{initiative.estimated_effort_hours}h</span>
              </span>
              <span className="text-xs text-gray-500">
                Complexity: <span className="text-white font-medium capitalize">{initiative.estimated_complexity}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Impact Scores */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Business</span>
            <ImpactBar value={initiative.business_impact_score} color="blue" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Technical</span>
            <ImpactBar value={initiative.technical_impact_score} color="purple" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Risk Reduce</span>
            <ImpactBar value={initiative.risk_reduction_score} color="emerald" />
          </div>
        </div>
      </div>

      {/* Prediction & Interactions Row */}
      {(prediction || interactions.length > 0) && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-700/30">
          {prediction && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-500">6-month impact:</span>
              <PredictionIndicator label="Debt" value={prediction.debt_impact} />
              <PredictionIndicator label="Velocity" value={prediction.velocity_impact} />
              <PredictionIndicator label="Risk" value={prediction.risk_impact} />
              <span className="text-gray-500 ml-2">
                {prediction.confidence_score}% conf.
              </span>
            </div>
          )}

          {interactions.length > 0 && (
            <div className="flex items-center gap-2 text-xs ml-auto">
              {synergies > 0 && (
                <span className="text-emerald-400">
                  {synergies} synerg{synergies > 1 ? 'ies' : 'y'}
                </span>
              )}
              {conflicts > 0 && (
                <span className="text-red-400">
                  {conflicts} conflict{conflicts > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ImpactBar({ value, color }: { value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClasses[color]} rounded-full`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function PredictionIndicator({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-400">{label}:</span>
      <span className={`font-medium ${
        isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-gray-400'
      }`}>
        {isPositive ? '+' : ''}{value}
      </span>
      {isPositive ? (
        <TrendingUp className="w-3 h-3 text-emerald-400" />
      ) : isNegative ? (
        <TrendingDown className="w-3 h-3 text-red-400" />
      ) : (
        <Minus className="w-3 h-3 text-gray-400" />
      )}
    </div>
  );
}
