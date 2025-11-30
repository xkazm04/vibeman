'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  FileCode,
  ChevronRight,
  CheckCircle,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useState } from 'react';
import type { DbDebtPrediction } from '@/app/db';
import { useDebtPredictionStore, type FilterType } from '@/stores/debtPredictionStore';

interface PredictionListProps {
  predictions: DbDebtPrediction[];
  onSelect?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onAddress?: (id: string) => void;
  onEscalate?: (id: string) => void;
}

export default function PredictionList({
  predictions,
  onSelect,
  onDismiss,
  onAddress,
  onEscalate,
}: PredictionListProps) {
  const { predictionFilter, setPredictionFilter, selectedPredictionId } =
    useDebtPredictionStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter predictions
  const filteredPredictions = predictions.filter((p) => {
    if (predictionFilter === 'all') return true;
    if (predictionFilter === 'urgent') return p.urgency_score >= 70;
    return p.prediction_type === predictionFilter;
  });

  const filters: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: predictions.length },
    {
      value: 'urgent',
      label: 'Urgent',
      count: predictions.filter((p) => p.urgency_score >= 70).length,
    },
    {
      value: 'accelerating',
      label: 'Accelerating',
      count: predictions.filter((p) => p.prediction_type === 'accelerating').length,
    },
    {
      value: 'imminent',
      label: 'Imminent',
      count: predictions.filter((p) => p.prediction_type === 'imminent').length,
    },
    {
      value: 'emerging',
      label: 'Emerging',
      count: predictions.filter((p) => p.prediction_type === 'emerging').length,
    },
  ];

  const getPredictionIcon = (type: string, urgency: number) => {
    if (urgency >= 70)
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (type === 'accelerating')
      return <TrendingUp className="w-4 h-4 text-orange-400" />;
    if (type === 'imminent')
      return <Clock className="w-4 h-4 text-yellow-400" />;
    return <FileCode className="w-4 h-4 text-cyan-400" />;
  };

  const getUrgencyColor = (score: number) => {
    if (score >= 70) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (score >= 50) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (score >= 30) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-2 p-4 border-b border-white/5 overflow-x-auto">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setPredictionFilter(filter.value)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
              whitespace-nowrap transition-colors
              ${
                predictionFilter === filter.value
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'
              }
            `}
            data-testid={`filter-${filter.value}`}
          >
            {filter.label}
            <span className="px-1.5 py-0.5 rounded bg-black/30 text-[10px]">
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {filteredPredictions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500"
            >
              <CheckCircle className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No predictions match this filter</p>
            </motion.div>
          ) : (
            filteredPredictions.map((prediction) => (
              <motion.div
                key={prediction.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={`
                  relative rounded-xl border backdrop-blur-sm overflow-hidden cursor-pointer
                  ${
                    selectedPredictionId === prediction.id
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                `}
                onClick={() => {
                  setExpandedId(
                    expandedId === prediction.id ? null : prediction.id
                  );
                  onSelect?.(prediction.id);
                }}
                data-testid={`prediction-item-${prediction.id}`}
              >
                {/* Urgency indicator bar */}
                <div
                  className="absolute top-0 left-0 h-1 w-full"
                  style={{
                    background: `linear-gradient(to right, ${
                      prediction.urgency_score >= 70
                        ? '#ef4444'
                        : prediction.urgency_score >= 50
                        ? '#f97316'
                        : prediction.urgency_score >= 30
                        ? '#eab308'
                        : '#22c55e'
                    }, transparent ${prediction.urgency_score}%)`,
                  }}
                />

                <div className="p-4 pt-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {getPredictionIcon(
                        prediction.prediction_type,
                        prediction.urgency_score
                      )}
                      <div>
                        <h4 className="text-sm font-medium text-white">
                          {prediction.title}
                        </h4>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                          {prediction.file_path}:{prediction.line_start}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Urgency badge */}
                      <span
                        className={`
                          px-2 py-0.5 rounded text-xs font-mono border
                          ${getUrgencyColor(prediction.urgency_score)}
                        `}
                      >
                        {prediction.urgency_score}
                      </span>

                      {/* Trend */}
                      {prediction.complexity_trend === 'increasing' && (
                        <TrendingUp className="w-4 h-4 text-orange-400" />
                      )}

                      <ChevronRight
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          expandedId === prediction.id ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                    {prediction.description}
                  </p>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {expandedId === prediction.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-white/5"
                      >
                        {/* Suggested action */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">
                            Suggested Action:
                          </p>
                          <p className="text-sm text-gray-300">
                            {prediction.suggested_action}
                          </p>
                        </div>

                        {/* Micro-refactoring hint */}
                        {prediction.micro_refactoring && (
                          <div className="mb-3 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            <p className="text-xs text-cyan-400">
                              Quick Fix: {prediction.micro_refactoring}
                            </p>
                          </div>
                        )}

                        {/* Metrics */}
                        <div className="flex gap-4 text-xs mb-4">
                          <div>
                            <span className="text-gray-500">Confidence:</span>
                            <span className="text-white ml-1">
                              {prediction.confidence_score}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Prevention:</span>
                            <span className="text-green-400 ml-1">
                              {prediction.estimated_prevention_effort}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">If ignored:</span>
                            <span className="text-red-400 ml-1">
                              {prediction.estimated_cleanup_effort}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddress?.(prediction.id);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                            data-testid={`address-prediction-${prediction.id}`}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Address
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEscalate?.(prediction.id);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                            data-testid={`escalate-prediction-${prediction.id}`}
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            Escalate
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDismiss?.(prediction.id);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                            data-testid={`dismiss-prediction-${prediction.id}`}
                          >
                            <XCircle className="w-3 h-3" />
                            Dismiss
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
