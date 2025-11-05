'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Caveat } from 'next/font/google';
import { LucideIcon } from 'lucide-react';

const caveat = Caveat({
  weight: ['600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export interface IlluminatedButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  selected?: boolean; // Button is selected for scan (shows in decision panel)
  hasError?: boolean; // Button shows red when last scan failed
  glowing?: boolean;
  scanning?: boolean;
  progress?: number; // 0-100
  daysAgo?: number | null; // null if never run
  showDaysAgo?: boolean; // Show days ago indicator (only if scan has handler)
  redirectMode?: boolean; // Show exit icon for navigation buttons
  showProgress?: boolean; // Show progress text instead of icon (for Tasker button)
  progressText?: string; // Progress text to display (e.g., "3/10")
}

const colorMap = {
  blue: {
    bg: 'from-blue-600/40 to-blue-400/40',
    border: 'border-blue-400/60',
    text: 'text-blue-300',
    glow: 'shadow-blue-500/50',
    shine: 'from-blue-400/30',
  },
  cyan: {
    bg: 'from-cyan-600/40 to-cyan-400/40',
    border: 'border-cyan-400/60',
    text: 'text-cyan-300',
    glow: 'shadow-cyan-500/50',
    shine: 'from-cyan-400/30',
  },
  purple: {
    bg: 'from-purple-600/40 to-purple-400/40',
    border: 'border-purple-400/60',
    text: 'text-purple-300',
    glow: 'shadow-purple-500/50',
    shine: 'from-purple-400/30',
  },
  amber: {
    bg: 'from-amber-600/40 to-amber-400/40',
    border: 'border-amber-400/60',
    text: 'text-amber-300',
    glow: 'shadow-amber-500/50',
    shine: 'from-amber-400/30',
  },
  green: {
    bg: 'from-green-600/40 to-green-400/40',
    border: 'border-green-400/60',
    text: 'text-green-300',
    glow: 'shadow-green-500/50',
    shine: 'from-green-400/30',
  },
  red: {
    bg: 'from-red-600/40 to-red-400/40',
    border: 'border-red-400/60',
    text: 'text-red-300',
    glow: 'shadow-red-500/50',
    shine: 'from-red-400/30',
  },
  pink: {
    bg: 'from-pink-600/40 to-pink-400/40',
    border: 'border-pink-400/60',
    text: 'text-pink-300',
    glow: 'shadow-pink-500/50',
    shine: 'from-pink-400/30',
  },
  indigo: {
    bg: 'from-indigo-600/40 to-indigo-400/40',
    border: 'border-indigo-400/60',
    text: 'text-indigo-300',
    glow: 'shadow-indigo-500/50',
    shine: 'from-indigo-400/30',
  },
  gray: {
    bg: 'from-gray-500/50 to-gray-600/20',
    border: 'border-gray-600/30',
    text: 'text-gray-500',
    glow: 'shadow-gray-700/30',
    shine: 'from-gray-600/10',
  },
};

const sizeMap = {
  sm: { button: 'w-16 h-16', icon: 'w-6 h-6', label: 'text-sm', labelY: 'top-20' },
  md: { button: 'w-20 h-20', icon: 'w-7 h-7', label: 'text-base', labelY: 'top-24' },
  lg: { button: 'w-24 h-24', icon: 'w-8 h-8', label: 'text-lg', labelY: 'top-28' },
};

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
}: IlluminatedButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Color priority: scanning > disabled > hasError > selected > gray (default)
  const effectiveColor = scanning
    ? 'green'
    : disabled
      ? 'gray'
      : hasError
        ? 'red'
        : selected
          ? color
          : 'gray';

  // On hover (and not disabled/scanning), preview the assigned color
  const displayColor = !disabled && !scanning && isHovered ? color : effectiveColor;
  const colors = colorMap[displayColor] || colorMap[color];
  const sizes = sizeMap[size];


  return (
    <div className="relative inline-flex items-center gap-3">
      {/* Main Button */}
      <motion.button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={`group relative ${sizes.button} bg-gradient-to-br ${colors.bg}  rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all ease-linear duration-300`}
        data-testid={`blueprint-button-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >

        {/* Glass shine effect */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.shine} via-transparent to-transparent opacity-60 group-hover:opacity-60 transition-opacity duration-300`}
        />

        {/* Icon or Progress Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          {showProgress ? (
            <span className={`text-sm font-mono font-bold ${colors.text} drop-shadow-lg`}>
              {progressText}
            </span>
          ) : (
            <Icon className={`${sizes.icon} ${colors.text} drop-shadow-lg`} />
          )}
        </div>

        {/* Cross-out X for disabled buttons */}
        {disabled && (
          <div className="absolute inset-0 opacity-10 flex items-center justify-center">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line
                x1="20"
                y1="20"
                x2="80"
                y2="80"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-red-500/80"
              />
              <line
                x1="80"
                y1="20"
                x2="20"
                y2="80"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-red-500/80"
              />
            </svg>
          </div>
        )}

        {/* Outer glow */}
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.bg} blur-md ${colors.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`}
          animate={{
            opacity: glowing ? [0.4, 0.8, 0.4] : 0,
            scale: glowing ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: glowing ? Infinity : 0,
            ease: 'easeInOut',
          }}
        />

      </motion.button>

      {/* Days ago indicator (top left of button) */}
      {showDaysAgo && daysAgo !== null && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2">
          <span className={`text-xs font-mono ${daysAgo > 7 ? 'text-orange-500' : 'text-green-500'}`}>
            {daysAgo}d
          </span>
        </div>
      )}

      {/* Hand-written label */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`absolute ${sizes.labelY} left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none`}
      >
        <span
          className={`uppercase text-2xl ${colors.text} ${caveat.className} font-semibold`}
        >
          {label}
        </span>
      </motion.div>

      {/* Pin marker effect (for map themes) */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-gradient-to-b from-white/20 to-transparent rounded-full" />

      {/* Exit icon for redirect mode (bottom right of button) */}
      {redirectMode && !scanning && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-2 -right-2"
        >
          <div className="relative p-1.5 bg-gray-900/90 rounded-full border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/30">
            <svg
              className="w-3 h-3 text-cyan-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
        </motion.div>
      )}
    </div>
  );
}
