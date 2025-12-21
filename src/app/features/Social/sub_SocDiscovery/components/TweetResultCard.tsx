'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Repeat2, MessageCircle, ExternalLink, Check } from 'lucide-react';
import type { DiscoveredTweet } from '../lib/types';

interface TweetResultCardProps {
  tweet: DiscoveredTweet;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function TweetResultCard({ tweet, isSelected, onToggleSelect }: TweetResultCardProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-4 rounded-xl border transition-all cursor-pointer
        ${isSelected
          ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30'
          : 'bg-gray-800/40 border-gray-700/40 hover:border-gray-600/60'
        }
      `}
      onClick={onToggleSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">
            {tweet.authorName?.charAt(0) || tweet.authorUsername?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-200 truncate">
              {tweet.authorName || tweet.authorUsername}
            </div>
            <div className="text-xs text-gray-500">@{tweet.authorUsername}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500">{formatDate(tweet.createdAt)}</span>
          <div className={`
            w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors
            ${isSelected
              ? 'bg-cyan-500 border-cyan-500'
              : 'border-gray-600 hover:border-gray-500'
            }
          `}>
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-300 mb-3 whitespace-pre-wrap break-words">
        {tweet.text}
      </p>

      {/* Metrics */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5" />
          {formatNumber(tweet.metrics.likes)}
        </span>
        <span className="flex items-center gap-1">
          <Repeat2 className="w-3.5 h-3.5" />
          {formatNumber(tweet.metrics.retweets)}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3.5 h-3.5" />
          {formatNumber(tweet.metrics.replies)}
        </span>
        {tweet.url && (
          <a
            href={tweet.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View
          </a>
        )}
      </div>
    </motion.div>
  );
}
