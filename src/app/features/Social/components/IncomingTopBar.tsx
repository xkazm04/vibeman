'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Facebook,
  Twitter,
  Mail,
  TrendingUp,
  Bug,
  Lightbulb,
  MessageCircle,
  Inbox
} from 'lucide-react';
import type { FeedbackChannel, ProcessingStats } from '../lib/types';

interface IncomingTopBarProps {
  activeChannel: FeedbackChannel;
  onChannelChange: (channel: FeedbackChannel) => void;
  channelCounts: Record<FeedbackChannel, number>;
  stats: ProcessingStats;
  pendingCount: number;
}

const channelTabs = [
  { channel: 'all' as const, label: 'All', icon: MessageSquare, color: 'purple' },
  { channel: 'facebook' as const, label: 'Facebook', icon: Facebook, color: 'blue' },
  { channel: 'twitter' as const, label: 'Twitter', icon: Twitter, color: 'sky' },
  { channel: 'email' as const, label: 'Email', icon: Mail, color: 'amber' },
];

export default function IncomingTopBar({
  activeChannel,
  onChannelChange,
  channelCounts,
  stats,
  pendingCount,
}: IncomingTopBarProps) {
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
    <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-700/40 backdrop-blur-sm space-y-4">
      {/* Top row - Pending count and Stats */}
      <div className="flex items-center justify-between">
        {/* Pending count */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Inbox className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{pendingCount}</div>
            <div className="text-xs text-gray-400">Pending Feedback</div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="flex items-center gap-1.5">
              <Bug className="w-4 h-4 text-red-400" />
              <span className="text-lg font-semibold text-red-300">{stats.bugs}</span>
            </div>
            <div className="text-[10px] text-gray-500 uppercase">Bugs</div>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-lg font-semibold text-amber-300">{stats.proposals}</span>
            </div>
            <div className="text-[10px] text-gray-500 uppercase">Proposals</div>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-lg font-semibold text-emerald-300">{stats.feedback}</span>
            </div>
            <div className="text-[10px] text-gray-500 uppercase">Feedback</div>
          </div>
          <div className="h-8 w-px bg-gray-700/50" />
          <div className="text-center">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-lg font-semibold text-purple-300">{stats.totalProcessed}</span>
            </div>
            <div className="text-[10px] text-gray-500 uppercase">Processed</div>
          </div>
        </div>
      </div>

      {/* Channel filter tabs */}
      <div className="flex items-center gap-2 p-1 bg-gray-800/40 rounded-lg border border-gray-700/40">
        {channelTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeChannel === tab.channel;
          const count = channelCounts[tab.channel];

          return (
            <button
              key={tab.channel}
              onClick={() => onChannelChange(tab.channel)}
              className={`
                relative flex items-center gap-2 px-3 py-2 rounded-md
                text-sm font-medium transition-all duration-200
                border border-transparent
                ${getColorClasses(tab.color, isActive)}
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
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
    </div>
  );
}
