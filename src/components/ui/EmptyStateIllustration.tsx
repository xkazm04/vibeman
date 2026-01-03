'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export type IllustrationType =
  | 'ideas'
  | 'contexts'
  | 'goals'
  | 'scanQueue'
  | 'backend'
  | 'combined'
  | 'tasks'
  | 'review';

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

const BackendIllustration = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-emerald-400"
  >
    {/* Background glow */}
    <ellipse cx="100" cy="80" rx="60" ry="45" fill="url(#backendGlow)" fillOpacity="0.12" />

    {/* Server rack */}
    <motion.rect
      x="60" y="30"
      width="80" height="100"
      rx="6"
      stroke="currentColor"
      strokeWidth="2"
      fill="currentColor"
      fillOpacity="0.08"
      animate={{ strokeOpacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity }}
    />

    {/* Server slots */}
    <rect x="68" y="40" width="64" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" fill="currentColor" fillOpacity="0.1" />
    <rect x="68" y="68" width="64" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" fill="currentColor" fillOpacity="0.1" />
    <rect x="68" y="96" width="64" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" fill="currentColor" fillOpacity="0.1" />

    {/* Status LEDs */}
    <motion.circle cx="76" cy="51" r="3" fill="currentColor" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }} />
    <motion.circle cx="76" cy="79" r="3" fill="currentColor" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.3 }} />
    <motion.circle cx="76" cy="107" r="3" fill="currentColor" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.6 }} />

    {/* Slots inside */}
    <rect x="85" y="47" width="40" height="8" rx="1" fill="currentColor" fillOpacity="0.2" />
    <rect x="85" y="75" width="40" height="8" rx="1" fill="currentColor" fillOpacity="0.2" />
    <rect x="85" y="103" width="40" height="8" rx="1" fill="currentColor" fillOpacity="0.2" />

    {/* API endpoints flying out */}
    <motion.g animate={{ x: [0, 10, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
      <path d="M145 50 L170 50 M160 45 L170 50 L160 55" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" />
    </motion.g>
    <motion.g animate={{ x: [0, 10, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}>
      <path d="M145 80 L170 80 M160 75 L170 80 L160 85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" />
    </motion.g>
    <motion.g animate={{ x: [0, 10, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}>
      <path d="M145 110 L170 110 M160 105 L170 110 L160 115" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.7" />
    </motion.g>

    <defs>
      <radialGradient id="backendGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const CombinedIllustration = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-violet-400"
  >
    {/* Background glow */}
    <ellipse cx="100" cy="80" rx="70" ry="50" fill="url(#combinedGlow)" fillOpacity="0.1" />

    {/* Left side - Frontend (browser) */}
    <rect x="25" y="35" width="60" height="50" rx="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
    <rect x="25" y="35" width="60" height="10" rx="4" fill="currentColor" fillOpacity="0.15" />
    <circle cx="32" cy="40" r="2" fill="currentColor" fillOpacity="0.4" />
    <circle cx="40" cy="40" r="2" fill="currentColor" fillOpacity="0.4" />
    <circle cx="48" cy="40" r="2" fill="currentColor" fillOpacity="0.4" />
    <rect x="30" y="52" width="50" height="4" rx="1" fill="currentColor" fillOpacity="0.2" />
    <rect x="30" y="60" width="35" height="4" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="30" y="68" width="45" height="4" rx="1" fill="currentColor" fillOpacity="0.2" />
    <rect x="30" y="76" width="25" height="4" rx="1" fill="currentColor" fillOpacity="0.15" />

    {/* Right side - Backend (server) */}
    <rect x="115" y="35" width="60" height="50" rx="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
    <rect x="120" y="42" width="50" height="10" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
    <rect x="120" y="56" width="50" height="10" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
    <rect x="120" y="70" width="50" height="10" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
    <motion.circle cx="127" cy="47" r="2" fill="currentColor" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
    <motion.circle cx="127" cy="61" r="2" fill="currentColor" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
    <motion.circle cx="127" cy="75" r="2" fill="currentColor" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1 }} />

    {/* Connection arrows */}
    <motion.g animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
      <path d="M88 55 L112 55" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      <polygon points="110,52 115,55 110,58" fill="currentColor" />
    </motion.g>
    <motion.g animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}>
      <path d="M112 70 L88 70" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      <polygon points="90,67 85,70 90,73" fill="currentColor" />
    </motion.g>

    {/* Labels */}
    <text x="55" y="105" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">Frontend</text>
    <text x="145" y="105" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">Backend</text>

    {/* Database at bottom */}
    <ellipse cx="100" cy="130" rx="25" ry="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
    <path d="M75 130 L75 145 Q75 152 100 152 Q125 152 125 145 L125 130" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <ellipse cx="100" cy="145" rx="25" ry="8" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" fill="none" />

    <defs>
      <radialGradient id="combinedGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const TasksIllustration = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-orange-400"
  >
    {/* Background glow */}
    <ellipse cx="100" cy="80" rx="65" ry="50" fill="url(#tasksGlow)" fillOpacity="0.12" />

    {/* Clipboard */}
    <rect x="50" y="20" width="100" height="120" rx="6" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.05" />
    <rect x="75" y="12" width="50" height="16" rx="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />

    {/* Task items */}
    {/* Item 1 - completed */}
    <rect x="60" y="40" width="80" height="22" rx="3" fill="currentColor" fillOpacity="0.08" />
    <motion.rect x="65" y="45" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
    <motion.path d="M68 51 L72 55 L77 48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" animate={{ pathLength: [0, 1], opacity: [0.5, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }} />
    <rect x="85" y="47" width="50" height="4" rx="1" fill="currentColor" fillOpacity="0.25" />
    <rect x="85" y="53" width="35" height="3" rx="1" fill="currentColor" fillOpacity="0.15" />

    {/* Item 2 - in progress */}
    <rect x="60" y="68" width="80" height="22" rx="3" fill="currentColor" fillOpacity="0.08" />
    <rect x="65" y="73" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
    <motion.circle cx="72" cy="79" r="4" stroke="currentColor" strokeWidth="2" strokeDasharray="10 5" fill="none" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: '72px 79px' }} />
    <rect x="85" y="75" width="50" height="4" rx="1" fill="currentColor" fillOpacity="0.25" />
    <rect x="85" y="81" width="30" height="3" rx="1" fill="currentColor" fillOpacity="0.15" />

    {/* Item 3 - pending */}
    <rect x="60" y="96" width="80" height="22" rx="3" fill="currentColor" fillOpacity="0.05" />
    <rect x="65" y="101" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" fill="none" />
    <rect x="85" y="103" width="50" height="4" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="85" y="109" width="40" height="3" rx="1" fill="currentColor" fillOpacity="0.1" />

    {/* Claude sparkle */}
    <motion.g animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
      <path d="M155 35L158 42L165 42L160 47L162 54L155 50L148 54L150 47L145 42L152 42Z" fill="currentColor" fillOpacity="0.5" />
    </motion.g>

    <defs>
      <radialGradient id="tasksGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const ReviewIllustration = () => (
  <svg
    width="200"
    height="160"
    viewBox="0 0 200 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-amber-400"
  >
    {/* Background glow */}
    <ellipse cx="100" cy="80" rx="70" ry="50" fill="url(#reviewGlow)" fillOpacity="0.1" />

    {/* Left panel - before */}
    <rect x="25" y="30" width="70" height="100" rx="4" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" fill="currentColor" fillOpacity="0.05" />
    <text x="60" y="22" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">Before</text>
    {/* Code lines with deletions */}
    <rect x="30" y="40" width="55" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="30" y="50" width="40" height="6" rx="1" fill="#ef4444" fillOpacity="0.3" />
    <line x1="30" y1="53" x2="70" y2="53" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.6" />
    <rect x="30" y="60" width="50" height="6" rx="1" fill="#ef4444" fillOpacity="0.3" />
    <line x1="30" y1="63" x2="80" y2="63" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.6" />
    <rect x="30" y="70" width="35" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="30" y="80" width="55" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="30" y="90" width="45" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="30" y="100" width="50" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="30" y="110" width="30" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />

    {/* Right panel - after */}
    <rect x="105" y="30" width="70" height="100" rx="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05" />
    <text x="140" y="22" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">After</text>
    {/* Code lines with additions */}
    <rect x="110" y="40" width="55" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="110" y="50" width="50" height="6" rx="1" fill="#22c55e" fillOpacity="0.3" />
    <rect x="110" y="60" width="45" height="6" rx="1" fill="#22c55e" fillOpacity="0.3" />
    <rect x="110" y="70" width="55" height="6" rx="1" fill="#22c55e" fillOpacity="0.3" />
    <rect x="110" y="80" width="35" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="110" y="90" width="55" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="110" y="100" width="45" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
    <rect x="110" y="110" width="50" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />

    {/* Action buttons */}
    <motion.g animate={{ y: [0, -2, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
      <rect x="50" y="138" width="40" height="16" rx="4" fill="#22c55e" fillOpacity="0.2" stroke="#22c55e" strokeWidth="1" />
      <text x="70" y="149" textAnchor="middle" fontSize="8" fill="#22c55e">Accept</text>
    </motion.g>
    <rect x="110" y="138" width="40" height="16" rx="4" fill="#ef4444" fillOpacity="0.1" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.5" />
    <text x="130" y="149" textAnchor="middle" fontSize="8" fill="#ef4444" fillOpacity="0.7">Reject</text>

    <defs>
      <radialGradient id="reviewGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

const illustrations: Record<IllustrationType, React.FC> = {
  ideas: IdeasIllustration,
  contexts: ContextsIllustration,
  goals: GoalsIllustration,
  scanQueue: ScanQueueIllustration,
  backend: BackendIllustration,
  combined: CombinedIllustration,
  tasks: TasksIllustration,
  review: ReviewIllustration,
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
  backend: {
    primary: 'from-emerald-500/20 to-teal-500/20',
    hover: 'hover:from-emerald-500/30 hover:to-teal-500/30',
    border: 'border-emerald-500/30',
  },
  combined: {
    primary: 'from-violet-500/20 to-purple-500/20',
    hover: 'hover:from-violet-500/30 hover:to-purple-500/30',
    border: 'border-violet-500/30',
  },
  tasks: {
    primary: 'from-orange-500/20 to-amber-500/20',
    hover: 'hover:from-orange-500/30 hover:to-amber-500/30',
    border: 'border-orange-500/30',
  },
  review: {
    primary: 'from-amber-500/20 to-yellow-500/20',
    hover: 'hover:from-amber-500/30 hover:to-yellow-500/30',
    border: 'border-amber-500/30',
  },
};

const textColors: Record<IllustrationType, string> = {
  ideas: 'text-cyan-400',
  contexts: 'text-blue-400',
  goals: 'text-primary',
  scanQueue: 'text-purple-400',
  backend: 'text-emerald-400',
  combined: 'text-violet-400',
  tasks: 'text-orange-400',
  review: 'text-amber-400',
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
            background: `radial-gradient(circle, ${
              type === 'ideas' ? 'rgb(34, 211, 238)' :
              type === 'contexts' ? 'rgb(59, 130, 246)' :
              type === 'goals' ? 'rgb(59, 130, 246)' :
              type === 'backend' ? 'rgb(52, 211, 153)' :
              type === 'combined' ? 'rgb(139, 92, 246)' :
              type === 'tasks' ? 'rgb(251, 146, 60)' :
              type === 'review' ? 'rgb(251, 191, 36)' :
              'rgb(168, 85, 247)'
            } 0%, transparent 70%)`,
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
export {
  IdeasIllustration,
  ContextsIllustration,
  GoalsIllustration,
  ScanQueueIllustration,
  BackendIllustration,
  CombinedIllustration,
  TasksIllustration,
  ReviewIllustration,
};
