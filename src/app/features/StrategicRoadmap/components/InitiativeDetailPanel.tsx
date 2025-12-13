'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Shield,
  Zap,
  Wrench,
  Layers,
  Target,
  TrendingUp,
  TrendingDown,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  useStrategicRoadmapStore,
  useSelectedInitiative,
  useInitiativePredictions,
  useInitiativeInteractions,
} from '@/stores/strategicRoadmapStore';
import type { DbStrategicInitiative } from '@/app/db/models/strategic-roadmap.types';

const INITIATIVE_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  feature: { icon: <Sparkles className="w-5 h-5" />, color: 'text-blue-400', label: 'Feature' },
  refactoring: { icon: <Wrench className="w-5 h-5" />, color: 'text-purple-400', label: 'Refactoring' },
  debt_reduction: { icon: <Target className="w-5 h-5" />, color: 'text-orange-400', label: 'Debt Reduction' },
  security: { icon: <Shield className="w-5 h-5" />, color: 'text-red-400', label: 'Security' },
  performance: { icon: <Zap className="w-5 h-5" />, color: 'text-yellow-400', label: 'Performance' },
  infrastructure: { icon: <Layers className="w-5 h-5" />, color: 'text-cyan-400', label: 'Infrastructure' },
};

const STATUS_OPTIONS: { value: DbStrategicInitiative['status']; label: string; icon: React.ReactNode }[] = [
  { value: 'proposed', label: 'Proposed', icon: <Clock className="w-4 h-4" /> },
  { value: 'approved', label: 'Approved', icon: <CheckCircle className="w-4 h-4" /> },
  { value: 'in_progress', label: 'In Progress', icon: <ArrowRight className="w-4 h-4" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle className="w-4 h-4" /> },
  { value: 'deferred', label: 'Deferred', icon: <Clock className="w-4 h-4" /> },
  { value: 'cancelled', label: 'Cancelled', icon: <X className="w-4 h-4" /> },
];

