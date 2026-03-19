'use client';

import { motion } from 'framer-motion';
import { Database, TrendingUp, Layers, FileOutput, ScanSearch } from 'lucide-react';
import { transition } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { KBStats } from '../lib/useKnowledgeBase';

interface KnowledgeStatsHeaderProps {
  stats: KBStats | null;
  isLoading: boolean;
  onExport: () => void;
  onScan: () => void;
}

const STAT_ITEMS: readonly { key: string; label: string; icon: typeof Database; color: string; suffix?: string }[] = [
  { key: 'total', label: 'Total Entries', icon: Database, color: 'text-purple-400' },
  { key: 'avgConfidence', label: 'Avg Confidence', icon: TrendingUp, color: 'text-cyan-400', suffix: '%' },
  { key: 'domains', label: 'Domains', icon: Layers, color: 'text-emerald-400' },
];

export default function KnowledgeStatsHeader({ stats, isLoading, onExport, onScan }: KnowledgeStatsHeaderProps) {
  const prefersReduced = useReducedMotion();

  const getValue = (key: string): string => {
    if (!stats || isLoading) return '--';
    switch (key) {
      case 'total': return String(stats.total);
      case 'avgConfidence': return String(Math.round(stats.avgConfidence));
      case 'domains': return String(Object.values(stats.byDomain).filter(v => v > 0).length);
      default: return '--';
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Stats */}
      <div className="flex items-center gap-4 flex-1">
        {STAT_ITEMS.map((item, i) => (
          <motion.div
            key={item.key}
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition.normal, delay: i * 0.04 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50"
          >
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            <div>
              <p className="text-xs font-medium text-zinc-200 tabular-nums">
                {getValue(item.key)}{item.suffix ?? ''}
              </p>
              <p className="text-2xs text-zinc-500">{item.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onScan}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30 transition-colors"
        >
          <ScanSearch className="w-3.5 h-3.5" />
          Scan Patterns
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30 transition-colors"
        >
          <FileOutput className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </div>
  );
}
