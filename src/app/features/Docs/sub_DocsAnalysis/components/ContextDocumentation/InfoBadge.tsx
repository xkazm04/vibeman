/**
 * InfoBadge Component
 * Quick info badge with progressive disclosure
 * Shows icon + value by default; label reveals on hover
 */

'use client';

import React from 'react';

interface InfoBadgeProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  testId?: string;
}

export default function InfoBadge({ icon: Icon, label, value, color, testId }: InfoBadgeProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg border group cursor-default
        transition-all duration-200 hover:scale-105"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
      }}
      data-testid={testId}
    >
      <Icon
        className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
        style={{ color }}
      />
      {/* Label - progressive disclosure on hover */}
      <span
        className="text-xs text-gray-400
          opacity-0 group-hover:opacity-100
          max-w-0 group-hover:max-w-[100px]
          overflow-hidden whitespace-nowrap
          transition-all duration-200"
      >
        {label}:
      </span>
      <span className="text-sm font-medium" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
