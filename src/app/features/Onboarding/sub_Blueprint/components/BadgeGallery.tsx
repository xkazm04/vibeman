/**
 * BadgeGallery Component
 *
 * Full-screen gallery displaying all earned badges at the end of onboarding.
 * Shows celebration animation and categorized badge display.
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Award, Sparkles } from 'lucide-react';
import { useBadgeStore } from '@/stores/badgeStore';
import { BadgeIcon } from './BadgeIcon';
import { Badge } from '@/types/badges';

interface BadgeGalleryProps {
  onClose?: () => void;
}

const categoryNames = {
  build: 'Build & Configuration',
  context: 'Context & Documentation',
  photo: 'Visual Testing',
  structure: 'Architecture',
  vision: 'Vision & Goals',
};

export const BadgeGallery: React.FC<BadgeGalleryProps> = ({ onClose }) => {
  const earnedBadges = useBadgeStore((state) => state.earnedBadges);
  const progress = useBadgeStore((state) => state.getProgress());

  // Group badges by category
  const badgesByCategory = earnedBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<Badge['category'], Badge[]>);

  const categories = Object.keys(badgesByCategory) as Badge['category'][];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="
        fixed inset-0 z-50
        bg-slate-950/95 backdrop-blur-md
        flex items-center justify-center
        p-8 overflow-y-auto
      "
      data-testid="badge-gallery"
    >
      <div className="max-w-5xl w-full">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-12"
        >
          {/* Celebration Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.5,
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="inline-block mb-4"
          >
            <div className="relative">
              <Award size={64} className="text-cyan-400" />
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles size={24} className="text-yellow-400" />
              </motion.div>
            </div>
          </motion.div>

          <h1 className="text-4xl font-bold text-cyan-400 mb-2">
            Congratulations!
          </h1>
          <p className="text-xl text-slate-300">
            You've completed the Blueprint onboarding
          </p>
          <p className="text-slate-400 mt-2">
            Earned {progress.earned} out of {progress.total} badges
          </p>
        </motion.div>

        {/* Badge Categories */}
        <div className="space-y-8">
          {categories.map((category, categoryIndex) => (
            <motion.div
              key={category}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 + categoryIndex * 0.1 }}
              className="
                bg-slate-900/50 backdrop-blur-sm
                border border-cyan-500/20
                rounded-lg p-6
              "
            >
              <h2 className="text-xl font-semibold text-cyan-400 mb-4">
                {categoryNames[category]}
              </h2>
              <div className="flex flex-wrap gap-6">
                {badgesByCategory[category].map((badge, badgeIndex) => (
                  <motion.div
                    key={badge.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: 0.8 + categoryIndex * 0.1 + badgeIndex * 0.05,
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                    }}
                    className="flex flex-col items-center"
                  >
                    <BadgeIcon badge={badge} size="lg" animate={false} />
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium text-slate-300">
                        {badge.name}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Close Button */}
        {onClose && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-center mt-12"
          >
            <button
              onClick={onClose}
              className="
                px-8 py-3 rounded-lg
                bg-gradient-to-r from-cyan-500 to-blue-500
                text-white font-semibold
                hover:from-cyan-600 hover:to-blue-600
                transition-all duration-300
                shadow-lg hover:shadow-cyan-500/50
              "
              data-testid="badge-gallery-close"
            >
              Continue to Dashboard
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
