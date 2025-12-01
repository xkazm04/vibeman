'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Scan,
  Wrench,
  TestTube,
  Shield,
  Rocket,
  CheckCircle,
  XCircle,
  Clock,
  LucideIcon,
} from 'lucide-react';
import {
  LifecyclePhase,
  LIFECYCLE_PHASE_CONFIGS,
  isActivePhase,
} from '../lib/lifecycleTypes';

interface LifecyclePhaseIndicatorProps {
  phase: LifecyclePhase;
  progress?: number;
  compact?: boolean;
}

/**
 * Icons for each lifecycle phase (kept separate as they are UI-specific)
 */
const PHASE_ICONS: Record<LifecyclePhase, LucideIcon> = {
  idle: Clock,
  detecting: Search,
  scanning: Scan,
  resolving: Wrench,
  testing: TestTube,
  validating: Shield,
  deploying: Rocket,
  completed: CheckCircle,
  failed: XCircle,
};

export default function LifecyclePhaseIndicator({
  phase,
  progress = 0,
  compact = false,
}: LifecyclePhaseIndicatorProps) {
  const config = LIFECYCLE_PHASE_CONFIGS[phase];
  const Icon = PHASE_ICONS[phase];
  const isActive = isActivePhase(phase);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgColor} ${config.borderColor} border`}
        data-testid={`lifecycle-phase-${phase}`}
      >
        {isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Icon className={`w-3.5 h-3.5 ${config.color}`} />
          </motion.div>
        ) : (
          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        )}
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-3 rounded-lg ${config.bgColor} ${config.borderColor} border`}
      data-testid={`lifecycle-phase-${phase}`}
    >
      {/* Icon with animation */}
      <div className="relative">
        {isActive ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Icon className={`w-5 h-5 ${config.color}`} />
          </motion.div>
        ) : (
          <Icon className={`w-5 h-5 ${config.color}`} />
        )}

        {/* Pulse effect for active phases */}
        {isActive && (
          <motion.div
            className={`absolute inset-0 rounded-full ${config.bgColor}`}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Label and progress */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </div>

        {isActive && progress > 0 && (
          <div className="mt-1">
            <div className="h-1 bg-gray-700/50 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${config.color.replace('text-', 'bg-')}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-gray-500 mt-0.5">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
