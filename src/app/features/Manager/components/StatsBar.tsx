/**
 * Stats Bar Component
 * Displays statistics about implementation logs
 */

'use client';

import { motion } from 'framer-motion';
import { EnrichedImplementationLog } from '../lib/types';

interface StatsBarProps {
  logs: EnrichedImplementationLog[];
}

export default function StatsBar({ logs }: StatsBarProps) {
  const stats = [
    {
      label: 'Total Features',
      value: logs.length.toString(),
      accent: 'cyan',
    },
    {
      label: 'Projects',
      value: new Set(logs.map(l => l.project_id)).size.toString(),
      accent: 'emerald',
    },
    {
      label: 'With Context',
      value: logs.filter(l => l.context_id).length.toString(),
      accent: 'amber',
    },
    {
      label: 'Needs Review',
      value: logs.length.toString(),
      accent: 'purple',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`
            relative p-4 rounded-lg bg-gray-900/80 border border-${stat.accent}-500/30
            before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br
            before:from-${stat.accent}-500/5 before:to-transparent before:pointer-events-none
          `}
        >
          <div className={`text-2xl font-bold text-${stat.accent}-400 font-mono`}>{stat.value}</div>
          <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
