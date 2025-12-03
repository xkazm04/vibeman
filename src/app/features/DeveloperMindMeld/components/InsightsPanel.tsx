'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Check, AlertTriangle, TrendingUp, Brain, ChevronRight } from 'lucide-react';
import { useDeveloperMindMeldStore } from '@/stores/developerMindMeldStore';
import type { DbLearningInsight } from '@/app/db/models/types';

interface InsightsPanelProps {
  projectId: string;
}

export default function InsightsPanel({ projectId }: InsightsPanelProps) {
  const { insights, dismissInsight, acknowledgeInsight, showInsightsPanel, toggleInsightsPanel } =
    useDeveloperMindMeldStore();

  const activeInsights = insights.filter((i) => i.status === 'active');

  const getInsightIcon = (type: DbLearningInsight['insight_type']) => {
    switch (type) {
      case 'pattern_detected':
        return TrendingUp;
      case 'consistency_violation':
        return AlertTriangle;
      case 'skill_gap':
        return Brain;
      case 'preference_learned':
        return Lightbulb;
      case 'prediction_confidence':
        return Check;
      default:
        return Lightbulb;
    }
  };

  const getInsightColor = (importance: DbLearningInsight['importance']) => {
    switch (importance) {
      case 'high':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          icon: 'text-red-400',
          badge: 'bg-red-500/20 text-red-400',
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          icon: 'text-amber-400',
          badge: 'bg-amber-500/20 text-amber-400',
        };
      case 'low':
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          icon: 'text-blue-400',
          badge: 'bg-blue-500/20 text-blue-400',
        };
    }
  };

  if (activeInsights.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating badge to open panel */}
      {!showInsightsPanel && (
        <motion.button
          onClick={toggleInsightsPanel}
          className="fixed bottom-32 right-6 z-40 flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          data-testid="insights-panel-open-btn"
        >
          <Lightbulb className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-300">{activeInsights.length}</span>
          <ChevronRight className="w-3 h-3 text-purple-400" />
        </motion.button>
      )}

      {/* Full panel */}
      <AnimatePresence>
        {showInsightsPanel && (
          <motion.div
            className="fixed bottom-20 right-6 z-40 w-80 max-h-[60vh] bg-gray-900/95 backdrop-blur-xl border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-purple-500/10 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-300">AI Insights</span>
                <span className="px-1.5 py-0.5 bg-purple-500/20 rounded text-[10px] text-purple-400">
                  {activeInsights.length}
                </span>
              </div>
              <button
                onClick={toggleInsightsPanel}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                data-testid="insights-panel-close-btn"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Insights List */}
            <div className="overflow-y-auto max-h-[calc(60vh-50px)]">
              {activeInsights.map((insight) => {
                const Icon = getInsightIcon(insight.insight_type);
                const colors = getInsightColor(insight.importance);

                return (
                  <motion.div
                    key={insight.id}
                    className={`p-3 border-b border-gray-700/30 ${colors.bg}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    layout
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-md ${colors.bg} ${colors.border} border`}>
                        <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-200 truncate">
                            {insight.title}
                          </h4>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${colors.badge}`}>
                            {insight.importance}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2">{insight.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] text-gray-500">
                            {insight.confidence}% confidence
                          </span>
                          <div className="flex-1" />
                          <button
                            onClick={() => acknowledgeInsight(insight.id)}
                            className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                            title="Acknowledge"
                            data-testid={`insight-acknowledge-btn-${insight.id}`}
                          >
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          </button>
                          <button
                            onClick={() => dismissInsight(insight.id)}
                            className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                            title="Dismiss"
                            data-testid={`insight-dismiss-btn-${insight.id}`}
                          >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
