/**
 * Reusable Stat Card Component
 * Displays a statistic with icon and label
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  iconColor?: string;
  iconBgColor?: string;
}

export default function StatCard({
  icon: Icon,
  value,
  label,
  iconColor,
  iconBgColor
}: StatCardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 border border-gray-700/40">
      <div className="flex items-center space-x-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: iconBgColor }}
        >
          <Icon className="w-6 h-6" style={{ color: iconColor }} />
        </div>
        <div>
          <p className="text-3xl font-bold text-white font-mono">{value}</p>
          <p className="text-sm text-gray-400 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
}
