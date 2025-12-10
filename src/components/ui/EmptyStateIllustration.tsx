'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export type IllustrationType = 'ideas' | 'contexts' | 'goals' | 'scanQueue';

interface EmptyStateIllustrationProps {
  /** Type of illustration to display */
  type: IllustrationType;
  /** Primary headline text */
  headline: string;
  /** Secondary description text */
  description: string;
  /** Optional call-to-action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Optional secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
  /** Custom height (defaults to py-24) */
  height?: string;
  /** Test ID for the component */
  testId?: string;
}

// SVG Illustrations matching glassmorphism aesthetic
const IdeasIllustration = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-cyan-400"
  >
    {/* Background glow circle */}
    <circle cx="100" cy="70" r="50" fill="url(#ideasGlow)" fillOpacity="0.15" />

    {/* Light bulb outline */}
    <path
      d="M100 20C75.15 20 55 40.15 55 65C55 81.5 64.5 95.7 78 103.5V115C78 120.5 82.5 125 88 125H112C117.5 125 122 120.5 122 115V103.5C135.5 95.7 145 81.5 145 65C145 40.15 124.85 20 100 20Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="url(#bulbGradient)"
      fillOpacity="0.1"
    />

    {/* Filament */}
    <path
      d="M88 85C88 85 92 95 100 95C108 95 112 85 112 85"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Base lines */}
    <line x1="82" y1="130" x2="118" y2="130" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="85" y1="137" x2="115" y2="137" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="90" y1="144" x2="110" y2="144" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

    {/* Sparkle particles */}
    <motion.circle
      cx="40" cy="40"
      r="3"
      fill="currentColor"
      fillOpacity="0.6"
      animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity, delay: 0 }}
    />
    <motion.circle
      cx="160" cy="50"
      r="2.5"
      fill="currentColor"
      fillOpacity="0.5"
      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
    />
    <motion.circle
      cx="50" cy="100"
      r="2"
      fill="currentColor"
      fillOpacity="0.4"
      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
    />
    <motion.circle
      cx="155" cy="95"
      r="2"
      fill="currentColor"
      fillOpacity="0.4"
      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
    />

    <defs>
      <radialGradient id="ideasGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="bulbGradient" x1="55" y1="20" x2="145" y2="125">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
      </linearGradient>
    </defs>
  </svg>
);

