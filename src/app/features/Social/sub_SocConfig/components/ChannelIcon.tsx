'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Instagram,
  Facebook,
  Mail,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import type { SocialChannelType } from '../lib/types';

// X icon component (Twitter rebranded)
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Icon mapping
const CHANNEL_ICONS: Record<SocialChannelType, LucideIcon | React.FC<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  x: XIcon,
  gmail: Mail,
  discord: MessageCircle,
};

// Color mapping
const CHANNEL_COLORS: Record<SocialChannelType, { active: string; inactive: string; bg: string }> = {
  instagram: {
    active: 'text-pink-500',
    inactive: 'text-gray-500',
    bg: 'bg-pink-500/20',
  },
  facebook: {
    active: 'text-blue-500',
    inactive: 'text-gray-500',
    bg: 'bg-blue-500/20',
  },
  x: {
    active: 'text-white',
    inactive: 'text-gray-500',
    bg: 'bg-gray-600/40',
  },
  gmail: {
    active: 'text-red-500',
    inactive: 'text-gray-500',
    bg: 'bg-red-500/20',
  },
  discord: {
    active: 'text-indigo-400',
    inactive: 'text-gray-500',
    bg: 'bg-indigo-500/20',
  },
};

interface ChannelIconProps {
  channel: SocialChannelType;
  isActive?: boolean;
  isSelected?: boolean;
  configCount?: number;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ChannelIcon({
  channel,
  isActive = false,
  isSelected = false,
  configCount = 0,
  onClick,
  size = 'md',
}: ChannelIconProps) {
  const Icon = CHANNEL_ICONS[channel];
  const colors = CHANNEL_COLORS[channel];

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative ${sizeClasses[size]} rounded-xl
        flex items-center justify-center
        transition-all duration-200
        ${isSelected
          ? `${colors.bg} ${colors.active} ring-2 ring-cyan-500`
          : isActive
            ? `${colors.bg} ${colors.active}`
            : `bg-gray-800/40 ${colors.inactive} hover:bg-gray-700/60`
        }
      `}
      title={`${channel} ${configCount > 0 ? `(${configCount} configured)` : ''}`}
    >
      <Icon className={iconSizeClasses[size]} />

      {/* Config count badge */}
      {configCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
          {configCount}
        </span>
      )}
    </motion.button>
  );
}

interface ChannelSelectorProps {
  selectedChannel: SocialChannelType | null;
  channelCounts: Record<SocialChannelType, number>;
  onSelect: (channel: SocialChannelType) => void;
}

export function ChannelSelector({
  selectedChannel,
  channelCounts,
  onSelect,
}: ChannelSelectorProps) {
  const channels: SocialChannelType[] = ['instagram', 'facebook', 'x', 'gmail', 'discord'];

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-900/40 rounded-xl border border-gray-700/40">
      <span className="text-xs text-gray-500 font-medium">Channels:</span>
      <div className="flex gap-2">
        {channels.map((channel) => (
          <ChannelIcon
            key={channel}
            channel={channel}
            isActive={channelCounts[channel] > 0}
            isSelected={selectedChannel === channel}
            configCount={channelCounts[channel]}
            onClick={() => onSelect(channel)}
            size="md"
          />
        ))}
      </div>
    </div>
  );
}

export default ChannelIcon;
