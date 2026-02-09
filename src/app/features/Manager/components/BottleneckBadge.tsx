/**
 * BottleneckBadge Component
 * Warning badge overlay on context nodes indicating high failure rate
 * in cross-context work. Shows count of failed cross-context implementations.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface BottleneckBadgeProps {
  failCount: number;
  onClick: () => void;
}

export default function BottleneckBadge({ failCount, onClick }: BottleneckBadgeProps) {
  return (
    <motion.div
      className="absolute -bottom-2 -right-2 z-10 cursor-pointer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${failCount} failed cross-context implementations`}
    >
      <div className="relative flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/90 border border-red-400/60 shadow-lg">
        <AlertTriangle className="w-3 h-3 text-white" />
        <span className="text-[9px] font-bold text-white">{failCount}</span>

        {/* Pulse animation ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-red-400"
          animate={{
            opacity: [0.6, 0, 0.6],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </motion.div>
  );
}
