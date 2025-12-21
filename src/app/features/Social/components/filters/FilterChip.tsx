'use client';

import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface FilterChipProps {
  label: string;
  count?: number;
  onRemove: () => void;
  color?: 'default' | 'channel' | 'priority' | 'sentiment' | 'sla';
}

const COLOR_STYLES = {
  default: 'bg-gray-700/40 text-gray-300 border-gray-600/40',
  channel: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  priority: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  sentiment: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  sla: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

export function FilterChip({
  label,
  count,
  onRemove,
  color = 'default',
}: FilterChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs
        font-medium border ${COLOR_STYLES[color]} transition-colors`}
    >
      <span>{label}</span>
      {count !== undefined && count > 1 && (
        <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
          {count}
        </span>
      )}
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

export default FilterChip;
