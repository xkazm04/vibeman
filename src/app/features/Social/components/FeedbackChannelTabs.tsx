'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Facebook, Twitter, Mail } from 'lucide-react';
import type { FeedbackChannel } from '../lib/types';

interface TabConfig {
  channel: FeedbackChannel;
  label: string;
  icon: React.ElementType;
  color: string;
}

const tabs: TabConfig[] = [
  { channel: 'all', label: 'All', icon: MessageSquare, color: 'purple' },
  { channel: 'facebook', label: 'Facebook', icon: Facebook, color: 'blue' },
  { channel: 'twitter', label: 'Twitter', icon: Twitter, color: 'sky' },
  { channel: 'email', label: 'Email', icon: Mail, color: 'amber' },
];

interface FeedbackChannelTabsProps {
  activeChannel: FeedbackChannel;
  onChannelChange: (channel: FeedbackChannel) => void;
  counts: Record<string, number>;
}

export default function FeedbackChannelTabs({
  activeChannel,
  onChannelChange,
  counts,
}: FeedbackChannelTabsProps) {
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
    <div className="flex items-center gap-2 p-1 bg-gray-800/40 rounded-lg border border-gray-700/40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeChannel === tab.channel;
        const count = counts[tab.channel] || 0;

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
            <span className="hidden sm:inline">{tab.label}</span>

            {/* Badge count */}
            {count > 0 && (
              <span className={`
                min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium
                flex items-center justify-center
                ${getBadgeColor(tab.color)}
              `}>
                {count}
              </span>
            )}

            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="activeChannelIndicator"
                className="absolute inset-0 rounded-md border border-current opacity-50"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
