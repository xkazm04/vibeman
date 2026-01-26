'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug,
  Lightbulb,
  HelpCircle,
  Heart,
  AlertTriangle,
  MessageCircle,
  ChevronDown,
  Target,
  Users,
  Tag,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import type { FeedbackClassification, DevTeam } from '../lib/types/aiTypes';
import type { ClassificationResult } from '../lib/feedbackClassifier';

// Extended classification type
type ExtendedClassification = FeedbackClassification | 'question' | 'praise' | 'complaint';

// Classification icons
const CLASSIFICATION_ICONS: Record<ExtendedClassification, LucideIcon> = {
  bug: Bug,
  feature: Lightbulb,
  clarification: MessageCircle,
  question: HelpCircle,
  praise: Heart,
  complaint: AlertTriangle,
};

// Classification styles
const CLASSIFICATION_STYLES: Record<ExtendedClassification, { bg: string; text: string; border: string }> = {
  bug: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  feature: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  clarification: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  question: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  praise: {
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  complaint: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
};

// Classification labels
const CLASSIFICATION_LABELS: Record<ExtendedClassification, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  clarification: 'Clarification',
  question: 'Question',
  praise: 'Praise',
  complaint: 'Complaint',
};

interface ClassificationBadgeProps {
  classification: ExtendedClassification;
  confidence?: number; // 0 to 1
  signals?: string[];
  suggestedTeam?: DevTeam;
  tags?: string[];
  showIcon?: boolean;
  showConfidence?: boolean;
  expandable?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'pill' | 'card';
  result?: ClassificationResult;
  onCorrect?: (newClassification: ExtendedClassification) => void;
}

