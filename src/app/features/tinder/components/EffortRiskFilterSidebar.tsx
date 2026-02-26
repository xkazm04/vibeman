'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gauge, AlertTriangle } from 'lucide-react';

interface EffortRiskFilters {
  effortRange: [number, number] | null; // [min, max] or null for all
  riskRange: [number, number] | null;
}

interface EffortRiskFilterSidebarProps {
  filters: EffortRiskFilters;
  onFiltersChange: (filters: EffortRiskFilters) => void;
  disabled?: boolean;
}

const EFFORT_RANGES: Array<{ label: string; range: [number, number]; color: string }> = [
  { label: 'Quick Wins', range: [1, 3], color: 'green' },
  { label: 'Moderate', range: [4, 6], color: 'yellow' },
  { label: 'Heavy', range: [7, 10], color: 'red' },
];

const RISK_RANGES: Array<{ label: string; range: [number, number]; color: string }> = [
  { label: 'Safe', range: [1, 3], color: 'green' },
  { label: 'Moderate', range: [4, 6], color: 'yellow' },
  { label: 'Risky', range: [7, 10], color: 'red' },
];

function getColorClasses(color: string, isActive: boolean) {
  const map: Record<string, { active: string; inactive: string }> = {
    green: {
      active: 'bg-green-500/20 text-green-300 border-green-500/40 shadow-md shadow-green-500/20',
      inactive: 'hover:bg-green-500/10 hover:border-green-500/20',
    },
    yellow: {
      active: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-md shadow-yellow-500/20',
      inactive: 'hover:bg-yellow-500/10 hover:border-yellow-500/20',
    },
    red: {
      active: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-md shadow-red-500/20',
      inactive: 'hover:bg-red-500/10 hover:border-red-500/20',
    },
  };
  return map[color] || map.green;
}

export default function EffortRiskFilterSidebar({
  filters,
  onFiltersChange,
  disabled = false,
}: EffortRiskFilterSidebarProps) {
  const isEffortActive = (range: [number, number]) =>
    filters.effortRange?.[0] === range[0] && filters.effortRange?.[1] === range[1];

  const isRiskActive = (range: [number, number]) =>
    filters.riskRange?.[0] === range[0] && filters.riskRange?.[1] === range[1];

  const toggleEffort = (range: [number, number]) => {
    onFiltersChange({
      ...filters,
      effortRange: isEffortActive(range) ? null : range,
    });
  };

  const toggleRisk = (range: [number, number]) => {
    onFiltersChange({
      ...filters,
      riskRange: isRiskActive(range) ? null : range,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="w-56 bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-4 mt-3"
    >
      {/* Effort Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-700/40">
          <Gauge className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-semibold text-gray-200">Effort</span>
        </div>

        <div className="space-y-1.5">
          {EFFORT_RANGES.map(({ label, range, color }) => {
            const isActive = isEffortActive(range);
            const colorClasses = getColorClasses(color, isActive);

            return (
              <motion.button
                key={label}
                onClick={() => toggleEffort(range)}
                disabled={disabled}
                className={`
                  w-full flex items-center justify-between px-3 py-1.5 rounded-lg
                  text-xs font-medium transition-all duration-200 border
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${isActive
                    ? colorClasses.active
                    : 'text-gray-400 border-transparent ' + colorClasses.inactive
                  }
                `}
                whileHover={disabled ? {} : { scale: 1.02 }}
                whileTap={disabled ? {} : { scale: 0.98 }}
              >
                <span>{label}</span>
                <span className="text-[10px] text-gray-500">{range[0]}-{range[1]}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Risk Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-700/40">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-gray-200">Risk</span>
        </div>

        <div className="space-y-1.5">
          {RISK_RANGES.map(({ label, range, color }) => {
            const isActive = isRiskActive(range);
            const colorClasses = getColorClasses(color, isActive);

            return (
              <motion.button
                key={`risk-${label}`}
                onClick={() => toggleRisk(range)}
                disabled={disabled}
                className={`
                  w-full flex items-center justify-between px-3 py-1.5 rounded-lg
                  text-xs font-medium transition-all duration-200 border
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${isActive
                    ? colorClasses.active
                    : 'text-gray-400 border-transparent ' + colorClasses.inactive
                  }
                `}
                whileHover={disabled ? {} : { scale: 1.02 }}
                whileTap={disabled ? {} : { scale: 0.98 }}
              >
                <span>{label}</span>
                <span className="text-[10px] text-gray-500">{range[0]}-{range[1]}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
