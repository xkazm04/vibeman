'use client';

import { motion } from 'framer-motion';
import { CoverageStats, ComponentMatch } from '../lib/types';
import { Check, AlertCircle, X, Plus } from 'lucide-react';

interface CoverageChartProps {
  coverage: CoverageStats | null;
  matches: ComponentMatch[];
}

export function CoverageChart({ coverage, matches }: CoverageChartProps) {
  if (!coverage) return null;

  const total = coverage.matched + coverage.partial + coverage.missing + coverage.unique;

  const segments = [
    { label: 'Matched', count: coverage.matched, color: 'bg-green-500', icon: Check },
    { label: 'Partial', count: coverage.partial, color: 'bg-yellow-500', icon: AlertCircle },
    { label: 'Missing', count: coverage.missing, color: 'bg-red-500', icon: X },
    { label: 'Unique', count: coverage.unique, color: 'bg-cyan-500', icon: Plus }
  ];

  return (
    <div
      className="bg-gray-900/50 rounded-xl border border-white/10 p-6"
      data-testid="coverage-chart"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Component Coverage
          </h3>
          <p className="text-gray-400">
            Comparing central Storybook with Vibeman UI components
          </p>
        </div>

        <div className="text-right" data-testid="coverage-percentage">
          <div className="text-4xl font-bold text-cyan-400">
            {coverage.percentage}%
          </div>
          <div className="text-sm text-gray-400">
            Coverage Score
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-4 rounded-full overflow-hidden flex bg-gray-800 mb-6" data-testid="coverage-bar">
        {segments.map((segment, i) => (
          <motion.div
            key={segment.label}
            initial={{ width: 0 }}
            animate={{ width: total > 0 ? `${(segment.count / total) * 100}%` : '0%' }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`${segment.color} h-full`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-4" data-testid="coverage-legend">
        {segments.map(segment => (
          <div key={segment.label} className="flex items-center gap-2" data-testid={`coverage-stat-${segment.label.toLowerCase()}`}>
            <div className={`w-8 h-8 rounded-lg ${segment.color} flex items-center justify-center`}>
              <segment.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">
                {segment.count}
              </div>
              <div className="text-xs text-gray-400">
                {segment.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
