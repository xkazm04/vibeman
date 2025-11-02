'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, TrendingUp } from 'lucide-react';

interface InsightsPanelProps {
  insights: string[];
  nextSteps: string[];
}

export default function InsightsPanel({ insights, nextSteps }: InsightsPanelProps) {
  const hasContent = (insights && insights.length > 0) || (nextSteps && nextSteps.length > 0);

  if (!hasContent) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="mt-3 p-3 bg-gray-900/60 backdrop-blur-sm border border-gray-700/40 rounded-lg"
    >
      {/* Insights Section */}
      {insights && insights.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-mono text-yellow-400 uppercase tracking-wide">
              Insights
            </span>
          </div>

          <div className="space-y-1.5">
            <AnimatePresence>
              {insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-2 text-xs text-gray-300"
                >
                  <TrendingUp className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="font-mono leading-relaxed">{insight}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Next Steps Section */}
      {nextSteps && nextSteps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="w-4 h-4 text-green-400" />
            <span className="text-xs font-mono text-green-400 uppercase tracking-wide">
              Recommended Next Steps
            </span>
          </div>

          <div className="space-y-1.5">
            <AnimatePresence>
              {nextSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: (insights?.length || 0) * 0.05 + index * 0.05 }}
                  className="relative group"
                >
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="flex items-start gap-2 text-xs text-gray-300 cursor-pointer transition-colors hover:text-green-300"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0 group-hover:shadow-green-500/50 group-hover:shadow-lg transition-all" />
                    <span className="font-mono leading-relaxed">{step}</span>
                  </motion.div>

                  {/* Subtle hover indicator */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={false}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}
