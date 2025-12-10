'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Bug,
  Lightbulb,
  MessageCircle,
  Ticket,
  Send,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { ProcessingStats } from '../lib/types';

interface ProcessingStatsProps {
  stats: ProcessingStats;
}

export default function ProcessingStatsComponent({ stats }: ProcessingStatsProps) {
  const statItems = [
    {
      label: 'Total Processed',
      value: stats.totalProcessed,
      icon: BarChart3,
      color: 'purple',
    },
    {
      label: 'Bugs',
      value: stats.bugs,
      icon: Bug,
      color: 'red',
    },
    {
      label: 'Proposals',
      value: stats.proposals,
      icon: Lightbulb,
      color: 'amber',
    },
    {
      label: 'Feedback',
      value: stats.feedback,
      icon: MessageCircle,
      color: 'emerald',
    },
  ];

  const ticketStats = [
    {
      label: 'Created',
      value: stats.ticketsCreated,
      icon: Ticket,
      color: 'purple',
    },
    {
      label: 'Resolved',
      value: stats.ticketsResolved,
      icon: CheckCircle,
      color: 'emerald',
    },
  ];

  const replyStats = [
    {
      label: 'Sent',
      value: stats.repliesSent,
      icon: Send,
      color: 'blue',
    },
    {
      label: 'Pending',
      value: stats.repliesPending,
      icon: Clock,
      color: 'amber',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      purple: { bg: 'bg-purple-500/10', text: 'text-purple-300', icon: 'text-purple-400' },
      red: { bg: 'bg-red-500/10', text: 'text-red-300', icon: 'text-red-400' },
      amber: { bg: 'bg-amber-500/10', text: 'text-amber-300', icon: 'text-amber-400' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', icon: 'text-emerald-400' },
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-300', icon: 'text-blue-400' },
    };
    return colors[color];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/40"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-300">Processing Stats</h3>
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {statItems.map((item, index) => {
          const colors = getColorClasses(item.color);
          const Icon = item.icon;

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg ${colors.bg} text-center`}
            >
              <Icon className={`w-4 h-4 mx-auto mb-1 ${colors.icon}`} />
              <div className={`text-lg font-bold ${colors.text}`}>
                {item.value}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                {item.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-700/50 mb-4" />

      {/* Tickets and Replies */}
      <div className="grid grid-cols-2 gap-4">
        {/* Tickets */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Ticket className="w-3 h-3" />
            Tickets
          </div>
          <div className="flex gap-2">
            {ticketStats.map((item) => {
              const colors = getColorClasses(item.color);
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={`flex-1 p-2 rounded-lg ${colors.bg} text-center`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Icon className={`w-3 h-3 ${colors.icon}`} />
                    <span className={`text-sm font-semibold ${colors.text}`}>
                      {item.value}
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-500">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Replies */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Send className="w-3 h-3" />
            Replies
          </div>
          <div className="flex gap-2">
            {replyStats.map((item) => {
              const colors = getColorClasses(item.color);
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={`flex-1 p-2 rounded-lg ${colors.bg} text-center`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Icon className={`w-3 h-3 ${colors.icon}`} />
                    <span className={`text-sm font-semibold ${colors.text}`}>
                      {item.value}
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-500">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resolution rate */}
      {stats.ticketsCreated > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Resolution Rate</span>
            <span className="text-emerald-400 font-medium">
              {Math.round((stats.ticketsResolved / stats.ticketsCreated) * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${(stats.ticketsResolved / stats.ticketsCreated) * 100}%`,
              }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
