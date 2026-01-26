'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  User,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Bell,
  BellOff,
  XCircle,
  CheckCircle,
  Flame,
} from 'lucide-react';
import type { FeedbackItem } from '../lib/types/feedbackTypes';
import type { EmotionAnalysisResult } from '../lib/emotionDetector';
import type { UrgencyAnalysisResult } from '../lib/urgencyParser';

export type EscalationReason =
  | 'high_urgency'
  | 'angry_customer'
  | 'repeat_contact'
  | 'legal_mention'
  | 'public_complaint'
  | 'vip_customer'
  | 'prolonged_wait';

export interface EscalationItem {
  id: string;
  item: FeedbackItem;
  reasons: EscalationReason[];
  severity: 'critical' | 'high' | 'medium';
  urgency?: UrgencyAnalysisResult;
  emotion?: EmotionAnalysisResult;
  createdAt: string;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

interface EscalationAlertProps {
  escalations: EscalationItem[];
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onViewItem?: (item: FeedbackItem) => void;
  showDismissed?: boolean;
  maxVisible?: number;
}

// Reason labels and icons
const REASON_CONFIG: Record<EscalationReason, { label: string; icon: typeof AlertTriangle; color: string }> = {
  high_urgency: { label: 'High Urgency', icon: Clock, color: 'text-red-400' },
  angry_customer: { label: 'Angry Customer', icon: Flame, color: 'text-orange-400' },
  repeat_contact: { label: 'Repeat Contact', icon: MessageCircle, color: 'text-yellow-400' },
  legal_mention: { label: 'Legal Mention', icon: AlertCircle, color: 'text-red-500' },
  public_complaint: { label: 'Public Complaint', icon: ExternalLink, color: 'text-purple-400' },
  vip_customer: { label: 'VIP Customer', icon: User, color: 'text-blue-400' },
  prolonged_wait: { label: 'Long Wait Time', icon: Clock, color: 'text-amber-400' },
};

// Severity styles
const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    ring: 'ring-red-500/30',
    text: 'text-red-400',
    icon: AlertTriangle,
    pulse: true,
  },
  high: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/40',
    ring: 'ring-orange-500/30',
    text: 'text-orange-400',
    icon: AlertCircle,
    pulse: false,
  },
  medium: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/40',
    ring: 'ring-yellow-500/30',
    text: 'text-yellow-400',
    icon: Bell,
    pulse: false,
  },
};

