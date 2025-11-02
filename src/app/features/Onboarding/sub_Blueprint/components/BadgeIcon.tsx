/**
 * BadgeIcon Component
 *
 * Displays an individual badge icon with hover tooltip.
 * Used in both the side panel and the gallery view.
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/types/badges';

interface BadgeIconProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  animate?: boolean;
}

const sizeMap = {
  sm: { icon: 16, container: 32 },
  md: { icon: 24, container: 48 },
  lg: { icon: 32, container: 64 },
};

const categoryColors = {
  build: 'from-orange-500 to-amber-500',
  context: 'from-blue-500 to-cyan-500',
  photo: 'from-purple-500 to-pink-500',
  structure: 'from-green-500 to-emerald-500',
  vision: 'from-yellow-500 to-orange-500',
};

export const BadgeIcon: React.FC<BadgeIconProps> = ({
  badge,
  size = 'md',
  showTooltip = true,
  animate = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Dynamically get the Lucide icon
  const IconComponent = (LucideIcons as any)[badge.icon] || LucideIcons.Award;
  const dimensions = sizeMap[size];
  const gradientColor = categoryColors[badge.category];

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        initial={animate ? { scale: 0, rotate: -180 } : false}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
        }}
        className={`
          relative rounded-full p-2
          bg-gradient-to-br ${gradientColor}
          shadow-lg cursor-pointer
        `}
        style={{
          width: dimensions.container,
          height: dimensions.container,
        }}
        data-testid={`badge-icon-${badge.id}`}
      >
        {/* Glow effect */}
        <div
          className={`
            absolute inset-0 rounded-full
            bg-gradient-to-br ${gradientColor}
            blur-md opacity-50
          `}
        />

        {/* Icon */}
        <div className="relative flex items-center justify-center h-full">
          <IconComponent
            size={dimensions.icon}
            className="text-white"
            strokeWidth={2.5}
          />
        </div>
      </motion.div>

      {/* Tooltip */}
      {showTooltip && (
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="
                absolute left-1/2 top-full mt-2 z-50
                -translate-x-1/2 w-48
              "
            >
              <div
                className="
                  bg-slate-900/95 backdrop-blur-sm
                  border border-cyan-500/30
                  rounded-lg p-3 shadow-xl
                "
              >
                <div className="text-cyan-400 font-semibold text-sm mb-1">
                  {badge.name}
                </div>
                <div className="text-slate-300 text-xs">
                  {badge.description}
                </div>
                {badge.earnedAt && (
                  <div className="text-slate-500 text-xs mt-2">
                    Earned: {new Date(badge.earnedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
