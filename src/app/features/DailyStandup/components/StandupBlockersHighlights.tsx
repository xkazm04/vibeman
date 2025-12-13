'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Trophy,
  Target,
  Zap,
  TrendingUp,
  CheckCircle,
  Lightbulb,
} from 'lucide-react';
import { StandupBlocker, StandupHighlight } from '../lib/types';

interface StandupBlockersHighlightsProps {
  blockers: StandupBlocker[];
  highlights: StandupHighlight[];
}

export default function StandupBlockersHighlights({
  blockers,
  highlights,
}: StandupBlockersHighlightsProps) {
  if (blockers.length === 0 && highlights.length === 0) {
    return null;
  }

  const getHighlightIcon = (type: StandupHighlight['type']) => {
    switch (type) {
      case 'achievement':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'milestone':
        return <Target className="w-4 h-4 text-purple-400" />;
      case 'quality_improvement':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'velocity_boost':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      default:
        return <Zap className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getSeverityColor = (severity: StandupBlocker['severity']) => {
    switch (severity) {
      case 'high':
        return 'border-red-500/40 bg-red-900/20';
      case 'medium':
        return 'border-amber-500/40 bg-amber-900/20';
      default:
        return 'border-yellow-500/40 bg-yellow-900/20';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Blockers */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-5 rounded-xl bg-gray-800/30 border border-gray-700/40"
        data-testid="standup-blockers-section"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Blockers & Risks</h3>
          {blockers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs">
              {blockers.length}
            </span>
          )}
        </div>

        {blockers.length === 0 ? (
          <div className="text-gray-500 text-sm py-4 text-center">
            No blockers detected this period
          </div>
        ) : (
          <div className="space-y-3">
            {blockers.map((blocker, index) => (
              <motion.div
                key={blocker.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getSeverityColor(blocker.severity)}`}
                data-testid={`standup-blocker-${index}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          blocker.severity === 'high'
                            ? 'bg-red-500/30 text-red-300'
                            : blocker.severity === 'medium'
                              ? 'bg-amber-500/30 text-amber-300'
                              : 'bg-yellow-500/30 text-yellow-300'
                        }`}
                      >
                        {blocker.severity}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-white">{blocker.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{blocker.description}</p>
                    {blocker.suggestedAction && (
                      <div className="mt-2 pt-2 border-t border-gray-700/40">
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                          <Lightbulb className="w-3 h-3" />
                          <span>Suggested: {blocker.suggestedAction}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Highlights */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-5 rounded-xl bg-gray-800/30 border border-gray-700/40"
        data-testid="standup-highlights-section"
      >
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-white">Highlights</h3>
          {highlights.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs">
              {highlights.length}
            </span>
          )}
        </div>

        {highlights.length === 0 ? (
          <div className="text-gray-500 text-sm py-4 text-center">
            No highlights for this period
          </div>
        ) : (
          <div className="space-y-3">
            {highlights.map((highlight, index) => (
              <motion.div
                key={highlight.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg border border-green-500/30 bg-green-900/20"
                data-testid={`standup-highlight-${index}`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-gray-800/60">
                    {getHighlightIcon(highlight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500 capitalize">
                        {highlight.type.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-white">{highlight.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{highlight.description}</p>
                    {highlight.metric && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/20 text-green-300 text-xs">
                        <Zap className="w-3 h-3" />
                        {highlight.metric}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
