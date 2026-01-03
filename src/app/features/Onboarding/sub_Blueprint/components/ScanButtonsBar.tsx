'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import IlluminatedButton from './IlluminatedButton';
import { StepperConfig } from '../lib/stepperConfig';
import { useActiveOnboardingStep } from '../../lib/useOnboardingConditions';

export interface ScanButtonsBarProps {
  config: StepperConfig;
  selectedScanId: string | null;
  onScanSelect: (groupId: string, techniqueId: string) => void;
  getDaysAgo?: (techniqueId: string) => number | null;
  getScanStatus?: (techniqueId: string) => {
    isRunning: boolean;
    progress: number;
    hasError: boolean;
  };
  isRecommended?: (techniqueId: string) => boolean;
  className?: string;
}

/**
 * Horizontal scan buttons bar for Blueprint layout
 * Displays only non-context-dependent scans in a compact row
 */
export default function ScanButtonsBar({
  config,
  selectedScanId,
  onScanSelect,
  getDaysAgo,
  getScanStatus,
  isRecommended,
  className = '',
}: ScanButtonsBarProps) {
  const { isRunBlueprintActive } = useActiveOnboardingStep();

  // Memoize expensive computation of scan buttons to avoid recalculating on every render
  const scanButtons = useMemo(() => {
    return config.groups
      .filter(group => group.enabled)
      .flatMap(group =>
        group.techniques
          .filter(technique => !technique.contextNeeded) // Exclude context-dependent scans
          .map(technique => ({
            ...technique,
            groupId: group.id,
          }))
      );
  }, [config]);

  if (scanButtons.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`
        relative flex items-center justify-center gap-8 px-8 py-4
        bg-gray-950/40 backdrop-blur-xl
        border border-gray-800/50 rounded-full
        shadow-2xl shadow-black/50
        ${className}
      `}
      data-testid="scan-buttons-bar"
    >
      {/* Glass Reflection Top */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent rounded-t-full pointer-events-none" />

      {/* Bottom Glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      {scanButtons.map((button, index) => {
        const status = getScanStatus?.(button.id);
        const daysAgo = getDaysAgo?.(button.id);
        const recommended = isRecommended?.(button.id) ?? false;

        return (
          <motion.div
            key={button.id}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: index * 0.1,
              type: "spring",
              stiffness: 200,
              damping: 20
            }}
            className="relative z-10"
          >
            <IlluminatedButton
              label={button.label}
              icon={button.icon}
              onClick={() => onScanSelect(button.groupId, button.id)}
              color={button.color}
              size="sm"
              disabled={false}
              selected={button.id === selectedScanId}
              hasError={status?.hasError}
              scanning={status?.isRunning}
              progress={status?.progress}
              daysAgo={daysAgo}
              showDaysAgo={true}
              recommended={recommended}
              cycleBlue={button.id === 'contexts' && isRunBlueprintActive}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
