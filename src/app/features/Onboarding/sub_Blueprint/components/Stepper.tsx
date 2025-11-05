'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IlluminatedButton, { IlluminatedButtonProps } from './IlluminatedButton';
import { StepperConfig, TechniqueGroup, ScanTechnique } from '../lib/stepperConfig';
import { Check, X, ChevronRight } from 'lucide-react';

export interface StepData {
  groupId: string;
  techniqueId: string;
  label: string;
  description: string;
}

export interface StepperProps {
  config: StepperConfig;
  currentStepIndex: number;
  selectedScanId: string | null;
  onStepSelect: (groupId: string, techniqueId: string) => void;
  onNavigate?: (target: string) => void;
  getDaysAgo?: (techniqueId: string) => number | null;
  getScanStatus?: (techniqueId: string) => {
    isRunning: boolean;
    progress: number;
    hasError: boolean;
  };
  className?: string;
}

/**
 * Generic, toggle-able Stepper component
 *
 * Renders a multi-column wizard interface based on configuration.
 * Supports technique grouping, per-project-type filtering, and group enable/disable.
 */
export default function Stepper({
  config,
  currentStepIndex,
  selectedScanId,
  onStepSelect,
  onNavigate,
  getDaysAgo,
  getScanStatus,
  className = '',
}: StepperProps) {
  // Get enabled groups only
  const enabledGroups = config.groups.filter(group => group.enabled);

  // Render each group as a column
  return (
    <div
      className={`grid gap-10 z-10 ${className}`}
      style={{ gridTemplateColumns: `repeat(${enabledGroups.length}, minmax(0, 1fr))` }}
      data-testid="stepper-container"
    >
      {enabledGroups.map((group, groupIndex) => (
        <StepperColumn
          key={group.id}
          group={group}
          delay={0.4 + groupIndex * 0.1}
          selectedScanId={selectedScanId}
          onStepSelect={onStepSelect}
          onNavigate={onNavigate}
          getDaysAgo={getDaysAgo}
          getScanStatus={getScanStatus}
        />
      ))}
    </div>
  );
}

interface StepperColumnProps {
  group: TechniqueGroup;
  delay: number;
  selectedScanId: string | null;
  onStepSelect: (groupId: string, techniqueId: string) => void;
  onNavigate?: (target: string) => void;
  getDaysAgo?: (techniqueId: string) => number | null;
  getScanStatus?: (techniqueId: string) => {
    isRunning: boolean;
    progress: number;
    hasError: boolean;
  };
}

/**
 * Stepper column - represents a technique group
 */
function StepperColumn({
  group,
  delay,
  selectedScanId,
  onStepSelect,
  onNavigate,
  getDaysAgo,
  getScanStatus,
}: StepperColumnProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: delay < 0.6 ? -20 : delay < 0.7 ? -10 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="relative"
      data-testid={`stepper-column-${group.id}`}
    >
      {/* Column header */}
      <div className="mb-12">
        <div
          className={`h-px bg-gradient-to-r ${
            group.gradientVia
              ? `${group.gradientFrom} via-${group.gradientVia}`
              : group.gradientFrom
          } to-transparent mb-2`}
        />
        <h2 className={`text-${group.color}-300 text-sm font-mono tracking-wider uppercase`}>
          {group.name}
        </h2>
        <p className="text-xs text-gray-500 mt-1">{group.description}</p>
      </div>

      {/* Technique buttons */}
      <div className="flex flex-col gap-16">
        {group.techniques.map((technique, index) => {
          const status = getScanStatus?.(technique.id);
          const daysAgo = getDaysAgo?.(technique.id);

          return (
            <motion.div
              key={technique.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.1 + index * 0.1 }}
            >
              <IlluminatedButton
                label={technique.label}
                icon={technique.icon}
                onClick={() => onStepSelect(group.id, technique.id)}
                color={technique.color}
                size="md"
                disabled={false}
                selected={technique.id === selectedScanId}
                hasError={status?.hasError}
                scanning={status?.isRunning}
                progress={status?.progress}
                daysAgo={daysAgo}
                showDaysAgo={true}
                redirectMode={false}
                showProgress={false}
                progressText=""
              />
            </motion.div>
          );
        })}
      </div>

      {/* Decorative circuit line */}
      <div
        className={`absolute -right-8 top-1/2 w-16 h-px bg-gradient-to-r from-${group.color}-500/30 to-transparent`}
      />
    </motion.div>
  );
}