export default function ClassificationBadge({
  classification,
  confidence,
  signals,
  suggestedTeam,
  tags,
  showIcon = true,
  showConfidence = true,
  expandable = false,
  size = 'sm',
  variant = 'badge',
  result,
  onCorrect,
}: ClassificationBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCorrectMenu, setShowCorrectMenu] = useState(false);

  const Icon = CLASSIFICATION_ICONS[classification];
  const styles = CLASSIFICATION_STYLES[classification];
  const label = CLASSIFICATION_LABELS[classification];

  // Use result values if provided
  const displayConfidence = confidence ?? result?.confidence;
  const displaySignals = signals ?? result?.signals;
  const displayTeam = suggestedTeam ?? result?.suggestedTeam;
  const displayTags = tags ?? result?.tags;
  const needsReview = result?.needsReview ?? (displayConfidence !== undefined && displayConfidence < 0.7);

  // Size classes
  const sizeClasses = {
    xs: { icon: 'w-2.5 h-2.5', text: 'text-[10px]', padding: 'px-1.5 py-0.5' },
    sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-2 py-0.5' },
    md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-2.5 py-1' },
    lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-3 py-1.5' },
  };

  const currentSize = sizeClasses[size];

  // Confidence color
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-400';
    if (conf >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1 ${currentSize.padding} rounded-full ${styles.bg} ${styles.text}`}
        title={`${label}${displayConfidence ? ` (${Math.round(displayConfidence * 100)}% confidence)` : ''}`}
      >
        {showIcon && <Icon className={currentSize.icon} />}
        <span className={`${currentSize.text} font-medium`}>{classification}</span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-lg border ${styles.border} ${styles.bg} p-3`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${styles.bg}`}>
              <Icon className={`w-4 h-4 ${styles.text}`} />
            </div>
            <div>
              <div className={`text-sm font-medium ${styles.text}`}>{label}</div>
              {displayConfidence !== undefined && (
                <div className={`text-[10px] ${getConfidenceColor(displayConfidence)}`}>
                  {Math.round(displayConfidence * 100)}% confidence
                </div>
              )}
            </div>
          </div>

          {needsReview && (
            <div className="px-2 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded-full">
              Needs Review
            </div>
          )}
        </div>

        {/* Signals */}
        {displaySignals && displaySignals.length > 0 && (
          <div className="mb-2">
            <div className="text-[10px] text-gray-500 mb-1">Detected Signals</div>
            <div className="flex flex-wrap gap-1">
              {displaySignals.slice(0, 6).map((signal, i) => (
                <span
                  key={i}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${styles.bg} ${styles.text}`}
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Team and Tags */}
        <div className="flex items-center gap-3 text-[10px]">
          {displayTeam && (
            <div className="flex items-center gap-1 text-gray-400">
              <Users className="w-3 h-3" />
              <span className="capitalize">{displayTeam}</span>
            </div>
          )}
          {displayTags && displayTags.length > 0 && (
            <div className="flex items-center gap-1 text-gray-400">
              <Tag className="w-3 h-3" />
              <span>{displayTags.slice(0, 3).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Correct button */}
        {onCorrect && (
          <div className="mt-2 pt-2 border-t border-gray-800">
            <button
              onClick={() => setShowCorrectMenu(!showCorrectMenu)}
              className="text-[10px] text-gray-500 hover:text-gray-400"
            >
              Correct classification...
            </button>
            {showCorrectMenu && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.keys(CLASSIFICATION_LABELS).map((c) => (
                  c !== classification && (
                    <button
                      key={c}
                      onClick={() => {
                        onCorrect(c as ExtendedClassification);
                        setShowCorrectMenu(false);
                      }}
                      className={`text-[10px] px-2 py-1 rounded border ${
                        CLASSIFICATION_STYLES[c as ExtendedClassification].border
                      } ${CLASSIFICATION_STYLES[c as ExtendedClassification].text} hover:opacity-80`}
                    >
                      {c}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <div className="inline-block">
      <motion.div
        className={`
          inline-flex items-center gap-1.5 ${currentSize.padding} rounded-lg border
          ${styles.bg} ${styles.text} ${styles.border}
          ${needsReview ? 'ring-1 ring-yellow-500/30' : ''}
          ${expandable ? 'cursor-pointer hover:border-opacity-60' : ''}
          transition-all duration-200
        `}
        onClick={() => expandable && setIsExpanded(!isExpanded)}
        whileHover={expandable ? { scale: 1.02 } : undefined}
      >
        {showIcon && <Icon className={currentSize.icon} />}
        <span className={`${currentSize.text} font-medium capitalize`}>{classification}</span>

        {showConfidence && displayConfidence !== undefined && (
          <span className={`${currentSize.text} ${getConfidenceColor(displayConfidence)}`}>
            {Math.round(displayConfidence * 100)}%
          </span>
        )}

        {needsReview && (
          <AlertTriangle className={`${currentSize.icon} text-yellow-400`} />
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
            className={`rounded-lg border ${styles.border} ${styles.bg} p-3 overflow-hidden`}
          >
            {/* Confidence meter */}
            {displayConfidence !== undefined && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    Confidence
                  </span>
                  <span className={getConfidenceColor(displayConfidence)}>
                    {Math.round(displayConfidence * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      displayConfidence >= 0.8
                        ? 'bg-green-500'
                        : displayConfidence >= 0.6
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${displayConfidence * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Signals */}
            {displaySignals && displaySignals.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] text-gray-400 mb-1.5 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Signals
                </div>
                <div className="flex flex-wrap gap-1">
                  {displaySignals.map((signal, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${styles.bg} ${styles.text} border ${styles.border}`}
                    >
                      "{signal}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Team */}
            {displayTeam && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-2">
                <Users className="w-3 h-3" />
                <span>Suggested team:</span>
                <span className="text-gray-300 capitalize">{displayTeam}</span>
              </div>
            )}

            {/* Tags */}
            {displayTags && displayTags.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {displayTags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
                    >
                      {tag}
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
 * Compact classification indicator
 */
export function ClassificationIndicator({
  classification,
  size = 'sm',
}: {
  classification: ExtendedClassification;
  size?: 'xs' | 'sm' | 'md';
}) {
  const Icon = CLASSIFICATION_ICONS[classification];
  const styles = CLASSIFICATION_STYLES[classification];
  const sizeClass = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div
      className={`p-1 rounded ${styles.bg}`}
      title={CLASSIFICATION_LABELS[classification]}
    >
      <Icon className={`${sizeClass} ${styles.text}`} />
    </div>
  );
}

/**
 * Classification summary showing distribution
 */
export function ClassificationSummary({
  counts,
}: {
  counts: Record<ExtendedClassification, number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex gap-2">
      {Object.entries(counts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([classification, count]) => {
          const styles = CLASSIFICATION_STYLES[classification as ExtendedClassification];
          const Icon = CLASSIFICATION_ICONS[classification as ExtendedClassification];
          const percentage = Math.round((count / total) * 100);

          return (
            <div
              key={classification}
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${styles.bg} ${styles.text}`}
              title={`${CLASSIFICATION_LABELS[classification as ExtendedClassification]}: ${count} (${percentage}%)`}
            >
              <Icon className="w-3 h-3" />
              <span className="text-xs font-medium">{count}</span>
            </div>
          );
        })}
    </div>
  );
}
