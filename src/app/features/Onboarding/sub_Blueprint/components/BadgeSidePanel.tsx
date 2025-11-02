/**
 * BadgeSidePanel Component
 *
 * Side panel that displays earned badges during the onboarding process.
 * Appears on the right side of the Blueprint layout with a collapsible interface.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { useBadgeStore } from '@/stores/badgeStore';
import { BadgeIcon } from './BadgeIcon';
import { AVAILABLE_BADGES } from '@/types/badges';

export const BadgeSidePanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const earnedBadges = useBadgeStore((state) => state.earnedBadges);

  // Calculate progress from earnedBadges to avoid infinite loop
  const progress = useMemo(() => {
    const earned = earnedBadges.length;
    const total = Object.keys(AVAILABLE_BADGES).length;
    return {
      earned,
      total,
      percentage: total > 0 ? Math.round((earned / total) * 100) : 0,
    };
  }, [earnedBadges.length]); // Only recalculate when count changes

  const togglePanel = () => setIsExpanded(!isExpanded);

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="fixed right-0 top-20 z-40 h-[calc(100vh-5rem)]"
    >
      <div className="relative h-full flex items-stretch">
        {/* Toggle Button */}
        <button
          onClick={togglePanel}
          className="
            absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full
            bg-slate-800/90 backdrop-blur-sm
            border border-cyan-500/30 border-r-0
            rounded-l-lg p-2
            hover:bg-slate-700/90 transition-colors
            shadow-lg
          "
          data-testid="badge-panel-toggle"
        >
          {isExpanded ? (
            <ChevronRight size={20} className="text-cyan-400" />
          ) : (
            <ChevronLeft size={20} className="text-cyan-400" />
          )}
        </button>

        {/* Panel Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="
                bg-slate-900/50 backdrop-blur-md
                border-l border-cyan-500/20
                shadow-2xl overflow-hidden
              "
            >
              <div className="h-full flex flex-col p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-cyan-500/20">
                  <Award className="text-cyan-400" size={24} />
                  <div>
                    <h3 className="text-cyan-400 font-bold text-lg">
                      Achievements
                    </h3>
                    <p className="text-slate-400 text-xs">
                      {progress.earned} / {progress.total} earned
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    />
                  </div>
                  <p className="text-slate-400 text-xs mt-1 text-right">
                    {progress.percentage}% complete
                  </p>
                </div>

                {/* Badge Grid */}
                <div className="flex-1 overflow-y-auto">
                  {earnedBadges.length === 0 ? (
                    <div className="text-center text-slate-500 text-sm mt-8">
                      Complete decisions to earn badges
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {earnedBadges.map((badge) => (
                        <motion.div
                          key={badge.id}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 200,
                            damping: 15,
                          }}
                          className="flex justify-center"
                        >
                          <BadgeIcon badge={badge} size="md" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Note */}
                <div className="mt-4 pt-4 border-t border-cyan-500/20">
                  <p className="text-slate-400 text-xs text-center">
                    Hover over badges to see details
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
