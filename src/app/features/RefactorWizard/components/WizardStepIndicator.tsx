'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, LucideIcon } from 'lucide-react';

export interface WizardStep {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface WizardStepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps?: number[];
  onStepClick?: (stepIndex: number) => void;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * WizardStepIndicator - Shows progress through a multi-step wizard
 *
 * Features:
 * - Horizontal or vertical layout
 * - Animated transitions
 * - Clickable steps (when enabled)
 * - Step icons and descriptions
 */
export function WizardStepIndicator({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
  variant = 'horizontal',
  className = '',
}: WizardStepIndicatorProps) {
  const isStepCompleted = (index: number) =>
    completedSteps.includes(index) || index < currentStep;

  const isStepCurrent = (index: number) => index === currentStep;

  const isStepClickable = (index: number) =>
    onStepClick && (isStepCompleted(index) || index === currentStep);

  if (variant === 'vertical') {
    return (
      <div className={`space-y-2 ${className}`}>
        {steps.map((step, index) => {
          const completed = isStepCompleted(index);
          const current = isStepCurrent(index);
          const clickable = isStepClickable(index);
          const Icon = step.icon;

          return (
            <motion.button
              key={step.id}
              onClick={() => clickable && onStepClick?.(index)}
              disabled={!clickable}
              className={`
                w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all
                ${current ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-gray-800/30 border border-transparent'}
                ${clickable ? 'cursor-pointer hover:bg-gray-700/50' : 'cursor-default'}
              `}
              whileHover={clickable ? { x: 4 } : undefined}
              whileTap={clickable ? { scale: 0.98 } : undefined}
            >
              {/* Step number/check */}
              <div
                className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${completed ? 'bg-green-500 text-white' : current ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}
                `}
              >
                {completed ? <Check className="w-4 h-4" /> : Icon ? <Icon className="w-4 h-4" /> : index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <span className={`block text-sm font-medium ${current ? 'text-blue-300' : completed ? 'text-green-300' : 'text-gray-400'}`}>
                  {step.label}
                </span>
                {step.description && (
                  <span className="block text-xs text-gray-500 mt-0.5">{step.description}</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => {
        const completed = isStepCompleted(index);
        const current = isStepCurrent(index);
        const clickable = isStepClickable(index);
        const isLast = index === steps.length - 1;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            <motion.button
              onClick={() => clickable && onStepClick?.(index)}
              disabled={!clickable}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg transition-all
                ${current ? 'bg-blue-500/10' : 'bg-transparent'}
                ${clickable ? 'cursor-pointer hover:bg-gray-700/50' : 'cursor-default'}
              `}
              whileHover={clickable ? { scale: 1.02 } : undefined}
              whileTap={clickable ? { scale: 0.98 } : undefined}
            >
              {/* Step indicator */}
              <div
                className={`
                  flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                  ${completed ? 'bg-green-500 text-white' : current ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}
                `}
              >
                {completed ? <Check className="w-3.5 h-3.5" /> : Icon ? <Icon className="w-3.5 h-3.5" /> : index + 1}
              </div>

              {/* Label */}
              <span className={`text-sm font-medium ${current ? 'text-blue-300' : completed ? 'text-green-300' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </motion.button>

            {/* Connector */}
            {!isLast && (
              <div className="flex-shrink-0 mx-2">
                <ChevronRight className={`w-4 h-4 ${completed ? 'text-green-500' : 'text-gray-600'}`} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Compact progress dots for minimal space
 */
export function WizardProgressDots({
  total,
  current,
  className = '',
}: {
  total: number;
  current: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {Array.from({ length: total }).map((_, index) => (
        <motion.div
          key={index}
          className={`
            rounded-full transition-all
            ${index < current ? 'bg-green-400' : index === current ? 'bg-blue-400' : 'bg-gray-600'}
            ${index === current ? 'w-6 h-2' : 'w-2 h-2'}
          `}
          animate={index === current ? { scale: [1, 1.1, 1] } : undefined}
          transition={index === current ? { duration: 1.5, repeat: Infinity } : undefined}
        />
      ))}
    </div>
  );
}

export default WizardStepIndicator;
