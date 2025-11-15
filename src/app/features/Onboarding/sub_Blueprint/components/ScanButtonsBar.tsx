'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import IlluminatedButton from './IlluminatedButton';
import { StepperConfig } from '../lib/stepperConfig';

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
    <div
      className={`flex items-center justify-center gap-16 ${className}`}
      data-testid="scan-buttons-bar"
    >
      {scanButtons.map((button, index) => {
        const status = getScanStatus?.(button.id);
        const daysAgo = getDaysAgo?.(button.id);
        const recommended = isRecommended?.(button.id) ?? false;

        return (
          <motion.div
            key={button.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative"
          >
            {/* Days ago indicator - Top of button */}
            {daysAgo !== null && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <span className={`text-xs font-mono opacity-50 ${daysAgo > 7 ? 'text-orange-500' : 'text-green-500'}`}>
                  {daysAgo}d
                </span>
              </div>
            )}

            <IlluminatedButton
              label={button.label}
              icon={button.icon}
              onClick={() => onScanSelect(button.groupId, button.id)}
              color={button.color}
              size="xs" // Extra small - 20% smaller than sm but with same icon size
              disabled={false}
              selected={button.id === selectedScanId}
              hasError={status?.hasError}
              scanning={status?.isRunning}
              progress={status?.progress}
              daysAgo={null} // Don't show days ago in button (shown above)
              showDaysAgo={false}
              recommended={recommended}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
