/**
 * NavigationBreadcrumb Component
 * Displays the current navigation path in the Architecture Explorer
 */

'use client';

import React from 'react';
import { Home, Compass } from 'lucide-react';
import type { ContextGroup, Context } from '@/stores/contextStore';
import { ZoomLevel, NavigationState } from '../lib/types';

interface NavigationBreadcrumbProps {
  state: NavigationState;
  onNavigateToLevel: (level: ZoomLevel) => void;
  groups: ContextGroup[];
  contexts: Context[];
}

export default function NavigationBreadcrumb({
  state,
  onNavigateToLevel,
  groups,
  contexts,
}: NavigationBreadcrumbProps) {
  const selectedGroup = state.selectedModuleId
    ? groups.find(g => g.id === state.selectedModuleId)
    : null;
  const selectedContext = state.selectedUseCaseId
    ? contexts.find(c => c.id === state.selectedUseCaseId)
    : null;

  const items = [
    { level: 1 as ZoomLevel, label: 'System', icon: <Home className="w-3.5 h-3.5" /> },
    ...(selectedGroup
      ? [
          {
            level: 2 as ZoomLevel,
            label: selectedGroup.name,
            icon: <Compass className="w-3.5 h-3.5" />,
          },
        ]
      : []),
    ...(selectedContext
      ? [
          {
            level: 3 as ZoomLevel,
            label: selectedContext.name,
            icon: <Compass className="w-3.5 h-3.5" />,
          },
        ]
      : []),
  ];

  return (
    <div className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={item.level}>
          {index > 0 && <span className="text-gray-600 mx-1">/</span>}
          <button
            onClick={() => onNavigateToLevel(item.level)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${
              state.level === item.level
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            disabled={state.level === item.level}
            data-testid={`breadcrumb-level-${item.level}`}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
