'use client';

import React from 'react';
import { Bug, Lightbulb, MessageCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatItem({ icon, label, value, color }: StatItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={color}>{icon}</span>
      <span className="text-xs font-medium text-gray-300">{value}</span>
      <span className="text-[10px] text-gray-500 uppercase">{label}</span>
    </div>
  );
}

interface StatsBarProps {
  stats: {
    new: number;
    analyzed: number;
    manual: number;
    automatic: number;
    done: number;
  };
  aiStats?: {
    bugs: number;
    features: number;
    clarifications: number;
  };
}

export default function StatsBar({ stats, aiStats }: StatsBarProps) {
  const total = stats.new + stats.analyzed + stats.manual + stats.automatic + stats.done;
  const inProgress = stats.manual + stats.automatic;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900/40 backdrop-blur-md border border-gray-700/40 rounded-lg">
      {/* Pipeline Stats */}
      <div className="flex items-center gap-6">
        <StatItem
          icon={<Clock className="w-3.5 h-3.5" />}
          label="New"
          value={stats.new}
          color="text-cyan-400"
        />
        <StatItem
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          label="Analyzed"
          value={stats.analyzed}
          color="text-yellow-400"
        />
        <StatItem
          icon={<MessageCircle className="w-3.5 h-3.5" />}
          label="In Progress"
          value={inProgress}
          color="text-orange-400"
        />
        <StatItem
          icon={<CheckCircle className="w-3.5 h-3.5" />}
          label="Done"
          value={stats.done}
          color="text-green-400"
        />
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-gray-700" />

      {/* AI Classification Stats */}
      {aiStats && (
        <div className="flex items-center gap-6">
          <StatItem
            icon={<Bug className="w-3.5 h-3.5" />}
            label="Bugs"
            value={aiStats.bugs}
            color="text-red-400"
          />
          <StatItem
            icon={<Lightbulb className="w-3.5 h-3.5" />}
            label="Features"
            value={aiStats.features}
            color="text-purple-400"
          />
          <StatItem
            icon={<MessageCircle className="w-3.5 h-3.5" />}
            label="Questions"
            value={aiStats.clarifications}
            color="text-cyan-400"
          />
        </div>
      )}

      {/* Total */}
      <div className="flex items-center gap-1.5 pl-4 border-l border-gray-700">
        <span className="text-sm font-semibold text-white">{total}</span>
        <span className="text-[10px] text-gray-500 uppercase">Total</span>
      </div>
    </div>
  );
}
