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
import { LifecyclePhase } from '../lib/lifecycleTypes';

interface LifecyclePhaseIndicatorProps {
  phase: LifecyclePhase;
  progress?: number;
  compact?: boolean;
}

interface PhaseConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const PHASE_CONFIG: Record<LifecyclePhase, PhaseConfig> = {
  idle: {
    icon: Clock,
    label: 'Idle',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
  detecting: {
    icon: Search,
    label: 'Detecting',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  scanning: {
    icon: Scan,
    label: 'Scanning',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  resolving: {
    icon: Wrench,
    label: 'Resolving',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  testing: {
    icon: TestTube,
    label: 'Testing',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  validating: {
    icon: Shield,
    label: 'Validating',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
  },
  deploying: {
    icon: Rocket,
    label: 'Deploying',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

export default function LifecyclePhaseIndicator({
  phase,
  progress = 0,
  compact = false,
}: LifecyclePhaseIndicatorProps) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  const isActive = !['idle', 'completed', 'failed'].includes(phase);

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
