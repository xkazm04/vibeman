'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug,
  Lightbulb,
  MessageCircle,
  Facebook,
  Twitter,
  Mail,
  ChevronDown,
  ChevronUp,
  Ticket,
  Send,
  Check,
  Clock,
  FileCode,
} from 'lucide-react';
import type { EvaluatedFeedback } from '../lib/types';

interface CompactFeedbackItemProps {
  feedback: EvaluatedFeedback;
  index: number;
  onCreateTicket: (feedbackId: string) => void;
  onSendReply: (feedbackId: string) => void;
  onViewTicket?: (feedback: EvaluatedFeedback) => void;
  onViewRequirement?: (feedback: EvaluatedFeedback) => void;
  isCreatingTicket?: boolean;
  isSendingReply?: boolean;
}

const categoryConfig = {
  bug: { icon: Bug, color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' },
  proposal: { icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' },
  feedback: { icon: MessageCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
};

const channelIcons = {
  facebook: Facebook,
  twitter: Twitter,
  email: Mail,
};

const priorityDots = {
  low: 'bg-gray-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-400',
  critical: 'bg-red-400',
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

export default function CompactFeedbackItem({
  feedback,
  index,
  onCreateTicket,
  onSendReply,
  onViewTicket,
  onViewRequirement,
  isCreatingTicket,
  isSendingReply,
}: CompactFeedbackItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTicketClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewTicket && feedback.ticket) {
      onViewTicket(feedback);
    }
  };

  const handleRequirementClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewRequirement) {
      onViewRequirement(feedback);
    }
  };

  const category = categoryConfig[feedback.category];
  const CategoryIcon = category.icon;
  const ChannelIcon = channelIcons[feedback.channel];
  const priorityDot = priorityDots[feedback.priority];

  const hasTicket = !!feedback.ticket;
  const hasReply = !!feedback.reply;
  const replySent = feedback.reply?.status === 'sent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-lg border border-gray-700/40 bg-gray-800/20 hover:bg-gray-800/40 transition-colors"
    >
      {/* Collapsed view */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2.5 flex items-center gap-3 text-left"
      >
        {/* Priority + Category indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${priorityDot}`} />
          <div className={`p-1.5 rounded ${category.bg}`}>
            <CategoryIcon className={`w-3.5 h-3.5 ${category.color}`} />
          </div>
        </div>

        {/* Summary */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-200 truncate">
            {feedback.summary}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            <ChannelIcon className="w-3 h-3" />
            <span className="truncate">{feedback.author}</span>
            <span>•</span>
            <span>{formatTimeAgo(feedback.timestamp)}</span>
          </div>
        </div>

        {/* Action indicators */}
        <div className="flex items-center gap-2">
          {/* Bug category - show requirement icon */}
          {feedback.category === 'bug' && (
            <button
              onClick={handleRequirementClick}
              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
              title="View Claude Code requirement"
            >
              <FileCode className="w-3 h-3" />
              <span className="text-xs">REQ</span>
            </button>
          )}

          {/* Ticket - clickable */}
          {hasTicket && (
            <button
              onClick={handleTicketClick}
              className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors"
              title="View Jira ticket"
            >
              <Ticket className="w-3 h-3" />
              <span className="text-xs font-mono">{feedback.ticket?.key}</span>
            </button>
          )}

          {replySent && (
            <div className="p-1 rounded bg-emerald-500/10">
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
          )}
          {hasReply && !replySent && (
            <div className="p-1 rounded bg-amber-500/10">
              <Clock className="w-3 h-3 text-amber-400" />
            </div>
          )}

          {/* Expand icon */}
          <div className="text-gray-500">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded view */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 space-y-3 border-t border-gray-700/30">
              {/* Original message */}
              <div className="text-xs">
                <div className="text-gray-500 mb-1">Original message:</div>
                <div className="text-gray-300 bg-gray-900/40 rounded p-2">
                  {feedback.content}
                </div>
              </div>

              {/* Suggested action */}
              <div className="text-xs">
                <div className="text-gray-500 mb-1">Suggested action:</div>
                <div className="text-gray-400">{feedback.suggestedAction}</div>
              </div>

              {/* Ticket details */}
              {feedback.ticket && (
                <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Ticket className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-medium text-purple-300">
                      {feedback.ticket.key}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                      {feedback.ticket.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">{feedback.ticket.title}</div>
                </div>
              )}

              {/* Reply details */}
              {feedback.reply && (
                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-medium text-blue-300">Reply</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      feedback.reply.status === 'sent'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-gray-700/50 text-gray-400'
                    }`}>
                      {feedback.reply.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">{feedback.reply.content}</div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                {!hasTicket && (feedback.category === 'bug' || feedback.category === 'proposal') && (
                  <button
                    onClick={() => onCreateTicket(feedback.originalFeedbackId)}
                    disabled={isCreatingTicket}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    Create Ticket
                  </button>
                )}
                {!replySent && (
                  <button
                    onClick={() => onSendReply(feedback.originalFeedbackId)}
                    disabled={isSendingReply}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Reply
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
