import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Code, Camera } from 'lucide-react';

export interface ContextJailCardProps {
  context: {
    id: string;
    name: string;
    updatedAt?: string | Date;
    testUpdated?: string | Date;
    [key: string]: any;
  };
  group?: {
    color: string;
    [key: string]: any;
  };
  index?: number;
  fontSize?: string;
  onClick?: (context: any, e: React.MouseEvent) => void;
  onRightClick?: (context: any, e: React.MouseEvent) => void;
  isSelected?: boolean; // For Blueprint - show glow when selected
  className?: string;
}

/**
 * Reusable ContextJailCard component
 * Displays a context with jail-like bars and time indicators
 *
 * Usage:
 * - In Context Groups: with tooltip toggle on click, context menu on right-click
 * - In Blueprint: with selection glow on click, context menu on right-click
 */
const ContextJailCard = React.memo<ContextJailCardProps>(({
  context,
  group,
  index = 0,
  fontSize = 'text-base',
  onClick,
  onRightClick,
  isSelected = false,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Memoized handlers for performance
  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onRightClick) {
      onRightClick(context, e);
    }
  }, [context, onRightClick]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (onClick) {
      onClick(context, e);
    }
  }, [context, onClick]);

  // Memoized animation variants for better performance
  const animationVariants = useMemo(() => ({
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    hover: { scale: 1.02 }
  }), []);

  const transitionConfig = useMemo(() => ({
    duration: 0.3,
    delay: index * 0.1,
    type: "spring" as const,
    stiffness: 300,
    damping: 30
  }), [index]);

  // Calculate days from last update
  const daysFromUpdate = useMemo(() => {
    if (!context.updatedAt) return null;
    const now = new Date();
    const updated = new Date(context.updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [context.updatedAt]);

  // Calculate days from last test
  const daysFromTest = useMemo(() => {
    if (!context.testUpdated) return null;
    const now = new Date();
    const tested = new Date(context.testUpdated);
    const diffMs = now.getTime() - tested.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [context.testUpdated]);

  const defaultColor = '#06b6d4'; // cyan-500
  const groupColor = group?.color || defaultColor;

  return (
    <motion.div
      ref={cardRef}
      className={`relative group cursor-pointer ${className}`}
      variants={animationVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      transition={transitionConfig}
      onClick={handleClick}
      onContextMenu={handleRightClick}
    >
      {/* Jail Door Rectangle */}
      <div
        className="relative h-full w-full overflow-hidden border-2 bg-gradient-to-br from-gray-900/40 via-transparent to-gray-800/40 backdrop-blur-sm group-hover:from-gray-800/60 group-hover:to-gray-700/60 transition-all duration-300"
        style={{ borderColor: `${groupColor}60` }}
      >

        {/* Time Indicators in Upper Left Corner */}
        {(daysFromUpdate !== null || daysFromTest !== null) && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
            {/* Days from last update */}
            {daysFromUpdate !== null && (
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${
                  daysFromUpdate > 7 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700/50 text-gray-400'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>{daysFromUpdate}</span>
              </div>
            )}

            {/* Days from last test */}
            {daysFromTest !== null && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-teal-500/20 text-teal-400">
                <Camera className="w-3 h-3" />
                <span>{daysFromTest}D</span>
              </div>
            )}
          </div>
        )}

        {/* Vertical Bars */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 6 }).map((_, barIndex) => (
            <motion.div
              key={barIndex}
              className="flex-1 border-r"
              style={{
                borderColor: `${groupColor}20`
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                delay: index * 0.1 + barIndex * 0.02,
                duration: 0.3
              }}
            />
          ))}
        </div>

        {/* Horizontal Bars */}
        <div className="absolute inset-0 flex flex-col">
          {Array.from({ length: 4 }).map((_, barIndex) => (
            <motion.div
              key={barIndex}
              className="flex-1 border-b"
              style={{
                borderColor: `${groupColor}20`
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                delay: index * 0.1 + barIndex * 0.03,
                duration: 0.3
              }}
            />
          ))}
        </div>

        {/* Context Name - Main Content */}
        <div className="relative z-10 h-full flex items-center justify-center p-4">
          <motion.h4
            className={`font-bold font-mono text-center leading-tight bg-gradient-to-r bg-clip-text text-transparent ${fontSize}`}
            style={{
              backgroundImage: `linear-gradient(to right, ${groupColor}, ${groupColor}C0)`
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: index * 0.1 + 0.3,
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
          >
            {context.name}
          </motion.h4>
        </div>

        {/* Hover Glow Effect */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `linear-gradient(45deg, ${groupColor}15, transparent, ${groupColor}15)`,
            filter: 'blur(2px)',
          }}
        />

        {/* Selected Glow Effect (for Blueprint) */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(45deg, ${groupColor}30, transparent, ${groupColor}30)`,
              filter: 'blur(4px)',
              boxShadow: `0 0 20px ${groupColor}80`,
            }}
            animate={{
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Corner Reinforcements */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: groupColor }} />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: groupColor }} />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: groupColor }} />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: groupColor }} />
      </div>
    </motion.div>
  );
});

ContextJailCard.displayName = 'ContextJailCard';

export default ContextJailCard;