/**
 * Stepper Progress Indicator
 *
 * Shows overall progress through the wizard steps
 */
export interface StepperProgressProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  className?: string;
}

export function StepperProgress({
  currentStep,
  totalSteps,
  completedSteps,
  className = '',
}: StepperProgressProps) {
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      data-testid="stepper-progress"
    >
      {Array.from({ length: totalSteps }, (_, i) => {
        const isCompleted = completedSteps.includes(i);
        const isCurrent = i === currentStep;
        const isPast = i < currentStep;

        return (
          <React.Fragment key={i}>
            {/* Step indicator */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`
                relative w-8 h-8 rounded-full flex items-center justify-center
                border-2 transition-all duration-300
                ${
                  isCompleted
                    ? 'bg-green-500/20 border-green-400'
                    : isCurrent
                    ? 'bg-cyan-500/20 border-cyan-400'
                    : isPast
                    ? 'bg-gray-700/20 border-gray-600'
                    : 'bg-gray-800/20 border-gray-700'
                }
              `}
              data-testid={`stepper-progress-step-${i}`}
            >
              {isCompleted ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <span className={`text-xs font-mono ${isCurrent ? 'text-cyan-300' : 'text-gray-500'}`}>
                  {i + 1}
                </span>
              )}

              {/* Pulse effect for current step */}
              {isCurrent && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-cyan-400"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </motion.div>

            {/* Connector line */}
            {i < totalSteps - 1 && (
              <div
                className={`
                  h-0.5 w-8 transition-all duration-300
                  ${isPast || isCompleted ? 'bg-cyan-500/40' : 'bg-gray-700/40'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Stepper Group Toggle
 *
 * UI control for enabling/disabling technique groups
 */
export interface StepperGroupToggleProps {
  groups: TechniqueGroup[];
  onToggle: (groupId: string, enabled: boolean) => void;
  className?: string;
}

export function StepperGroupToggle({
  groups,
  onToggle,
  className = '',
}: StepperGroupToggleProps) {
  return (
    <div
      className={`space-y-2 ${className}`}
      data-testid="stepper-group-toggle"
    >
      <h3 className="text-sm font-mono text-gray-400 uppercase tracking-wider mb-3">
        Technique Groups
      </h3>
      {groups.map((group) => (
        <motion.label
          key={group.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
            ${
              group.enabled
                ? `border-${group.color}-500/50 bg-${group.color}-500/10 hover:bg-${group.color}-500/20`
                : 'border-gray-700/50 bg-gray-800/20 hover:bg-gray-700/30'
            }
          `}
          data-testid={`stepper-group-toggle-${group.id}`}
        >
          <input
            type="checkbox"
            checked={group.enabled}
            onChange={(e) => onToggle(group.id, e.target.checked)}
            className="w-4 h-4 rounded accent-cyan-500"
            data-testid={`stepper-group-checkbox-${group.id}`}
          />
          <div className="flex-1">
            <div className={`text-sm font-medium ${group.enabled ? `text-${group.color}-300` : 'text-gray-500'}`}>
              {group.name}
            </div>
            <div className="text-xs text-gray-500">{group.description}</div>
          </div>
          <div className="text-xs font-mono text-gray-600">
            {group.techniques.length} {group.techniques.length === 1 ? 'scan' : 'scans'}
          </div>
        </motion.label>
      ))}
    </div>
  );
}
