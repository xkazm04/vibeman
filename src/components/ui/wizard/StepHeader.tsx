'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Badge from './Badge';

interface StepHeaderProps {
  /** Step title */
  title?: string;
  /** Step description */
  description?: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Current step number */
  currentStep?: number;
  /** Total number of steps */
  totalSteps?: number;
  /** Test ID for automated testing */
  'data-testid'?: string;
}

/**
 * StepHeader - Header section for step containers
 *
 * Displays the step title, optional icon, description, and progress badge
 * with consistent styling and smooth animations.
 */
export function StepHeader({
  title,
  description,
  icon: Icon,
  currentStep,
  totalSteps,
  'data-testid': testId = 'step-header',
}: StepHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex items-start justify-between gap-4"
      data-testid={testId}
    >
      {/* Title and Description */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          {/* Icon */}
          {Icon && (
            <div
              className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30"
              data-testid={`${testId}-icon`}
            >
              <Icon className="w-5 h-5 text-cyan-400" />
            </div>
          )}

          {/* Title */}
          {title && (
            <h3
              className="text-xl font-light text-white tracking-wide"
              data-testid={`${testId}-title`}
            >
              {title}
            </h3>
          )}
        </div>

        {/* Description */}
        {description && (
          <p
            className="text-gray-400 text-sm leading-relaxed ml-[52px]"
            data-testid={`${testId}-description`}
          >
            {description}
          </p>
        )}
      </div>

      {/* Progress Badge */}
      {currentStep !== undefined && totalSteps !== undefined && (
        <div data-testid={`${testId}-progress`}>
          <Badge variant="info" size="md">
            <span className="font-mono text-xs">
              {currentStep} / {totalSteps}
            </span>
          </Badge>
        </div>
      )}
    </motion.div>
  );
}
