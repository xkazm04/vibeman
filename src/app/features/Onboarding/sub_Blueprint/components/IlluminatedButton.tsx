'use client';

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
  glowing?: boolean;
  scanning?: boolean;
  progress?: number; // 0-100
  daysAgo?: number | null; // null if never run
  redirectMode?: boolean; // Show exit icon for navigation buttons
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
    bg: 'from-gray-700/20 to-gray-600/20',
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
  glowing = false,
  scanning = false,
  progress = 0,
  daysAgo = null,
  redirectMode = false,
}: IlluminatedButtonProps) {
  // Use green color when scanning, gray when never run
  const effectiveColor = scanning ? 'green' : (daysAgo === null ? 'gray' : color);
  const colors = colorMap[effectiveColor] || colorMap[color];
  const sizes = sizeMap[size];

  // Calculate number of progress bars (1 second = 1 bar, max 5 bars)
  const progressBars = scanning ? Math.min(Math.floor(progress / 20), 5) : 0;

  return (
    <div className="relative inline-flex items-center gap-3">
      {/* Main Button */}
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.1, y: disabled ? 0 : -2 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={`group relative ${sizes.button} rounded-full disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {/* Background gradient */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.bg} transition-all duration-300`}
        />

        {/* Circular border with loading animation */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ overflow: 'visible' }}>
          {scanning ? (
            /* Animated loading border */
            <motion.circle
              cx="50%"
              cy="50%"
              r="calc(50% - 1px)"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={colors.text}
              strokeDasharray="100"
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: 100 - progress }}
              transition={{ duration: 0.3 }}
              style={{
                strokeLinecap: 'round',
                filter: 'drop-shadow(0 0 4px currentColor)'
              }}
            />
          ) : (
            /* Static border */
            <circle
              cx="50%"
              cy="50%"
              r="calc(50% - 1px)"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`${colors.border.replace('border-', 'text-')}`}
            />
          )}
        </svg>

        {/* Glass shine effect */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.shine} via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300`}
        />

        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={`${sizes.icon} ${colors.text} drop-shadow-lg`} />
        </div>

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

        {/* Scan line animation */}
        {glowing && (
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            animate={{ rotate: 360 }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-transparent via-white to-transparent opacity-30`}
            />
          </motion.div>
        )}

        {/* Inner light pulse */}
        <motion.div
          className={`absolute inset-2 rounded-full bg-white/5`}
          animate={{
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.button>

      {/* Days ago indicator (top left of button) */}
      {daysAgo !== null && daysAgo > 0 && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2">
          <span className="text-xs text-gray-500 font-mono">
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
          className={`${caveat.className} ${sizes.label} ${colors.text} font-semibold`}
          style={{
            textShadow: `0 0 10px rgba(255, 255, 255, 0.3)`,
            transform: `rotate(${Math.random() * 6 - 3}deg)`,
          }}
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
