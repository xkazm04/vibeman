'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface BrainEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Animated SVG background with subtle floating particles and faint neural connections.
 * Lighter version of MemoryCanvas particle field — acts as a unifying visual bed
 * behind every empty state across Brain panels.
 */
function EmptyStateBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="esParticleGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Central ambient glow */}
      <ellipse cx="50%" cy="50%" rx="30%" ry="25%" fill="url(#esParticleGlow)" />

      {/* Faint neural connection lines */}
      <g opacity="0.4">
        <line x1="20%" y1="35%" x2="40%" y2="50%" stroke="#a855f7" strokeWidth="0.4" opacity="0.12">
          <animate attributeName="opacity" values="0.12;0.05;0.12" dur="5s" repeatCount="indefinite" />
        </line>
        <line x1="40%" y1="50%" x2="65%" y2="40%" stroke="#a855f7" strokeWidth="0.4" opacity="0.10">
          <animate attributeName="opacity" values="0.10;0.04;0.10" dur="6s" repeatCount="indefinite" />
        </line>
        <line x1="65%" y1="40%" x2="80%" y2="55%" stroke="#a855f7" strokeWidth="0.4" opacity="0.08">
          <animate attributeName="opacity" values="0.08;0.03;0.08" dur="5.5s" repeatCount="indefinite" />
        </line>
        <line x1="40%" y1="50%" x2="55%" y2="65%" stroke="#a855f7" strokeWidth="0.3" opacity="0.07">
          <animate attributeName="opacity" values="0.07;0.03;0.07" dur="7s" repeatCount="indefinite" />
        </line>
        <line x1="30%" y1="60%" x2="55%" y2="65%" stroke="#a855f7" strokeWidth="0.3" opacity="0.06">
          <animate attributeName="opacity" values="0.06;0.02;0.06" dur="6.5s" repeatCount="indefinite" />
        </line>
      </g>

      {/* Floating particles — slow drift + fade */}
      <circle cx="25%" cy="40%" r="1.2" fill="#a855f7" opacity="0.15">
        <animate attributeName="cy" values="40%;37%;40%" dur="7s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0.06;0.15" dur="7s" repeatCount="indefinite" />
      </circle>
      <circle cx="45%" cy="52%" r="1.5" fill="#a855f7" opacity="0.18">
        <animate attributeName="cy" values="52%;49%;52%" dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.18;0.08;0.18" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="70%" cy="38%" r="1" fill="#c084fc" opacity="0.12">
        <animate attributeName="cy" values="38%;35%;38%" dur="8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.12;0.04;0.12" dur="8s" repeatCount="indefinite" />
      </circle>
      <circle cx="80%" cy="58%" r="1.3" fill="#a855f7" opacity="0.10">
        <animate attributeName="cy" values="58%;55%;58%" dur="9s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.10;0.04;0.10" dur="9s" repeatCount="indefinite" />
      </circle>
      <circle cx="55%" cy="68%" r="0.8" fill="#c084fc" opacity="0.09">
        <animate attributeName="cy" values="68%;65%;68%" dur="7.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.09;0.03;0.09" dur="7.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="35%" cy="62%" r="0.9" fill="#a855f7" opacity="0.08">
        <animate attributeName="cy" values="62%;59%;62%" dur="8.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.08;0.03;0.08" dur="8.5s" repeatCount="indefinite" />
      </circle>

      {/* Neural nodes at connection intersections */}
      <circle cx="40%" cy="50%" r="1.8" fill="#a855f7" opacity="0.14">
        <animate attributeName="opacity" values="0.14;0.06;0.14" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="65%" cy="40%" r="1.4" fill="#a855f7" opacity="0.10">
        <animate attributeName="opacity" values="0.10;0.04;0.10" dur="4.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="55%" cy="65%" r="1.2" fill="#a855f7" opacity="0.08">
        <animate attributeName="opacity" values="0.08;0.03;0.08" dur="5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default function BrainEmptyState({ icon, title, description, action }: BrainEmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-xl py-8 px-6">
      <EmptyStateBackground />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0, 0, 0.2, 1] }}
        className="relative z-10 flex flex-col items-center gap-3"
      >
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {icon}
        </motion.div>
        <h3 className="text-base font-medium text-zinc-400">{title}</h3>
        <p className="text-[13px] text-zinc-600 max-w-sm text-center leading-relaxed">{description}</p>
        {action && <div className="mt-1">{action}</div>}
      </motion.div>
    </div>
  );
}
