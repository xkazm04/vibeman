'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Target, ChevronRight, AlertTriangle } from 'lucide-react';
import { HealthScoreCategory } from '@/app/db/models/project-health.types';
import { getCategoryLabel, getCategoryColor } from '../lib/healthHelpers';

interface AIInsightsPanelProps {
  explanation: string | null;
  recommendation: string | null;
  focusArea: HealthScoreCategory | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onFocusAreaClick?: (category: HealthScoreCategory) => void;
}

export default function AIInsightsPanel({
  explanation,
  recommendation,
  focusArea,
  isGenerating,
  onGenerate,
  onFocusAreaClick,
}: AIInsightsPanelProps) {
  const focusColor = focusArea ? getCategoryColor(focusArea) : '#6b7280';
  const focusLabel = focusArea ? getCategoryLabel(focusArea) : 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 backdrop-blur-sm p-6"
      data-testid="ai-insights-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Health Analysis</h3>
            <p className="text-xs text-gray-400">Powered by local LLM</p>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg
            bg-purple-500/20 hover:bg-purple-500/30
            text-purple-400 text-sm font-medium
            border border-purple-500/30
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all"
          data-testid="generate-insights-btn"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 gap-3"
          >
            <div className="relative">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <Sparkles className="w-5 h-5 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm text-gray-400">Analyzing project health metrics...</p>
          </motion.div>
        ) : explanation ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Explanation */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Analysis
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed" data-testid="ai-explanation">
                {explanation}
              </p>
            </div>

            {/* Focus Area */}
            {focusArea && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Priority Focus Area
                </h4>
                <button
                  onClick={() => onFocusAreaClick?.(focusArea)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg
                    bg-amber-500/10 border border-amber-500/30
                    hover:bg-amber-500/20 transition-colors group"
                  data-testid="focus-area-btn"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${focusColor}20` }}
                  >
                    <AlertTriangle className="w-5 h-5" style={{ color: focusColor }} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium text-white">{focusLabel}</span>
                    <p className="text-xs text-amber-400/80">Needs immediate attention</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </button>
              </div>
            )}

            {/* Recommendation */}
            {recommendation && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Recommendation
                </h4>
                <div className="flex gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <Target className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300" data-testid="ai-recommendation">
                    {recommendation}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="p-4 bg-white/5 rounded-full mb-3">
              <Sparkles className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Generate AI-powered insights about your project health
            </p>
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg
                bg-purple-500 hover:bg-purple-600
                text-white font-medium
                disabled:opacity-50 transition-all"
              data-testid="generate-insights-initial-btn"
            >
              <Sparkles className="w-4 h-4" />
              Generate Insights
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