export default function InitiativeDetailPanel() {
  const { selectInitiative, updateInitiativeStatus, initiatives } = useStrategicRoadmapStore();
  const initiative = useSelectedInitiative();
  const predictions = useInitiativePredictions(initiative?.id || null);
  const interactions = useInitiativeInteractions(initiative?.id || null);

  if (!initiative) return null;

  const config = INITIATIVE_TYPE_CONFIG[initiative.initiative_type];
  const synergies = interactions.filter(i => i.interaction_type === 'synergy');
  const conflicts = interactions.filter(i => i.interaction_type === 'conflict');
  const dependencies = interactions.filter(i => i.interaction_type === 'dependency');

  // Get related initiative names
  const getRelatedInitiativeName = (id: string) => {
    const found = initiatives.find(i => i.id === id);
    return found?.title || 'Unknown';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        className="w-[400px] bg-gray-900/95 border-l border-gray-700/50 flex flex-col h-full"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={config.color}>{config.icon}</span>
              <span className="text-xs text-gray-400">{config.label}</span>
            </div>
            <button
              onClick={() => selectInitiative(null)}
              className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
              data-testid="close-detail-panel-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{initiative.title}</h3>
          <p className="text-sm text-gray-400">{initiative.description}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Status Selector */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => updateInitiativeStatus(initiative.id, value)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-all
                    ${initiative.status === value
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:border-gray-600'
                    }`}
                  data-testid={`status-${value}-btn`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Impact Scores */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Impact Scores</label>
            <div className="space-y-2">
              <ImpactRow label="Business Impact" value={initiative.business_impact_score} color="blue" />
              <ImpactRow label="Technical Impact" value={initiative.technical_impact_score} color="purple" />
              <ImpactRow label="Risk Reduction" value={initiative.risk_reduction_score} color="emerald" />
              <ImpactRow
                label="Velocity Impact"
                value={initiative.velocity_impact_score}
                color={initiative.velocity_impact_score >= 0 ? 'emerald' : 'red'}
                showSign
              />
            </div>
          </div>

          {/* Timeline Info */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Timeline</label>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Target Quarter" value={initiative.target_quarter} />
              <InfoCard label="Target Month" value={`Month ${initiative.target_month}`} />
              <InfoCard label="Effort" value={`${initiative.estimated_effort_hours}h`} />
              <InfoCard label="Complexity" value={initiative.estimated_complexity} capitalize />
            </div>
          </div>

          {/* Predictions */}
          {predictions.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-2 block flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                6-Month Predictions
              </label>
              {predictions.map(prediction => (
                <div key={prediction.id} className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <PredictionMetric label="Debt Impact" value={prediction.debt_impact} />
                    <PredictionMetric label="Velocity Impact" value={prediction.velocity_impact} />
                    <PredictionMetric label="Risk Impact" value={prediction.risk_impact} />
                    <PredictionMetric label="Complexity Impact" value={prediction.complexity_impact} />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-700/30">
                    <span className="text-gray-500">Confidence: {prediction.confidence_score}%</span>
                    {prediction.pareto_optimal === 1 && (
                      <span className="text-emerald-400">Pareto Optimal</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Interactions */}
          {interactions.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-2 block flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Feature Interactions
              </label>

              {/* Synergies */}
              {synergies.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-emerald-400 mb-1">Synergies ({synergies.length})</div>
                  {synergies.map(interaction => {
                    const otherId = interaction.feature_a_id === initiative.id
                      ? interaction.feature_b_id
                      : interaction.feature_a_id;
                    return (
                      <InteractionRow
                        key={interaction.id}
                        name={getRelatedInitiativeName(otherId)}
                        strength={interaction.interaction_strength}
                        type="synergy"
                      />
                    );
                  })}
                </div>
              )}

              {/* Conflicts */}
              {conflicts.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-red-400 mb-1">Conflicts ({conflicts.length})</div>
                  {conflicts.map(interaction => {
                    const otherId = interaction.feature_a_id === initiative.id
                      ? interaction.feature_b_id
                      : interaction.feature_a_id;
                    return (
                      <InteractionRow
                        key={interaction.id}
                        name={getRelatedInitiativeName(otherId)}
                        strength={interaction.interaction_strength}
                        type="conflict"
                      />
                    );
                  })}
                </div>
              )}

              {/* Dependencies */}
              {dependencies.length > 0 && (
                <div>
                  <div className="text-xs text-blue-400 mb-1">Dependencies ({dependencies.length})</div>
                  {dependencies.map(interaction => {
                    const otherId = interaction.feature_a_id === initiative.id
                      ? interaction.feature_b_id
                      : interaction.feature_a_id;
                    return (
                      <InteractionRow
                        key={interaction.id}
                        name={getRelatedInitiativeName(otherId)}
                        strength={interaction.interaction_strength}
                        type="dependency"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Confidence */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Confidence Score</label>
            <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">{initiative.confidence_score}%</span>
                <span className={`text-xs ${
                  initiative.confidence_score >= 70 ? 'text-emerald-400' :
                  initiative.confidence_score >= 50 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {initiative.confidence_score >= 70 ? 'High' :
                   initiative.confidence_score >= 50 ? 'Medium' :
                   'Low'}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    initiative.confidence_score >= 70 ? 'bg-emerald-500' :
                    initiative.confidence_score >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${initiative.confidence_score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ImpactRow({
  label,
  value,
  color,
  showSign,
}: {
  label: string;
  value: number;
  color: string;
  showSign?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  const displayValue = showSign && value > 0 ? `+${value}` : value;

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-300">{displayValue}</span>
        <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClasses[color]} rounded-full`}
            style={{ width: `${Math.abs(value)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/50">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-sm text-gray-200 ${capitalize ? 'capitalize' : ''}`}>{value}</div>
    </div>
  );
}

function PredictionMetric({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${
        isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-gray-400'
      }`}>
        {isPositive ? '+' : ''}{value}
        {isPositive ? <TrendingUp className="w-3 h-3 inline ml-1" /> :
         isNegative ? <TrendingDown className="w-3 h-3 inline ml-1" /> : null}
      </span>
    </div>
  );
}

function InteractionRow({
  name,
  strength,
  type,
}: {
  name: string;
  strength: number;
  type: 'synergy' | 'conflict' | 'dependency';
}) {
  const colors = {
    synergy: 'border-emerald-500/30 bg-emerald-500/5',
    conflict: 'border-red-500/30 bg-red-500/5',
    dependency: 'border-blue-500/30 bg-blue-500/5',
  };

  return (
    <div className={`flex items-center justify-between px-2 py-1.5 rounded border ${colors[type]} mb-1`}>
      <span className="text-xs text-gray-300 truncate">{name}</span>
      <span className="text-xs text-gray-500">{strength}%</span>
    </div>
  );
}
