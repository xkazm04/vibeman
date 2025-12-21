'use client';

import React from 'react';
import {
  Monitor,
  Server,
  Smartphone,
  Cloud,
  Database,
  CreditCard,
  Search,
  Bell,
  Shield,
  Globe,
  Headphones,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { DevTeam } from '../lib/types/aiTypes';
import { TEAM_COLORS } from '../lib/types/aiTypes';

// Icon component mapping for teams
const TEAM_ICON_COMPONENTS: Record<DevTeam, LucideIcon> = {
  frontend: Monitor,
  backend: Server,
  mobile: Smartphone,
  platform: Cloud,
  data: Database,
  payments: CreditCard,
  search: Search,
  notifications: Bell,
  security: Shield,
  localization: Globe,
  'customer-success': Headphones,
  growth: TrendingUp,
};

// Team labels for display
export const TEAM_LABELS: Record<DevTeam, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  mobile: 'Mobile',
  platform: 'Platform',
  data: 'Data',
  payments: 'Payments',
  search: 'Search',
  notifications: 'Notifications',
  security: 'Security',
  localization: 'Localization',
  'customer-success': 'Customer Success',
  growth: 'Growth',
};

interface TeamIconProps {
  team: DevTeam;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showBadge?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const badgeSizeClasses = {
  xs: 'text-[9px] px-1 py-0.5',
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-2.5 py-1',
};

export function TeamIcon({
  team,
  size = 'sm',
  showLabel = false,
  showBadge = false,
  className = '',
}: TeamIconProps) {
  const IconComponent = TEAM_ICON_COMPONENTS[team];
  const colors = TEAM_COLORS[team];
  const label = TEAM_LABELS[team];

  if (!IconComponent) {
    return null;
  }

  if (showBadge) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full ${colors} ${badgeSizeClasses[size]} font-medium ${className}`}
        title={label}
      >
        <IconComponent className={sizeClasses[size]} />
        {showLabel && <span>{label}</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${colors.split(' ')[0]} ${className}`}
      title={label}
    >
      <IconComponent className={sizeClasses[size]} />
      {showLabel && <span className="text-[10px]">{label}</span>}
    </span>
  );
}

// Response indicator icon - shown when AI has generated a customer response
interface ResponseIndicatorProps {
  hasResponse: boolean;
  followUpRequired?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function ResponseIndicator({
  hasResponse,
  followUpRequired = false,
  size = 'sm',
  className = '',
}: ResponseIndicatorProps) {
  if (!hasResponse) return null;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${
        followUpRequired
          ? 'bg-amber-500/20 text-amber-400'
          : 'bg-emerald-500/20 text-emerald-400'
      } ${badgeSizeClasses[size]} ${className}`}
      title={followUpRequired ? 'Response generated (follow-up needed)' : 'Response generated'}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={sizeClasses[size]}
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        {followUpRequired ? (
          <circle cx="12" cy="10" r="1" fill="currentColor" />
        ) : (
          <polyline points="9 10 12 13 15 9" />
        )}
      </svg>
    </span>
  );
}

export default TeamIcon;
