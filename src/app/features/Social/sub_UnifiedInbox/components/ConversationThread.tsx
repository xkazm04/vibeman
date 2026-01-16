'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Tag,
  MessageSquare,
  Mail,
  Twitter,
  Facebook,
  Instagram,
  MessageCircle,
  Star,
  Smartphone,
  MoreVertical,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import type { ConversationThread as ConversationThreadType, UnifiedCustomer, ThreadMessage } from '@/lib/social';
import type { KanbanChannel } from '../../lib/types/feedbackTypes';
import {
  SENTIMENT_COLORS,
  SENTIMENT_BG_COLORS,
  getCustomerValueTier,
  VALUE_TIER_COLORS,
} from '../lib/types';

interface ConversationThreadProps {
  thread: ConversationThreadType;
  customer: UnifiedCustomer | null;
  onBack: () => void;
  onViewCustomer: () => void;
  onResolve: () => void;
  onReopen: () => void;
}

const CHANNEL_ICONS: Record<KanbanChannel, React.ElementType> = {
  email: Mail,
  x: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
};

const CHANNEL_COLORS: Record<KanbanChannel, string> = {
  email: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  x: 'bg-gray-700/50 text-gray-200 border-gray-600',
  facebook: 'bg-blue-600/10 text-blue-500 border-blue-600/30',
  instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  support_chat: 'bg-green-500/10 text-green-400 border-green-500/30',
  trustpilot: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  app_store: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-400',
  medium: 'bg-blue-500/10 text-blue-400',
  high: 'bg-yellow-500/10 text-yellow-400',
  critical: 'bg-red-500/10 text-red-400',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  resolved: 'bg-green-500/10 text-green-400 border-green-500/30',
  pending: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

export function ConversationThread({
  thread,
  customer,
  onBack,
  onViewCustomer,
  onResolve,
  onReopen,
}: ConversationThreadProps) {
  const valueTier = customer ? getCustomerValueTier(customer.valueScore) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700/40">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to inbox
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-100 mb-2 line-clamp-2">
              {thread.subject || 'No subject'}
            </h2>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[thread.status]}`}>
                {thread.status === 'resolved' && <CheckCircle className="w-3.5 h-3.5" />}
                {thread.status === 'open' && <AlertCircle className="w-3.5 h-3.5" />}
                {thread.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                {thread.status.charAt(0).toUpperCase() + thread.status.slice(1)}
              </span>

              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[thread.priority]}`}>
                {thread.priority.charAt(0).toUpperCase() + thread.priority.slice(1)} Priority
              </span>

              {/* Channels */}
              <div className="flex items-center gap-1">
                {thread.channels.map(channel => {
                  const Icon = CHANNEL_ICONS[channel];
                  return (
                    <span
                      key={channel}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${CHANNEL_COLORS[channel]}`}
                    >
                      <Icon className="w-3 h-3" />
                      {channel}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {thread.status === 'open' ? (
              <button
                onClick={onResolve}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500 hover:bg-green-400 text-white transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Resolve
              </button>
            ) : (
              <button
                onClick={onReopen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reopen
              </button>
            )}
          </div>
        </div>

        {/* Customer info */}
        {customer && (
          <button
            onClick={onViewCustomer}
            className="mt-3 flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-800/60 transition-colors w-full text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">
                {customer.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-200 truncate">
                  {customer.displayName}
                </span>
                {customer.isVerified && (
                  <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                )}
                {valueTier && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${VALUE_TIER_COLORS[valueTier]}`}>
                    {valueTier.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {customer.totalInteractions} interactions • Score: {customer.valueScore}
              </span>
            </div>
            <span className="text-xs text-cyan-400">View profile →</span>
          </button>
        )}

        {/* Tags */}
        {thread.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {thread.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-cyan-500/10 text-cyan-400"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4 max-w-3xl">
          {thread.messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isFirst={index === 0}
              customerName={customer?.displayName}
            />
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="flex-shrink-0 p-3 border-t border-gray-700/40 bg-gray-900/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Created {new Date(thread.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span>
            Last activity {formatRelativeTime(thread.lastActivityAt)}
          </span>
          {thread.resolvedAt && (
            <span className="text-green-400">
              Resolved {new Date(thread.resolvedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ThreadMessage;
  isFirst: boolean;
  customerName?: string;
}

function MessageBubble({ message, isFirst, customerName }: MessageBubbleProps) {
  const isCustomer = message.role === 'customer';
  const Icon = CHANNEL_ICONS[message.channel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`max-w-[80%] ${isCustomer ? 'order-2' : 'order-1'}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isCustomer ? '' : 'justify-end'}`}>
          {isCustomer && (
            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-gray-400" />
            </div>
          )}
          <span className="text-xs font-medium text-gray-400">
            {isCustomer ? (customerName || 'Customer') : 'Agent'}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${CHANNEL_COLORS[message.channel]}`}>
            <Icon className="w-2.5 h-2.5" />
            {message.channel}
          </span>
          <span className="text-xs text-gray-600">
            {formatRelativeTime(message.timestamp)}
          </span>
        </div>

        {/* Message content */}
        <div
          className={`p-3 rounded-xl ${
            isCustomer
              ? 'bg-gray-800 border border-gray-700/40 rounded-tl-sm'
              : 'bg-cyan-500/20 border border-cyan-500/30 rounded-tr-sm'
          }`}
        >
          <p className="text-sm text-gray-200 whitespace-pre-wrap">
            {message.content}
          </p>

          {/* Sentiment badge */}
          {message.sentiment && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${SENTIMENT_COLORS[message.sentiment]} ${SENTIMENT_BG_COLORS[message.sentiment]}`}>
                {message.sentiment}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
