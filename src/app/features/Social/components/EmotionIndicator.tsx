'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Heart,
  AlertCircle,
  Smile,
  Flame,
  ThumbsDown,
  ChevronRight,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EmotionType, DetectedEmotion, EmotionAnalysisResult } from '../lib/emotionDetector';

// Emotion icons
const EMOTION_ICONS: Record<EmotionType, LucideIcon> = {
  frustration: AlertTriangle,
  confusion: HelpCircle,
  excitement: Sparkles,
  disappointment: ThumbsDown,
  gratitude: Heart,
  anxiety: AlertCircle,
  anger: Flame,
  satisfaction: Smile,
};

// Emotion styles
const EMOTION_STYLES: Record<EmotionType, { bg: string; text: string; border: string; ring: string }> = {
  frustration: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    ring: 'ring-orange-500/50',
  },
  confusion: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    ring: 'ring-purple-500/50',
  },
  excitement: {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    ring: 'ring-yellow-500/50',
  },
  disappointment: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
    ring: 'ring-slate-500/50',
  },
  gratitude: {
    bg: 'bg-pink-500/15',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    ring: 'ring-pink-500/50',
  },
  anxiety: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    ring: 'ring-cyan-500/50',
  },
  anger: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    ring: 'ring-red-500/50',
  },
  satisfaction: {
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
    ring: 'ring-green-500/50',
  },
};

// Emotion labels
const EMOTION_LABELS: Record<EmotionType, string> = {
  frustration: 'Frustrated',
  confusion: 'Confused',
  excitement: 'Excited',
  disappointment: 'Disappointed',
  gratitude: 'Grateful',
  anxiety: 'Anxious',
  anger: 'Angry',
  satisfaction: 'Satisfied',
};

interface EmotionIndicatorProps {
  emotion: EmotionType;
  intensity?: number; // 0 to 1
  confidence?: number; // 0 to 1
  signals?: string[];
  showLabel?: boolean;
  showIntensity?: boolean;
  expandable?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'pill' | 'icon-only' | 'detailed';
}

export default function EmotionIndicator({
  emotion,
  intensity = 0.5,
  confidence,
  signals,
  showLabel = true,
  showIntensity = false,
  expandable = false,
  size = 'sm',
  variant = 'badge',
}: EmotionIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const Icon = EMOTION_ICONS[emotion];
  const styles = EMOTION_STYLES[emotion];
  const label = EMOTION_LABELS[emotion];

  // Size classes
  const sizeClasses = {
    xs: { icon: 'w-2.5 h-2.5', text: 'text-[10px]', padding: 'px-1.5 py-0.5' },
    sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-2 py-0.5' },
    md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-2.5 py-1' },
    lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-3 py-1.5' },
  };

  const currentSize = sizeClasses[size];

  // Intensity indicator width
  const intensityWidth = Math.round(intensity * 100);

  if (variant === 'icon-only') {
    return (
      <div
        className={`p-1 rounded ${styles.bg} ${intensity >= 0.7 ? 'ring-1 ' + styles.ring : ''}`}
        title={`${label} (${intensityWidth}% intensity)`}
      >
        <Icon className={`${currentSize.icon} ${styles.text}`} />
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1 ${currentSize.padding} rounded-full ${styles.bg} ${styles.text}`}
      >
        <Icon className={currentSize.icon} />
        {showLabel && <span className={`${currentSize.text} font-medium`}>{label}</span>}
      </div>
    );
  }

  return (
    <div className="inline-block">
      <motion.div
        className={`
          inline-flex items-center gap-1.5 ${currentSize.padding} rounded-lg border
          ${styles.bg} ${styles.text} ${styles.border}
          ${expandable ? 'cursor-pointer hover:border-opacity-60' : ''}
          ${intensity >= 0.7 ? 'ring-1 ' + styles.ring : ''}
          transition-all duration-200
        `}
        onClick={() => expandable && setIsExpanded(!isExpanded)}
        whileHover={expandable ? { scale: 1.02 } : undefined}
      >
        <Icon className={currentSize.icon} />

        {showLabel && (
          <span className={`${currentSize.text} font-medium`}>{label}</span>
        )}

        {showIntensity && (
          <div className="flex items-center gap-1 ml-1">
            <div className="w-10 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${styles.text.replace('text-', 'bg-')}`}
                initial={{ width: 0 }}
                animate={{ width: `${intensityWidth}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className={`${currentSize.text} opacity-70`}>{intensityWidth}%</span>
          </div>
        )}

        {expandable && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className={`${currentSize.icon} opacity-50`} />
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
            {/* Intensity bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] mb-1">
                <span className={styles.text}>Intensity</span>
                <span className={styles.text}>{intensityWidth}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${styles.text.replace('text-', 'bg-')}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${intensityWidth}%` }}
                />
              </div>
            </div>

            {/* Confidence */}
            {confidence !== undefined && (
              <div className="mb-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-gray-400">Confidence</span>
                  <span className="text-gray-400">{Math.round(confidence * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-500"
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Signals */}
            {signals && signals.length > 0 && (
              <div>
                <div className="text-[10px] text-gray-400 mb-1.5">Detected Signals</div>
                <div className="flex flex-wrap gap-1">
                  {signals.map((signal, i) => (
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Multi-emotion display showing primary and secondary emotions
 */
interface EmotionStackProps {
  result: EmotionAnalysisResult;
  maxEmotions?: number;
  size?: 'xs' | 'sm' | 'md';
  showIntensityMeter?: boolean;
}

export function EmotionStack({
  result,
  maxEmotions = 3,
  size = 'sm',
  showIntensityMeter = false,
}: EmotionStackProps) {
  if (!result.primary) {
    return (
      <div className="text-xs text-gray-500 italic">No strong emotions detected</div>
    );
  }

  const emotions = [result.primary, ...result.secondary].slice(0, maxEmotions);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {emotions.map((emotion, i) => (
          <EmotionIndicator
            key={emotion.type}
            emotion={emotion.type}
            intensity={emotion.intensity}
            confidence={emotion.confidence}
            signals={i === 0 ? emotion.signals : undefined}
            showLabel
            showIntensity={i === 0}
            expandable={i === 0}
            size={i === 0 ? size : 'xs'}
            variant={i === 0 ? 'detailed' : 'pill'}
          />
        ))}
      </div>

      {/* Overall emotional intensity meter */}
      {showIntensityMeter && (
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-gray-500" />
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                result.emotionalIntensity >= 0.7
                  ? 'bg-red-500'
                  : result.emotionalIntensity >= 0.4
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${result.emotionalIntensity * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500">
            {Math.round(result.emotionalIntensity * 100)}%
          </span>
        </div>
      )}

      {/* Attention flag */}
      {result.needsAttention && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400 mt-1">
          <AlertTriangle className="w-3 h-3" />
          <span>Needs immediate attention</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact emotion badge for card displays
 */
export function EmotionBadgeCompact({ emotion, intensity }: { emotion: EmotionType; intensity: number }) {
  const Icon = EMOTION_ICONS[emotion];
  const styles = EMOTION_STYLES[emotion];

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${styles.bg} ${styles.text}`}
      title={`${EMOTION_LABELS[emotion]} (${Math.round(intensity * 100)}%)`}
    >
      <Icon className="w-2.5 h-2.5" />
      <span className="capitalize">{emotion}</span>
    </div>
  );
}