export default function EscalationAlert({
  escalations,
  onAcknowledge,
  onDismiss,
  onViewItem,
  showDismissed = false,
  maxVisible = 5,
}: EscalationAlertProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // Filter out acknowledged if not showing dismissed
  const visibleEscalations = escalations
    .filter(e => showDismissed || !e.acknowledged)
    .sort((a, b) => {
      // Sort by severity, then by date
      const severityOrder = { critical: 0, high: 1, medium: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const displayedEscalations = showAll ? visibleEscalations : visibleEscalations.slice(0, maxVisible);
  const hiddenCount = visibleEscalations.length - displayedEscalations.length;

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  if (visibleEscalations.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <span className="text-sm text-green-400">No escalations requiring attention</span>
      </div>
    );
  }

  // Count by severity
  const criticalCount = visibleEscalations.filter(e => e.severity === 'critical').length;
  const highCount = visibleEscalations.filter(e => e.severity === 'high').length;

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-sm font-medium text-gray-200">
              Escalations ({visibleEscalations.length})
            </span>
          </div>

          {criticalCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-500/20 text-red-400 animate-pulse">
              {criticalCount} Critical
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-orange-500/20 text-orange-400">
              {highCount} High
            </span>
          )}
        </div>

        {/* Toggle show dismissed */}
        <button
          onClick={() => {/* toggle showDismissed would go here */}}
          className="text-[10px] text-gray-500 hover:text-gray-400"
        >
          {showDismissed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </button>
      </div>

      {/* Escalation cards */}
      <div className="space-y-2">
        <AnimatePresence>
          {displayedEscalations.map((escalation) => {
            const styles = SEVERITY_STYLES[escalation.severity];
            const SeverityIcon = styles.icon;
            const isExpanded = expanded.has(escalation.id);

            return (
              <motion.div
                key={escalation.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`
                  rounded-lg border ${styles.border} ${styles.bg}
                  ${styles.pulse ? 'ring-2 ' + styles.ring : ''}
                  ${escalation.acknowledged ? 'opacity-60' : ''}
                  overflow-hidden
                `}
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                  onClick={() => toggleExpand(escalation.id)}
                >
                  {/* Severity icon */}
                  <div className={`p-1.5 rounded-lg ${styles.bg}`}>
                    <SeverityIcon className={`w-4 h-4 ${styles.text} ${styles.pulse ? 'animate-pulse' : ''}`} />
                  </div>

                  {/* Content preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200 truncate">
                        {escalation.item.author.name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {getTimeAgo(escalation.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {escalation.item.content.subject || escalation.item.content.body.slice(0, 60)}
                    </div>
                  </div>

                  {/* Reason badges */}
                  <div className="flex gap-1">
                    {escalation.reasons.slice(0, 2).map((reason) => {
                      const config = REASON_CONFIG[reason];
                      const ReasonIcon = config.icon;
                      return (
                        <div
                          key={reason}
                          className={`p-1 rounded ${config.color} bg-gray-800/50`}
                          title={config.label}
                        >
                          <ReasonIcon className="w-3 h-3" />
                        </div>
                      );
                    })}
                    {escalation.reasons.length > 2 && (
                      <span className="text-[10px] text-gray-500 self-center">
                        +{escalation.reasons.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Expand indicator */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    className="text-gray-500"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-800"
                    >
                      <div className="px-3 py-3 space-y-3">
                        {/* Full message */}
                        <div className="text-xs text-gray-300 bg-gray-800/50 p-2 rounded">
                          {escalation.item.content.body.slice(0, 300)}
                          {escalation.item.content.body.length > 300 && '...'}
                        </div>

                        {/* Reasons list */}
                        <div>
                          <div className="text-[10px] text-gray-500 mb-1">Escalation Reasons</div>
                          <div className="flex flex-wrap gap-1.5">
                            {escalation.reasons.map((reason) => {
                              const config = REASON_CONFIG[reason];
                              const ReasonIcon = config.icon;
                              return (
                                <div
                                  key={reason}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${config.color} bg-gray-800/50`}
                                >
                                  <ReasonIcon className="w-3 h-3" />
                                  <span>{config.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Urgency info */}
                        {escalation.urgency && (
                          <div className="flex items-center gap-2 text-[10px]">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-400">
                              Suggested response: {escalation.urgency.suggestedResponseTime}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-800">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewItem?.(escalation.item);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                          >
                            View Details
                          </button>
                          {!escalation.acknowledged && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAcknowledge?.(escalation.id);
                              }}
                              className="flex-1 px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded transition-colors"
                            >
                              Acknowledge
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDismiss?.(escalation.id);
                            }}
                            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Acknowledged info */}
                        {escalation.acknowledged && (
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <CheckCircle className="w-3 h-3" />
                            <span>
                              Acknowledged by {escalation.acknowledgedBy || 'Unknown'} • {' '}
                              {escalation.acknowledgedAt && getTimeAgo(escalation.acknowledgedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Show more/less */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-xs text-gray-500 hover:text-gray-400 flex items-center justify-center gap-1"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            {showAll ? 'Show less' : `Show ${hiddenCount} more`}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact escalation indicator for cards
 */
interface EscalationIndicatorProps {
  severity: 'critical' | 'high' | 'medium';
  reasons: EscalationReason[];
  compact?: boolean;
}

export function EscalationIndicator({ severity, reasons, compact = false }: EscalationIndicatorProps) {
  const styles = SEVERITY_STYLES[severity];
  const SeverityIcon = styles.icon;

  if (compact) {
    return (
      <div
        className={`p-1 rounded ${styles.bg} ${styles.pulse ? 'animate-pulse' : ''}`}
        title={`${severity.charAt(0).toUpperCase() + severity.slice(1)} escalation: ${reasons.map(r => REASON_CONFIG[r].label).join(', ')}`}
      >
        <SeverityIcon className={`w-3 h-3 ${styles.text}`} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${styles.border} ${styles.bg}`}>
      <SeverityIcon className={`w-3 h-3 ${styles.text} ${styles.pulse ? 'animate-pulse' : ''}`} />
      <span className={`text-[10px] font-medium ${styles.text} capitalize`}>{severity}</span>
    </div>
  );
}

// Helper function
function getTimeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
