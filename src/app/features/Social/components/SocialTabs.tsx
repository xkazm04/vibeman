'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Server, Inbox, Send } from 'lucide-react';

export type SocialTab = 'projects' | 'incoming' | 'outcoming';

interface SocialTabsProps {
  activeTab: SocialTab;
  onTabChange: (tab: SocialTab) => void;
}

const tabs = [
  { id: 'projects' as const, label: 'Projects', icon: Server },
  { id: 'incoming' as const, label: 'Incoming', icon: Inbox },
  { id: 'outcoming' as const, label: 'Outcoming', icon: Send },
];

export default function SocialTabs({ activeTab, onTabChange }: SocialTabsProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-gray-800/40 rounded-lg border border-gray-700/40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 rounded-md
              text-sm font-medium transition-all duration-200
              ${isActive
                ? 'text-purple-300'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-purple-500/20 rounded-md border border-purple-500/40"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