const ContextsIllustration = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-blue-400"
  >
    {/* Central hub glow */}
    <circle cx="100" cy="80" r="40" fill="url(#contextGlow)" fillOpacity="0.12" />

    {/* Central node */}
    <motion.circle
      cx="100" cy="80"
      r="16"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      fillOpacity="0.15"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity }}
    />

    {/* Outer nodes with connections */}
    {/* Top node */}
    <motion.circle
      cx="100" cy="30"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.1"
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 4, repeat: Infinity }}
    />
    <line x1="100" y1="42" x2="100" y2="64" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 3" />

    {/* Top-right node */}
    <motion.circle
      cx="150" cy="50"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.1"
      animate={{ x: [0, 3, 0], y: [0, -2, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, delay: 0.3 }}
    />
    <line x1="140" y1="56" x2="115" y2="70" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 3" />

    {/* Right node */}
    <motion.circle
      cx="160" cy="100"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.1"
      animate={{ x: [0, 3, 0] }}
      transition={{ duration: 4, repeat: Infinity, delay: 0.6 }}
    />
    <line x1="150" y1="97" x2="118" y2="85" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 3" />

    {/* Bottom-right node */}
    <motion.circle
      cx="140" cy="140"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.1"
      animate={{ x: [0, 2, 0], y: [0, 3, 0] }}
      transition={{ duration: 3.8, repeat: Infinity, delay: 0.9 }}
    />
    <line x1="132" y1="133" x2="110" y2="94" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 3" />

    {/* Bottom-left node */}
    <motion.circle
      cx="60" cy="140"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.1"
      animate={{ x: [0, -2, 0], y: [0, 3, 0] }}
      transition={{ duration: 4.2, repeat: Infinity, delay: 1.2 }}
    />
    <line x1="68" y1="133" x2="90" y2="94" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 3" />

    {/* Left node */}
    <motion.circle
      cx="40" cy="100"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.1"
      animate={{ x: [0, -3, 0] }}
      transition={{ duration: 3.7, repeat: Infinity, delay: 1.5 }}
    />
    <line x1="50" y1="97" x2="82" y2="85" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 3" />

    {/* Top-left node */}
    <motion.circle
      cx="50" cy="50"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.1"
      animate={{ x: [0, -3, 0], y: [0, -2, 0] }}
      transition={{ duration: 4.1, repeat: Infinity, delay: 1.8 }}
    />
    <line x1="60" y1="56" x2="85" y2="70" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 3" />

    <defs>
      <radialGradient id="contextGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const GoalsIllustration = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-primary"
  >
    {/* Background glow */}
    <circle cx="100" cy="80" r="55" fill="url(#goalsGlow)" fillOpacity="0.1" />

    {/* Target circles */}
    <circle cx="100" cy="80" r="50" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" fill="none" />
    <circle cx="100" cy="80" r="38" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" fill="none" />
    <circle cx="100" cy="80" r="26" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" fill="none" />
    <motion.circle
      cx="100" cy="80"
      r="14"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="currentColor"
      fillOpacity="0.2"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    />

    {/* Center dot */}
    <motion.circle
      cx="100" cy="80"
      r="4"
      fill="currentColor"
      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />

    {/* Arrow */}
    <motion.g
      animate={{ x: [0, -3, 0], y: [0, 3, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
    >
      <line x1="150" y1="30" x2="108" y2="72" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="108,72 115,65 118,75" fill="currentColor" />
      <line x1="150" y1="30" x2="165" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="150" y1="30" x2="150" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </motion.g>

    {/* Achievement stars */}
    <motion.path
      d="M35 50L37 55L42 55L38 58L40 63L35 60L30 63L32 58L28 55L33 55Z"
      fill="currentColor"
      fillOpacity="0.6"
      animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2.5, repeat: Infinity }}
    />
    <motion.path
      d="M170 120L172 125L177 125L173 128L175 133L170 130L165 133L167 128L163 125L168 125Z"
      fill="currentColor"
      fillOpacity="0.5"
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
    />

    <defs>
      <radialGradient id="goalsGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const ScanQueueIllustration = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-purple-400"
  >
    {/* Background glow */}
    <ellipse cx="100" cy="85" rx="70" ry="50" fill="url(#scanGlow)" fillOpacity="0.1" />

    {/* Radar circle */}
    <circle cx="100" cy="80" r="45" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
    <circle cx="100" cy="80" r="30" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
    <circle cx="100" cy="80" r="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" fill="none" />

    {/* Radar sweep */}
    <motion.path
      d="M100 80 L100 35 A45 45 0 0 1 138 62 Z"
      fill="url(#sweepGradient)"
      fillOpacity="0.3"
      style={{ transformOrigin: '100px 80px' }}
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
    />

    {/* Center dot */}
    <motion.circle
      cx="100" cy="80"
      r="4"
      fill="currentColor"
      animate={{ opacity: [0.8, 1, 0.8] }}
      transition={{ duration: 1, repeat: Infinity }}
    />

    {/* Scan lines (horizontal) */}
    <motion.line
      x1="55" y1="55"
      x2="145" y2="55"
      stroke="currentColor"
      strokeWidth="1"
      strokeOpacity="0.3"
      animate={{ opacity: [0, 0.5, 0], y: [0, 50, 0] }}
      transition={{ duration: 3, repeat: Infinity }}
    />

    {/* Detected items */}
    <motion.circle
      cx="120" cy="65"
      r="4"
      fill="currentColor"
      fillOpacity="0.7"
      animate={{ scale: [0, 1, 0.8], opacity: [0, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
    />
    <motion.circle
      cx="80" cy="95"
      r="3"
      fill="currentColor"
      fillOpacity="0.6"
      animate={{ scale: [0, 1, 0.8], opacity: [0, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity, delay: 2 }}
    />
    <motion.circle
      cx="110" cy="100"
      r="3.5"
      fill="currentColor"
      fillOpacity="0.6"
      animate={{ scale: [0, 1, 0.8], opacity: [0, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity, delay: 3 }}
    />

    {/* Queue items stack */}
    <motion.g animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity }}>
      <rect x="25" y="115" width="35" height="8" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1" />
      <rect x="25" y="127" width="35" height="8" rx="2" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
      <rect x="25" y="139" width="35" height="8" rx="2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
    </motion.g>

    {/* Processing indicator */}
    <motion.rect
      x="140" y="120"
      width="40" height="25"
      rx="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="currentColor"
      fillOpacity="0.1"
      animate={{ strokeOpacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
    <motion.path
      d="M150 132.5 L160 125 L160 140 Z"
      fill="currentColor"
      fillOpacity="0.6"
      animate={{ x: [0, 2, 0] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />

    <defs>
      <radialGradient id="scanGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="sweepGradient" x1="100" y1="35" x2="138" y2="62">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

const illustrations: Record<IllustrationType, React.FC> = {
  ideas: IdeasIllustration,
  contexts: ContextsIllustration,
  goals: GoalsIllustration,
  scanQueue: ScanQueueIllustration,
};

const colorSchemes: Record<IllustrationType, { primary: string; hover: string; border: string }> = {
  ideas: {
    primary: 'from-cyan-500/20 to-blue-500/20',
    hover: 'hover:from-cyan-500/30 hover:to-blue-500/30',
    border: 'border-cyan-500/30',
  },
  contexts: {
    primary: 'from-blue-500/20 to-indigo-500/20',
    hover: 'hover:from-blue-500/30 hover:to-indigo-500/30',
    border: 'border-blue-500/30',
  },
  goals: {
    primary: 'from-primary/20 to-blue-500/20',
    hover: 'hover:from-primary/30 hover:to-blue-500/30',
    border: 'border-primary/30',
  },
  scanQueue: {
    primary: 'from-purple-500/20 to-pink-500/20',
    hover: 'hover:from-purple-500/30 hover:to-pink-500/30',
    border: 'border-purple-500/30',
  },
};

const textColors: Record<IllustrationType, string> = {
  ideas: 'text-cyan-400',
  contexts: 'text-blue-400',
  goals: 'text-primary',
  scanQueue: 'text-purple-400',
};

/**
 * EmptyStateIllustration Component
 *
 * A visually rich empty state component with themed SVG illustrations,
 * glassmorphism styling, and optional action buttons.
 */
export default function EmptyStateIllustration({
  type,
  headline,
  description,
  action,
  secondaryAction,
  className = '',
  height = 'py-24',
  testId,
}: EmptyStateIllustrationProps) {
  const Illustration = illustrations[type];
  const colors = colorSchemes[type];
  const textColor = textColors[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center ${height} text-center ${className}`}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      {/* Illustration container with glow effect */}
      <motion.div
        className="relative mb-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        {/* Ambient glow behind illustration */}
        <div
          className="absolute inset-0 blur-3xl opacity-30"
          style={{
            background: `radial-gradient(circle, ${type === 'ideas' ? 'rgb(34, 211, 238)' : type === 'contexts' ? 'rgb(59, 130, 246)' : type === 'goals' ? 'rgb(59, 130, 246)' : 'rgb(168, 85, 247)'} 0%, transparent 70%)`,
          }}
        />
        <Illustration />
      </motion.div>

      {/* Headline */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className={`text-xl font-semibold ${textColor} mb-3`}
      >
        {headline}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-gray-400 max-w-md mb-6 leading-relaxed"
      >
        {description}
      </motion.p>

      {/* Action buttons */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {action && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${colors.primary} ${colors.hover} ${textColor} rounded-xl transition-all ${colors.border} border backdrop-blur-sm font-medium`}
              data-testid={testId ? `${testId}-action-btn` : undefined}
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </motion.button>
          )}
          {secondaryAction && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={secondaryAction.onClick}
              className="px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors text-sm"
              data-testid={testId ? `${testId}-secondary-btn` : undefined}
            >
              {secondaryAction.label}
            </motion.button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Export individual illustrations for potential standalone use
export { IdeasIllustration, ContextsIllustration, GoalsIllustration, ScanQueueIllustration };
