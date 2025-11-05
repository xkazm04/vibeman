'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';
import { useGlobalIdeaStats } from '@/hooks/useGlobalIdeaStats';

/**
 * IdeaStatsBar
 *
 * Globally visible stats bar showing idea statistics
 * Fixed position at top-right of viewport
 * Auto-refreshes every 30 seconds with manual refresh option
 */
export default function IdeaStatsBar() {
  const { stats, loading, refresh } = useGlobalIdeaStats();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refresh();
    // Reset refreshing state after animation
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 right-6 z-40 flex items-center gap-2"
    >
      {/* Stats Container */}
      <div className="flex items-center gap-2 backdrop-blur-xl bg-gray-900/80 border border-gray-700/40 rounded-xl shadow-2xl px-3 py-2">
        {/* Pending */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-mono font-semibold text-blue-400">
            {loading ? '...' : stats.pending}
          </span>
        </div>

        {/* Accepted */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs font-mono font-semibold text-green-400">
            {loading ? '...' : stats.accepted}
          </span>
        </div>

        {/* Implemented */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-mono font-semibold text-amber-400">
            {loading ? '...' : stats.implemented}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-700/40 mx-1" />

        {/* Refresh Button */}
        <motion.button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded hover:bg-gray-700/40 transition-colors text-gray-400 hover:text-gray-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Refresh stats"
          data-testid="refresh-idea-stats"
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </motion.div>
        </motion.button>
      </div>
    </motion.div>
  );
}
