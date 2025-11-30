'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  AlertTriangle,
  Lightbulb,
  Clock,
  ChevronRight,
  X,
  Check,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useState } from 'react';
import type { OpportunityCard as OpportunityCardType } from '@/stores/debtPredictionStore';

interface OpportunityCardProps {
  card: OpportunityCardType;
  onDismiss: (id: string) => void;
  onAct: (id: string) => void;
  onFeedback: (id: string, helpful: boolean) => void;
  isExpanded?: boolean;
}

export default function OpportunityCard({
  card,
  onDismiss,
  onAct,
  onFeedback,
  isExpanded = false,
}: OpportunityCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [actedUpon, setActedUpon] = useState(card.acted_upon);

  const cardTypeConfig = {
    prevention: {
      icon: Shield,
      color: 'cyan',
      bgClass: 'bg-cyan-500/10 border-cyan-500/30',
      iconClass: 'text-cyan-400',
      label: 'Prevention',
    },
    'quick-win': {
      icon: Zap,
      color: 'green',
      bgClass: 'bg-green-500/10 border-green-500/30',
      iconClass: 'text-green-400',
      label: 'Quick Win',
    },
    warning: {
      icon: AlertTriangle,
      color: 'orange',
      bgClass: 'bg-orange-500/10 border-orange-500/30',
      iconClass: 'text-orange-400',
      label: 'Warning',
    },
    suggestion: {
      icon: Lightbulb,
      color: 'blue',
      bgClass: 'bg-blue-500/10 border-blue-500/30',
      iconClass: 'text-blue-400',
      label: 'Suggestion',
    },
  };

  const config = cardTypeConfig[card.card_type] || cardTypeConfig.suggestion;
  const Icon = config.icon;

  const handleAct = () => {
    setActedUpon(true);
    setShowActions(true);
    onAct(card.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        relative rounded-xl border backdrop-blur-sm overflow-hidden
        ${config.bgClass}
        hover:border-opacity-60 transition-all duration-200
      `}
      data-testid={`opportunity-card-${card.id}`}
    >
      {/* Priority indicator */}
      <div
        className="absolute top-0 left-0 w-1 h-full"
        style={{
          background: `linear-gradient(to bottom, ${
            card.priority >= 8
              ? '#ef4444'
              : card.priority >= 5
              ? '#eab308'
              : '#22c55e'
          }, transparent)`,
        }}
      />

      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg ${config.bgClass} border border-${config.color}-500/20`}
            >
              <Icon className={`w-4 h-4 ${config.iconClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${config.bgClass} ${config.iconClass}`}
                >
                  {config.label}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  P{card.priority}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white leading-tight">
                {card.title}
              </h4>
            </div>
          </div>

          {/* Dismiss button */}
          {!actedUpon && (
            <button
              onClick={() => onDismiss(card.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              data-testid={`dismiss-card-${card.id}`}
            >
              <X className="w-4 h-4 text-gray-500 hover:text-gray-300" />
            </button>
          )}
        </div>

        {/* Summary */}
        <p className="text-xs text-gray-400 mt-2 line-clamp-2">{card.summary}</p>

        {/* Action section */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-xs text-gray-300 mb-2">
              <span className="text-gray-500">Action:</span>{' '}
              {card.action_description}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          {/* Time estimate */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{card.estimated_time_minutes}min</span>
          </div>

          {/* Action buttons */}
          {!actedUpon ? (
            <button
              onClick={handleAct}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-${config.color}-500/20 hover:bg-${config.color}-500/30
                ${config.iconClass} transition-colors
              `}
              data-testid={`act-card-${card.id}`}
            >
              Apply
              <ChevronRight className="w-3 h-3" />
            </button>
          ) : showActions ? (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs text-gray-400">Was this helpful?</span>
              <button
                onClick={() => {
                  onFeedback(card.id, true);
                  setShowActions(false);
                }}
                className="p-1.5 hover:bg-green-500/20 rounded-lg transition-colors"
                data-testid={`feedback-helpful-${card.id}`}
              >
                <ThumbsUp className="w-3.5 h-3.5 text-green-400" />
              </button>
              <button
                onClick={() => {
                  onFeedback(card.id, false);
                  setShowActions(false);
                }}
                className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                data-testid={`feedback-not-helpful-${card.id}`}
              >
                <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
              </button>
            </motion.div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3 h-3" />
              <span>Applied</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
