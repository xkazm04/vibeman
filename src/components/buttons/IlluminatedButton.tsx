'use client';

import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { LucideIcon } from 'lucide-react';

const caveat = Caveat({
  weight: ['600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export type IlluminatedButtonColor = 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo';
export type IlluminatedButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface IlluminatedButtonProps {
  /** Button label text */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Click handler */
  onClick: () => void;
  /** Color theme */
  color?: IlluminatedButtonColor;
  /** Button size */
  size?: IlluminatedButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Selected/active state */
  selected?: boolean;
  /** Show error state */
  hasError?: boolean;
  /** Show pulsing glow effect */
  glowing?: boolean;
  /** Show scanning animation */
  scanning?: boolean;
  /** Progress value 0-100 */
  progress?: number;
  /** Days ago indicator value */
  daysAgo?: number | null;
  /** Show days ago indicator */
  showDaysAgo?: boolean;
  /** Show redirect icon */
  redirectMode?: boolean;
  /** Show progress text instead of icon */
  showProgress?: boolean;
  /** Progress text to display */
  progressText?: string;
  /** Show recommended pulse */
  recommended?: boolean;
  /** Cycle through blue highlights */
  cycleBlue?: boolean;
}

const colorMap = {
  blue: {
    bg: 'from-blue-600/20 to-blue-900/40',
    border: 'border-blue-400/50',
    text: 'text-blue-200',
    glow: 'shadow-blue-500/40',
    shine: 'from-blue-300/20',
    ring: 'ring-blue-500/30',
  },
  cyan: {
    bg: 'from-cyan-600/20 to-cyan-900/40',
    border: 'border-cyan-400/50',
    text: 'text-cyan-200',
    glow: 'shadow-cyan-500/40',
    shine: 'from-cyan-300/20',
    ring: 'ring-cyan-500/30',
  },
  purple: {
    bg: 'from-purple-600/20 to-purple-900/40',
    border: 'border-purple-400/50',
    text: 'text-purple-200',
    glow: 'shadow-purple-500/40',
    shine: 'from-purple-300/20',
    ring: 'ring-purple-500/30',
  },
  amber: {
    bg: 'from-amber-600/20 to-amber-900/40',
    border: 'border-amber-400/50',
    text: 'text-amber-200',
    glow: 'shadow-amber-500/40',
    shine: 'from-amber-300/20',
    ring: 'ring-amber-500/30',
  },
  green: {
    bg: 'from-green-600/20 to-green-900/40',
    border: 'border-green-400/50',
    text: 'text-green-200',
    glow: 'shadow-green-500/40',
    shine: 'from-green-300/20',
    ring: 'ring-green-500/30',
  },
  red: {
    bg: 'from-red-600/20 to-red-900/40',
    border: 'border-red-400/50',
    text: 'text-red-200',
    glow: 'shadow-red-500/40',
    shine: 'from-red-300/20',
    ring: 'ring-red-500/30',
  },
  pink: {
    bg: 'from-pink-600/20 to-pink-900/40',
    border: 'border-pink-400/50',
    text: 'text-pink-200',
    glow: 'shadow-pink-500/40',
    shine: 'from-pink-300/20',
    ring: 'ring-pink-500/30',
  },
  indigo: {
    bg: 'from-indigo-600/20 to-indigo-900/40',
    border: 'border-indigo-400/50',
    text: 'text-indigo-200',
    glow: 'shadow-indigo-500/40',
    shine: 'from-indigo-300/20',
    ring: 'ring-indigo-500/30',
  },
  gray: {
    bg: 'from-gray-700/30 to-gray-900/50',
    border: 'border-gray-600/30',
    text: 'text-gray-400',
    glow: 'shadow-gray-700/20',
    shine: 'from-gray-500/10',
    ring: 'ring-gray-500/20',
  },
};

const sizeMap = {
  xs: { button: 'w-[52px] h-[52px]', icon: 'w-5 h-5', label: 'text-sm', labelY: 'top-[60px]' },
  sm: { button: 'w-16 h-16', icon: 'w-6 h-6', label: 'text-sm', labelY: 'top-20' },
  md: { button: 'w-20 h-20', icon: 'w-7 h-7', label: 'text-base', labelY: 'top-24' },
  lg: { button: 'w-24 h-24', icon: 'w-8 h-8', label: 'text-lg', labelY: 'top-28' },
};

/**
 * IlluminatedButton - A glowing circular button with magnetic effect
 *
 * Features:
 * - Magnetic hover effect with spring physics
 * - Multiple color themes
 * - Scanning animation state
 * - Progress display mode
 * - Days ago indicator
 * - Recommended pulse animation
 */
export default function IlluminatedButton({
  label,
  icon: Icon,
  onClick,
  color = 'cyan',
  size = 'md',
  disabled = false,
  selected = false,
  hasError = false,
  glowing = false,
  scanning = false,
  progress = 0,
  daysAgo = null,
  showDaysAgo = true,
  redirectMode = false,
  showProgress = false,
  progressText = '',
  recommended = false,
  cycleBlue = false,
}: IlluminatedButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Magnetic effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * 0.2);
      y.set((e.clientY - centerY) * 0.2);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  // Color logic
  const effectiveColor = scanning
    ? 'green'
    : disabled
      ? 'gray'
      : hasError
        ? 'red'
        : selected
          ? color
          : recommended
            ? color
            : 'gray';

  const displayColor = !disabled && !scanning && isHovered ? color : effectiveColor;
  const colors = colorMap[displayColor] || colorMap[color];
  const sizes = sizeMap[size];

  return (
    <div className="relative inline-flex flex-col items-center group/container">
      {/* Main Button */}
      <motion.button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{ x: springX, y: springY }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        className={`
          relative ${sizes.button} rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-out
          backdrop-blur-md
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
      >
        {/* Background Gradient & Border */}
        <motion.div
          className={`
            absolute inset-0 rounded-full
            bg-gradient-to-br ${colors.bg}
            border ${colors.border}
            shadow-lg ${colors.glow}
            transition-all duration-300
            ${selected ? 'border-opacity-100 ring-2 ' + colors.ring : 'border-opacity-60'}
            ${isHovered && !disabled ? 'scale-105 border-opacity-100' : ''}
          `}
          animate={cycleBlue ? {
            borderColor: [
              'rgba(96, 165, 250, 0.5)',
              'rgba(147, 197, 253, 0.7)',
              'rgba(96, 165, 250, 0.5)',
            ],
            boxShadow: [
              '0 0 15px rgba(96, 165, 250, 0.4)',
              '0 0 25px rgba(147, 197, 253, 0.6)',
              '0 0 15px rgba(96, 165, 250, 0.4)',
            ],
          } : {}}
          transition={cycleBlue ? {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          } : {}}
        />

        {/* Glass Shine */}
        <div className={`
          absolute inset-0 rounded-full
          bg-gradient-to-br ${colors.shine} via-transparent to-transparent
          opacity-40 group-hover/container:opacity-60
          transition-opacity duration-500
        `} />

        {/* Scanning Pulse/Rotate Effect */}
        {scanning && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className={`absolute inset-[-4px] rounded-full border-t-2 border-r-2 border-transparent ${colors.border} opacity-80`}
          />
        )}

        {/* Recommended Pulse */}
        {recommended && !scanning && !disabled && !selected && (
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute inset-0 rounded-full bg-${color}-500/20 -z-10`}
          />
        )}

        {/* Icon / Content */}
        <div className="relative z-10 flex items-center justify-center">
          {showProgress ? (
            <span className={`text-xs font-mono font-bold ${colors.text} drop-shadow-md`}>
              {progressText}
            </span>
          ) : (
            <Icon className={`${sizes.icon} ${colors.text} drop-shadow-md transition-transform duration-300 ${isHovered && !disabled ? 'scale-110' : ''}`} />
          )}
        </div>

        {/* Disabled Cross */}
        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-2/3 h-0.5 bg-gray-400 rotate-45 absolute" />
            <div className="w-2/3 h-0.5 bg-gray-400 -rotate-45 absolute" />
          </div>
        )}
      </motion.button>

      {/* Days Ago Indicator */}
      {showDaysAgo && daysAgo !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-gray-900 border border-gray-700 shadow-sm z-20"
          title={`${daysAgo} days ago`}
        >
          <div className={`w-2 h-2 rounded-full ${daysAgo > 7 ? 'bg-orange-500' : 'bg-green-500'}`} />
        </motion.div>
      )}

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`absolute ${sizes.labelY} whitespace-nowrap pointer-events-none z-20`}
      >
        <span className={`${caveat.className} text-xl font-bold tracking-wide ${colors.text} drop-shadow-lg transition-colors duration-300`}>
          {label}
        </span>
      </motion.div>

      {/* Redirect Icon */}
      {redirectMode && !scanning && (
        <div className="absolute -bottom-1 -right-1 pointer-events-none z-20">
          <div className="bg-gray-900/80 rounded-full p-1 border border-gray-700">
            <svg className="w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
