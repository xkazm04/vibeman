'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Facebook, Twitter, Mail, ExternalLink, AlertCircle, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import type { SocialFeedback } from '../lib/types';

interface FeedbackItemProps {
  feedback: SocialFeedback;
  index: number;
}

const channelConfig = {
  facebook: {
    icon: Facebook,
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    iconClass: 'text-blue-400',
  },
  twitter: {
    icon: Twitter,
    color: 'sky',
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-500/20',
    iconClass: 'text-sky-400',
  },
  email: {
    icon: Mail,
    color: 'amber',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    iconClass: 'text-amber-400',
  },
};

const sentimentConfig = {
  positive: {
    icon: ThumbsUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  neutral: {
    icon: Minus,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
  },
  negative: {
    icon: ThumbsDown,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
};

const priorityConfig = {
  low: { color: 'text-gray-400', bg: 'bg-gray-500/20' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/20' },
  high: { color: 'text-red-400', bg: 'bg-red-500/20' },
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

export default function FeedbackItem({ feedback, index }: FeedbackItemProps) {
  const channel = channelConfig[feedback.channel];
  const ChannelIcon = channel.icon;
  const sentiment = feedback.sentiment ? sentimentConfig[feedback.sentiment] : null;
  const SentimentIcon = sentiment?.icon;
  const priority = feedback.priority ? priorityConfig[feedback.priority] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`
        relative p-4 rounded-lg border backdrop-blur-sm
        ${channel.bgClass} ${channel.borderClass}
        hover:border-opacity-50 transition-all duration-200
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {feedback.authorAvatar ? (
            <img
              src={feedback.authorAvatar}
              alt={feedback.author}
              className="w-10 h-10 rounded-full bg-gray-700"
            />
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${channel.bgClass}`}>
              <ChannelIcon className={`w-5 h-5 ${channel.iconClass}`} />
            </div>
          )}

          {/* Author info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-200">{feedback.author}</span>
              {feedback.authorHandle && (
                <span className="text-xs text-gray-500">{feedback.authorHandle}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ChannelIcon className="w-3 h-3" />
              <span>{formatTimeAgo(feedback.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Right side badges */}
        <div className="flex items-center gap-2">
          {/* Priority badge */}
          {priority && feedback.priority !== 'low' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priority.bg} ${priority.color}`}>
              {feedback.priority}
            </span>
          )}

          {/* Action item indicator */}
          {feedback.hasActionItem && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              <AlertCircle className="w-3 h-3" />
              Action
            </span>
          )}

          {/* External link */}
          {feedback.url && (
            <a
              href={feedback.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700/50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-300 leading-relaxed mb-3">
        {feedback.content}
      </p>

      {/* Footer with sentiment */}
      {sentiment && SentimentIcon && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${sentiment.bg} ${sentiment.color}`}>
            <SentimentIcon className="w-3 h-3" />
            <span className="capitalize">{feedback.sentiment}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
