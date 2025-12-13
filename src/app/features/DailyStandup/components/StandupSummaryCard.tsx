'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, Target, Sparkles } from 'lucide-react';
import { StandupSummaryResponse, StandupFocusArea } from '../lib/types';

interface StandupSummaryCardProps {
  summary: StandupSummaryResponse;
}

export default function StandupSummaryCard({ summary }: StandupSummaryCardProps) {
  const generatedDate = new Date(summary.generatedAt);
  const formattedDate = generatedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-gray-800/40 border border-gray-700/40 backdrop-blur-sm"
      data-testid="standup-summary-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{summary.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Generated {formattedDate}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs">
          <Sparkles className="w-3 h-3" />
          AI Generated
        </div>
      </div>

      {/* Summary Text */}
      <div className="prose prose-invert prose-sm max-w-none mb-6">
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{summary.summary}</p>
      </div>

      {/* Focus Areas */}
      {summary.insights.focusAreas.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700/40">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-medium text-gray-300">Focus Areas for Next Period</h4>
          </div>
          <div className="grid gap-2">
            {summary.insights.focusAreas.map((area: StandupFocusArea, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40 border border-gray-700/30"
                data-testid={`standup-focus-area-${index}`}
              >
                <div
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    area.priority === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : area.priority === 'medium'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {area.priority}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{area.area}</div>
                  {area.reason && (
                    <div className="text-xs text-gray-400 mt-1">{area.reason}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
