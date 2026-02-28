'use client';

import React from 'react';
import { Globe, Hexagon, Zap, Radio, Activity, Database, HardDrive, type LucideIcon } from 'lucide-react';
import type { IntegrationType } from '../sub_WorkspaceArchitecture/lib/types';
import { INTEGRATION_COLORS, INTEGRATION_STYLES } from './constants';

const INTEGRATION_ICONS: Record<IntegrationType, LucideIcon> = {
  rest: Globe,
  graphql: Hexagon,
  grpc: Zap,
  websocket: Radio,
  event: Activity,
  database: Database,
  storage: HardDrive,
};

interface MatrixFilterChipsProps {
  availableTypes: IntegrationType[];
  activeFilters: Set<IntegrationType>;
  onToggle: (type: IntegrationType) => void;
}

export default function MatrixFilterChips({
  availableTypes,
  activeFilters,
  onToggle,
}: MatrixFilterChipsProps) {
  if (availableTypes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50 backdrop-blur-sm">
      {availableTypes.map((type) => {
        const style = INTEGRATION_STYLES[type];
        const Icon = INTEGRATION_ICONS[type];
        const isActive = activeFilters.has(type);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${isActive
                ? 'border-transparent shadow-sm'
                : 'border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/30'
              }`}
            style={
              isActive
                ? {
                  backgroundColor: `${INTEGRATION_COLORS[type]}20`,
                  color: INTEGRATION_COLORS[type],
                  borderColor: `${INTEGRATION_COLORS[type]}50`,
                  boxShadow: `0 0 8px ${INTEGRATION_COLORS[type]}15`,
                  transform: 'scale(1.05)',
                }
                : {}
            }
          >
            <Icon className="w-3 h-3 flex-shrink-0" />
            {style.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
