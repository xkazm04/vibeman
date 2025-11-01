'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Sparkles } from 'lucide-react';

interface IdeaStats {
  total: number;
  pending: number;
  accepted: number;
  implemented: number;
}

interface IdeasStatsProps {
  stats: IdeaStats;
}

export default function IdeasStats({ stats }: IdeasStatsProps) {
  return (
    <motion.div
      className="flex items-center gap-2 backdrop-blur-sm rounded-lg px-3 py-1.5"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Pending */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
        <Clock className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-mono font-semibold text-blue-400">{stats.pending}</span>
      </div>

      {/* Accepted */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs font-mono font-semibold text-green-400">{stats.accepted}</span>
      </div>

      {/* Implemented */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-mono font-semibold text-amber-400">{stats.implemented}</span>
      </div>
    </motion.div>
  );
}
