import React from 'react';

interface InboxStatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}

export function InboxStatCard({ icon: Icon, label, value, color }: InboxStatCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40 border border-gray-700/40">
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <span className="text-lg font-semibold text-gray-200">{value}</span>
        <span className="text-xs text-gray-500 ml-1">{label}</span>
      </div>
    </div>
  );
}
