'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Facebook, Twitter, Mail, ExternalLink, Quote } from 'lucide-react';
import type { RawFeedback } from '../lib/types';

interface RawFeedbackItemProps {
  feedback: RawFeedback;
  index: number;
  isExiting?: boolean;
}

const channelConfig = {
  facebook: {
    icon: Facebook,
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    iconClass: 'text-blue-400',
  },
  twitter: {
    icon: Twitter,
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-500/20',
    iconClass: 'text-sky-400',
  },
  email: {
    icon: Mail,
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    iconClass: 'text-amber-400',
  },
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

export default function RawFeedbackItem({ feedback, index, isExiting }: RawFeedbackItemProps) {
  const channel = channelConfig[feedback.channel];
  const ChannelIcon = channel.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: isExiting ? 0 : 1,
        x: isExiting ? 100 : 0,
        scale: isExiting ? 0.8 : 1,
      }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{
        duration: 0.3,
        delay: isExiting ? 0 : index * 0.05,
        layout: { duration: 0.3 },
      }}
      className={`
        relative p-4 rounded-lg border backdrop-blur-sm
        ${channel.bgClass} ${channel.borderClass}
        hover:border-opacity-50 transition-all duration-200
      `}
    >
      {/* Header - Name and DateTime on same row */}
      <div className="flex items-center justify-between mb-3">
        {/* Left side - Channel icon, Author name and handle */}
        <div className="flex items-center gap-2">
          <ChannelIcon className={`w-4 h-4 ${channel.iconClass}`} />
          <span className="text-sm font-medium text-gray-200">{feedback.author}</span>
          {feedback.authorHandle && (
            <span className="text-xs text-gray-500">{feedback.authorHandle}</span>
          )}
        </div>

        {/* Right side - Time and external link */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{formatTimeAgo(feedback.timestamp)}</span>
          {feedback.url && (
            <a
              href={feedback.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-gray-700/50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Original post (if reply/reaction) */}
      {feedback.originalPost && (
        <div className="mb-3 p-3 rounded-lg bg-gray-800/40 border border-gray-700/30">
          <div className="flex items-start gap-2">
            <Quote className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Replying to <span className="text-gray-400">{feedback.originalPost.author}</span>
              </p>
              <p className="text-sm text-gray-400 line-clamp-2">
                {feedback.originalPost.content}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <p className="text-sm text-gray-300 leading-relaxed">
        {feedback.content}
      </p>
    </motion.div>
  );
}
