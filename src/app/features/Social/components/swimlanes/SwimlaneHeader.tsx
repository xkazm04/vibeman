'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SwimlaneHeaderProps {
  label: string;
  count: number;
  color: string;
  icon?: LucideIcon;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SwimlaneHeader({
  label,
  count,
  color,
  icon: Icon,
  isCollapsed,
  onToggle,
}: SwimlaneHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-3 rounded-lg
        bg-gray-900/40 border border-gray-700/40
        hover:bg-gray-800/60 transition-colors group"
    >
      {/* Collapse indicator */}
      <motion.div
        animate={{ rotate: isCollapsed ? 0 : 90 }}
        transition={{ duration: 0.15 }}
      >
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </motion.div>

      {/* Color indicator */}
      <div className={`w-3 h-3 rounded-full ${color}`} />

      {/* Icon (if provided) */}
      {Icon && <Icon className="w-4 h-4 text-gray-400" />}

      {/* Label */}
      <span className="font-medium text-gray-200">{label}</span>

      {/* Count badge */}
      <span className="px-2 py-0.5 rounded-full text-xs font-medium
        bg-gray-800/60 text-gray-400
        border border-gray-700/40">
        {count}
      </span>

      {/* Spacer */}
      <span className="flex-1" />

      {/* Keyboard hint */}
      <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100">
        {isCollapsed ? 'Expand' : 'Collapse'}
      </span>
    </button>
  );
}

export default SwimlaneHeader;
