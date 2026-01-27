'use client';

import React from 'react';
import type { IntegrationType } from '../sub_WorkspaceArchitecture/lib/types';
import { INTEGRATION_COLORS, INTEGRATION_STYLES } from '../sub_WorkspaceArchitecture/lib/types';

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
    <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
      {availableTypes.map((type) => {
        const style = INTEGRATION_STYLES[type];
        const isActive = activeFilters.has(type);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className={`px-2 py-1 text-[10px] rounded-md border transition-all ${isActive
                ? 'border-transparent'
                : 'border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
              }`}
            style={
              isActive
                ? {
                  backgroundColor: `${INTEGRATION_COLORS[type]}20`,
                  color: INTEGRATION_COLORS[type],
                  borderColor: `${INTEGRATION_COLORS[type]}50`,
                }
                : {}
            }
          >
            {style.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
