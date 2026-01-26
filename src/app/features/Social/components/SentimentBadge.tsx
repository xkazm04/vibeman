'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Angry,
  Frown,
  Meh,
  ThumbsUp,
  Lightbulb,
  Heart,
  Ghost,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import type { Sentiment } from '../lib/types/feedbackTypes';
import type { SentimentAnalysisResult, SentimentScore } from '../lib/sentimentAnalyzer';

// Enhanced sentiment icons
const SENTIMENT_ICONS: Record<Sentiment, LucideIcon> = {
  angry: Angry,
  frustrated: Frown,
  disappointed: Meh,
  neutral: Meh,
  constructive: Lightbulb,
  helpful: Heart,
  mocking: Ghost,
};

// Sentiment colors with gradients
const SENTIMENT_STYLES: Record<Sentiment, { bg: string; text: string; border: string; gradient: string }> = {
  angry: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    gradient: 'from-red-500/20 to-red-600/10',
  },
  frustrated: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    gradient: 'from-orange-500/20 to-orange-600/10',
  },
  disappointed: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    gradient: 'from-amber-500/20 to-amber-600/10',
  },
  neutral: {
    bg: 'bg-gray-500/15',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
    gradient: 'from-gray-500/20 to-gray-600/10',
  },
  constructive: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    gradient: 'from-blue-500/20 to-blue-600/10',
  },
  helpful: {
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
    gradient: 'from-green-500/20 to-green-600/10',
  },
  mocking: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    gradient: 'from-purple-500/20 to-purple-600/10',
  },
};

interface SentimentBadgeProps {
  sentiment: Sentiment;
  score?: number; // -1 to 1
  confidence?: number; // 0 to 1
  signals?: string[];
  showIcon?: boolean;
  showScore?: boolean;
  showConfidence?: boolean;
  expandable?: boolean;
  trend?: 'up' | 'down' | 'stable'; // Trend compared to previous
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'detailed';
  analysisResult?: SentimentAnalysisResult;
}

export default function SentimentBadge({
  sentiment,
  score,
  confidence,
  signals,
  showIcon = true,
  showScore = false,
  showConfidence = false,
  expandable = false,
  trend,
  size = 'sm',
  variant = 'default',
  analysisResult,
}: SentimentBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const Icon = SENTIMENT_ICONS[sentiment];
  const styles = SENTIMENT_STYLES[sentiment];

  // Size classes
  const sizeClasses = {
    xs: { icon: 'w-2.5 h-2.5', text: 'text-[10px]', padding: 'px-1.5 py-0.5', gap: 'gap-1' },
    sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-2 py-0.5', gap: 'gap-1.5' },
    md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-2.5 py-1', gap: 'gap-2' },
    lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-3 py-1.5', gap: 'gap-2' },
  };

  const currentSize = sizeClasses[size];

  // Trend icon
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-500';

  if (variant === 'minimal') {
    return (
      <div
        className={`inline-flex items-center ${currentSize.gap} ${currentSize.padding} rounded ${styles.bg} ${styles.text}`}
        title={`Sentiment: ${sentiment}`}
      >
        {showIcon && <Icon className={currentSize.icon} />}
      </div>
    );
  }

  return (
    <div className="inline-block">
      <motion.div
        className={`
          inline-flex items-center ${currentSize.gap} ${currentSize.padding} rounded-full border
          ${styles.bg} ${styles.text} ${styles.border}
          ${expandable ? 'cursor-pointer hover:border-opacity-60' : ''}
          transition-all duration-200
        `}
        onClick={() => expandable && setIsExpanded(!isExpanded)}
        whileHover={expandable ? { scale: 1.02 } : undefined}
        whileTap={expandable ? { scale: 0.98 } : undefined}
      >
        {showIcon && <Icon className={currentSize.icon} />}
        <span className={`${currentSize.text} font-medium capitalize`}>{sentiment}</span>

        {showScore && score !== undefined && (
          <span className={`${currentSize.text} opacity-70`}>
            ({score > 0 ? '+' : ''}{(score * 100).toFixed(0)}%)
          </span>
        )}

        {showConfidence && confidence !== undefined && (
          <span className={`${currentSize.text} opacity-60`}>
            • {(confidence * 100).toFixed(0)}% conf
          </span>
        )}

        {trend && (
          <TrendIcon className={`${currentSize.icon} ${trendColor}`} />
        )}

        {expandable && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className={`${currentSize.icon} opacity-50`} />
          </motion.div>
        )}
      </motion.div>

      {/* Expanded details */}
      <AnimatePresence>
        {expandable && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className={`bg-gradient-to-r ${styles.gradient} rounded-lg border ${styles.border} p-3 overflow-hidden`}
          >
            {/* Score breakdown */}
            {analysisResult && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-400 mb-2">Sentiment Breakdown</div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="text-[10px] text-green-400 mb-1">Positive</div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${analysisResult.breakdown.positive * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-red-400 mb-1">Negative</div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${analysisResult.breakdown.negative * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Signals */}
            {(signals || analysisResult?.overall.signals) && (
              <div>
                <div className="text-xs font-medium text-gray-400 mb-1.5">Key Signals</div>
                <div className="flex flex-wrap gap-1">
                  {(signals || analysisResult?.overall.signals || []).slice(0, 6).map((signal, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${styles.bg} ${styles.text} opacity-80`}
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords */}
            {analysisResult?.keywords && analysisResult.keywords.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700/50">
                <div className="text-xs font-medium text-gray-400 mb-1.5">Contributing Keywords</div>
                <div className="flex flex-wrap gap-1">
                  {analysisResult.keywords.slice(0, 8).map((kw, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        kw.category === 'positive'
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : kw.category === 'negative'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                      }`}
                    >
                      {kw.word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact sentiment indicator (just icon + color)
 */
export function SentimentIndicator({ sentiment, size = 'sm' }: { sentiment: Sentiment; size?: 'xs' | 'sm' | 'md' }) {
  const Icon = SENTIMENT_ICONS[sentiment];
  const styles = SENTIMENT_STYLES[sentiment];

  const sizeClass = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className={`p-1 rounded ${styles.bg}`} title={`Sentiment: ${sentiment}`}>
      <Icon className={`${sizeClass} ${styles.text}`} />
    </div>
  );
}

/**
 * Sentiment score bar visualization
 */
export function SentimentScoreBar({ score, showLabel = true }: { score: number; showLabel?: boolean }) {
  // Score ranges from -1 to 1, center is 0
  const percentage = ((score + 1) / 2) * 100;
  const isPositive = score >= 0;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-red-400">Negative</span>
          <span className="text-gray-500">Neutral</span>
          <span className="text-green-400">Positive</span>
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full relative overflow-hidden">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600" />

        {/* Score indicator */}
        <motion.div
          className={`absolute top-0 bottom-0 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
          initial={false}
          animate={{
            left: isPositive ? '50%' : `${percentage}%`,
            width: isPositive ? `${percentage - 50}%` : `${50 - percentage}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
