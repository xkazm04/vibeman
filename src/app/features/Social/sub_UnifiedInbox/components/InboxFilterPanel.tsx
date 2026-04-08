'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { KanbanChannel, KanbanPriority } from '../../lib/types/feedbackTypes';
import type { InboxViewMode, UnifiedInboxFilters } from '../lib/types';
import { CHANNEL_ICONS, CHANNEL_LABELS } from '../../lib/channelConstants';

interface InboxFilterPanelProps {
  filters: UnifiedInboxFilters;
  viewMode: InboxViewMode;
  onToggleChannel: (channel: KanbanChannel) => void;
  onToggleStatus: (status: 'open' | 'resolved' | 'pending') => void;
  onTogglePriority: (priority: KanbanPriority) => void;
  onClearFilters: () => void;
}

export function InboxFilterPanel({
  filters,
  viewMode,
  onToggleChannel,
  onToggleStatus,
  onTogglePriority,
  onClearFilters,
}: InboxFilterPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 p-3 rounded-lg bg-gray-800/40 border border-gray-700/40"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400">Filters</span>
        {(filters.channels.length > 0 || filters.status.length > 0) && (
          <button
            onClick={onClearFilters}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Channel filters */}
      <div className="mb-3">
        <span className="text-xs text-gray-500 mb-2 block">Channels</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CHANNEL_ICONS) as KanbanChannel[]).map(channel => {
            const Icon = CHANNEL_ICONS[channel];
            const isActive = filters.channels.includes(channel);
            return (
              <button
                key={channel}
                onClick={() => onToggleChannel(channel)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 border border-gray-600/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {CHANNEL_LABELS[channel]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status filters (only for conversations) */}
      {viewMode === 'conversations' && (
        <div className="mb-3">
          <span className="text-xs text-gray-500 mb-2 block">Status</span>
          <div className="flex flex-wrap gap-2">
            {(['open', 'pending', 'resolved'] as const).map(status => {
              const isActive = filters.status.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => onToggleStatus(status)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 border border-gray-600/50'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Priority filters (only for conversations) */}
      {viewMode === 'conversations' && (
        <div>
          <span className="text-xs text-gray-500 mb-2 block">Priority</span>
          <div className="flex flex-wrap gap-2">
            {(['low', 'medium', 'high', 'critical'] as KanbanPriority[]).map(priority => {
              const isActive = filters.priority.includes(priority);
              return (
                <button
                  key={priority}
                  onClick={() => onTogglePriority(priority)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 border border-gray-600/50'
                  }`}
                >
                  {priority}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
