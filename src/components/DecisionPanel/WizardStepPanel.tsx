'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { sanitizeContent } from '@/lib/sanitize';
import { UniversalModal } from '@/components/UniversalModal';

export type WizardStepSeverity = 'info' | 'warning' | 'error' | 'success';

export interface WizardStepAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  testId?: string;
}

export interface WizardStepPanelProps {
  title: string;
  description: string;
  severity?: WizardStepSeverity;
  icon: LucideIcon;
  count?: number;
  actions: WizardStepAction[];
  titleActions?: WizardStepAction[]; // Actions rendered in header (top-right)
  isProcessing?: boolean;
  customContent?: React.ReactNode;
  onClose?: () => void;
  visible?: boolean;
  testId?: string;
}

const SEVERITY_COLORS = {
  info: {
    text: 'text-cyan-300',
    iconBg: 'from-cyan-600/40 to-blue-500/40',
    iconColor: 'text-cyan-400',
  },
  warning: {
    text: 'text-yellow-300',
    iconBg: 'from-yellow-600/40 to-amber-500/40',
    iconColor: 'text-yellow-400',
  },
  error: {
    text: 'text-red-300',
    iconBg: 'from-red-600/40 to-rose-500/40',
    iconColor: 'text-red-400',
  },
  success: {
    text: 'text-green-300',
    iconBg: 'from-green-600/40 to-emerald-500/40',
    iconColor: 'text-green-400',
  },
};

export default function WizardStepPanel({
  title,
  description,
  severity = 'info',
  icon: Icon,
  count,
  actions,
  titleActions = [],
  isProcessing = false,
  customContent,
  onClose,
  visible = true,
  testId = 'wizard-step-panel',
}: WizardStepPanelProps) {
  const colors = SEVERITY_COLORS[severity];

  // Sanitize description to prevent XSS
  const sanitizedDescription = useMemo(() => sanitizeContent(description), [description]);

  // Combine all actions (main actions + title actions) for the header
  const allActions = useMemo(() => [...actions, ...titleActions], [actions, titleActions]);

  // Handle close - use onClose if provided, or find a secondary/reject action
  const handleClose = useMemo(() => {
    if (onClose) return onClose;
    const rejectAction = actions.find(a =>
      a.variant === 'secondary' ||
      a.label.toLowerCase().includes('reject') ||
      a.label.toLowerCase().includes('cancel') ||
      a.label.toLowerCase().includes('close')
    );
    return rejectAction?.onClick || (() => {});
  }, [onClose, actions]);

  if (!visible) {
    return null;
  }

  // Transform actions to headerActions format with processing state
  const headerActions = useMemo(() =>
    allActions.map((action) => ({
      icon: action.icon,
      label: action.label,
      onClick: action.onClick,
      variant: action.variant,
      disabled: action.disabled || isProcessing,
      loading: action.loading || (isProcessing && action.variant === 'primary'),
      testId: action.testId || `${testId}-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`,
    })),
    [allActions, isProcessing, testId]
  );

  return (
    <UniversalModal
      isOpen={visible}
      onClose={handleClose}
      title={title}
      subtitle={count !== undefined ? `${count} item${count !== 1 ? 's' : ''}` : undefined}
      icon={Icon}
      iconBgColor={colors.iconBg}
      iconColor={colors.iconColor}
      maxWidth="max-w-4xl"
      maxHeight="max-h-[85vh]"
      headerActions={headerActions}
    >
      <div data-testid={testId} className="relative">
        {/* Description - only show if no custom content (custom content includes its own description) */}
        {!customContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-sm ${colors.text} mb-4`}
            data-testid={`${testId}-description`}
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        )}

        {/* Custom content slot */}
        {customContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            data-testid={`${testId}-custom-content`}
          >
            {customContent}
          </motion.div>
        )}
      </div>
    </UniversalModal>
  );
}
