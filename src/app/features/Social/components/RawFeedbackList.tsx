'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, Facebook, Twitter, Mail, MessageSquare } from 'lucide-react';
import RawFeedbackItem from './RawFeedbackItem';
import type { RawFeedback, FeedbackChannel } from '../lib/types';

interface RawFeedbackListProps {
  feedback: RawFeedback[];
  processingIds: Set<string>;
  activeChannel: FeedbackChannel;
  onChannelChange: (channel: FeedbackChannel) => void;
}

const channelTabs = [
  { channel: 'all' as const, label: 'All', icon: MessageSquare, color: 'purple' },
  { channel: 'facebook' as const, label: 'Facebook', icon: Facebook, color: 'blue' },
  { channel: 'twitter' as const, label: 'Twitter', icon: Twitter, color: 'sky' },
  { channel: 'email' as const, label: 'Email', icon: Mail, color: 'amber' },
];

export default function RawFeedbackList({
  feedback,
  processingIds,
  activeChannel,
  onChannelChange,
}: RawFeedbackListProps) {
  const filteredFeedback = useMemo(() => {
    if (activeChannel === 'all') return feedback;
    return feedback.filter(fb => fb.channel === activeChannel);
  }, [feedback, activeChannel]);

  const channelCounts = useMemo(() => ({
    all: feedback.length,
    facebook: feedback.filter(fb => fb.channel === 'facebook').length,
    twitter: feedback.filter(fb => fb.channel === 'twitter').length,
    email: feedback.filter(fb => fb.channel === 'email').length,
  }), [feedback]);

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { active: string; inactive: string; badge: string }> = {
      purple: {
        active: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
        inactive: 'text-gray-400 hover:text-purple-300 hover:bg-purple-500/10',
        badge: 'bg-purple-500/30 text-purple-300',
      },
      blue: {
        active: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
        inactive: 'text-gray-400 hover:text-blue-300 hover:bg-blue-500/10',
        badge: 'bg-blue-500/30 text-blue-300',
      },
      sky: {
        active: 'bg-sky-500/20 text-sky-300 border-sky-500/50',
        inactive: 'text-gray-400 hover:text-sky-300 hover:bg-sky-500/10',
        badge: 'bg-sky-500/30 text-sky-300',
      },
      amber: {
        active: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
        inactive: 'text-gray-400 hover:text-amber-300 hover:bg-amber-500/10',
        badge: 'bg-amber-500/30 text-amber-300',
      },
    };
    return isActive ? colors[color].active : colors[color].inactive;
  };

  const getBadgeColor = (color: string) => {
    const colors: Record<string, string> = {
      purple: 'bg-purple-500/30 text-purple-300',
      blue: 'bg-blue-500/30 text-blue-300',
      sky: 'bg-sky-500/30 text-sky-300',
      amber: 'bg-amber-500/30 text-amber-300',
    };
    return colors[color];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Inbox className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-200">Incoming Feedback</h2>
      </div>

      {/* Channel tabs */}
      <div className="flex items-center gap-2 p-1 mb-4 bg-gray-800/40 rounded-lg border border-gray-700/40 overflow-x-auto">
        {channelTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeChannel === tab.channel;
          const count = channelCounts[tab.channel];

          return (
            <button
              key={tab.channel}
              onClick={() => onChannelChange(tab.channel)}
              className={`
                relative flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap
                text-sm font-medium transition-all duration-200
                border border-transparent
                ${getColorClasses(tab.color, isActive)}
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span className={`
                  min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium
                  flex items-center justify-center
                  ${getBadgeColor(tab.color)}
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredFeedback.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500"
            >
              <Inbox className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No pending feedback</p>
              <p className="text-xs text-gray-600 mt-1">All items have been processed</p>
            </motion.div>
          ) : (
            filteredFeedback.map((fb, index) => (
              <RawFeedbackItem
                key={fb.id}
                feedback={fb}
                index={index}
                isExiting={processingIds.has(fb.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
