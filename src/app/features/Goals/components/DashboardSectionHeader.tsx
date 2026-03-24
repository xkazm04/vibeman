import React from 'react';
import { caveat } from '@/app/fonts';

interface DashboardSectionHeaderProps {
  title: string;
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export default function DashboardSectionHeader({
  title,
  variant = 'primary',
  icon,
  badge,
  action,
}: DashboardSectionHeaderProps) {
  if (variant === 'secondary') {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-mono text-white/40 uppercase tracking-wider">{title}</h3>
          {badge}
        </div>
        {action}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {icon}
        <h2
          className={caveat.className + ' text-xl font-bold text-primary tracking-wide'}
          style={{ textShadow: '0 0 15px rgba(59, 130, 246, 0.3)' }}
        >
          {title}
        </h2>
        {badge}
      </div>
      {action}
    </div>
  );
}
