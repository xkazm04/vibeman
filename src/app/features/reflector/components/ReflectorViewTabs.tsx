'use client';

import React from 'react';
import { BarChart3, Network } from 'lucide-react';

export type ViewMode = 'weekly' | 'total' | 'ideas_stats' | 'dependencies';

interface ReflectorViewTabsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

interface TabConfig {
  id: ViewMode;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'total', label: 'Implemented' },
  { id: 'ideas_stats', label: 'Ideas Stats', icon: BarChart3 },
  { id: 'dependencies', label: 'Dependencies', icon: Network },
];

export default function ReflectorViewTabs({ viewMode, onViewModeChange }: ReflectorViewTabsProps) {
  return (
    <div className="flex items-center gap-2">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = viewMode === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onViewModeChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              isActive
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                : 'bg-gray-800/40 text-gray-400 border border-gray-700/40 hover:bg-gray-800/60'
            }`}
            data-testid={`reflector-tab-${tab.id}`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}









