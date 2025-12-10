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
  ExternalLink,
  Ticket,
  Send,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { EvaluatedFeedback, JiraTicket, FeedbackReply } from '../lib/types';

interface EvaluatedFeedbackItemProps {
  feedback: EvaluatedFeedback;
  index: number;
  onCreateTicket: (feedbackId: string) => void;
  onSendReply: (feedbackId: string) => void;
  isCreatingTicket?: boolean;
  isSendingReply?: boolean;
}

const categoryConfig = {
  bug: {
    icon: Bug,
    label: 'Bug Report',
    color: 'red',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    iconClass: 'text-red-400',
    badgeClass: 'bg-red-500/20 text-red-300',
  },
  proposal: {
    icon: Lightbulb,
    label: 'Proposal',
    color: 'amber',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    iconClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300',
  },
  feedback: {
    icon: MessageCircle,
    label: 'Feedback',
    color: 'emerald',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    iconClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
  },
};

const channelIcons = {
  facebook: Facebook,
  twitter: Twitter,
  email: Mail,
};

const priorityConfig = {
  low: { color: 'text-gray-400', bg: 'bg-gray-500/20' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/20' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/20' },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function EvaluatedFeedbackItem({
  feedback,
  index,
  onCreateTicket,
  onSendReply,
  isCreatingTicket,
  isSendingReply,
}: EvaluatedFeedbackItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const category = categoryConfig[feedback.category];
  const CategoryIcon = category.icon;
  const ChannelIcon = channelIcons[feedback.channel];
  const priority = priorityConfig[feedback.priority];

  const hasTicket = !!feedback.ticket;
  const hasReply = !!feedback.reply;
  const replySent = feedback.reply?.status === 'sent';

  const showTicketButton = feedback.category === 'bug' || (feedback.category === 'proposal' && feedback.priority !== 'low');
  const showReplyButton = true;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`
        relative overflow-hidden rounded-xl border backdrop-blur-sm
        ${category.bgClass} ${category.borderClass}
        transition-all duration-200
      `}
    >
      {/* Priority indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${priority.bg}`} />

      {/* Main content */}
      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Category icon */}
            <div className={`p-2 rounded-lg ${category.badgeClass}`}>
              <CategoryIcon className="w-5 h-5" />
            </div>

            {/* Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200">
                {feedback.summary}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <ChannelIcon className="w-3 h-3" />
                <span>{feedback.author}</span>
                <span>•</span>
                <span>{formatTimeAgo(feedback.timestamp)}</span>
              </div>
            </div>
          </div>

          {/* Priority badge */}
          <span className={`text-[10px] px-2 py-1 rounded-full font-medium uppercase ${priority.bg} ${priority.color}`}>
            {feedback.priority}
          </span>
        </div>

        {/* Suggested action */}
        <p className="text-sm text-gray-400 mb-4">
          {feedback.suggestedAction}
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Create ticket button */}
          {showTicketButton && (
            <motion.button
              onClick={() => onCreateTicket(feedback.originalFeedbackId)}
              disabled={hasTicket || isCreatingTicket}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${hasTicket
                  ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                  : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                }
                ${isCreatingTicket ? 'opacity-50' : ''}
              `}
              whileHover={!hasTicket && !isCreatingTicket ? { scale: 1.02 } : {}}
              whileTap={!hasTicket && !isCreatingTicket ? { scale: 0.98 } : {}}
            >
              {isCreatingTicket ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : hasTicket ? (
                <Check className="w-4 h-4" />
              ) : (
                <Ticket className="w-4 h-4" />
              )}
              {hasTicket ? feedback.ticket?.key : 'Create Ticket'}
            </motion.button>
          )}

          {/* Send reply button */}
          {showReplyButton && (
            <motion.button
              onClick={() => onSendReply(feedback.originalFeedbackId)}
              disabled={replySent || isSendingReply}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${replySent
                  ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                  : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                }
                ${isSendingReply ? 'opacity-50' : ''}
              `}
              whileHover={!replySent && !isSendingReply ? { scale: 1.02 } : {}}
              whileTap={!replySent && !isSendingReply ? { scale: 0.98 } : {}}
            >
              {isSendingReply ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : replySent ? (
                <Check className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {replySent ? 'Reply Sent' : 'Send Reply'}
            </motion.button>
          )}

          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700/50 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-gray-700/30 space-y-3">
                {/* Original content */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Original message:</p>
                  <p className="text-sm text-gray-300">{feedback.content}</p>
                </div>

                {/* Ticket info */}
                {feedback.ticket && (
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Ticket className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-purple-300">
                        {feedback.ticket.key}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        feedback.ticket.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {feedback.ticket.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{feedback.ticket.title}</p>
                  </div>
                )}

                {/* Reply info */}
                {feedback.reply && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Send className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-300">Reply</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        feedback.reply.status === 'sent'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {feedback.reply.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{feedback.reply.content}</p>
                  </div>
                )}

                {/* External link */}
                {feedback.url && (
                  <a
                    href={feedback.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View original
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
