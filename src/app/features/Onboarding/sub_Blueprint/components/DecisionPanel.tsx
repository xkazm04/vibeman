'use client';

import React from 'react';
import { Check, X, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { useBadgeStore } from '@/stores/badgeStore';
import WizardStepPanel, { WizardStepAction, WizardStepSeverity } from '@/components/DecisionPanel/WizardStepPanel';

// Map decision types to badge IDs
const DECISION_BADGE_MAP: Record<string, string> = {
  'structure-scan': 'structure-strategist',
  'build-fix': 'build-scanner',
  'context-scan': 'context-curator',
  'build-scan': 'build-scanner',
  'photo-scan': 'visual-architect',
  'vision-scan': 'vision-keeper',
  'architecture-scan': 'architecture-explorer',
  'dependency-scan': 'dependency-detective',
  'documentation-scan': 'documentation-master',
  'snapshot-scan': 'snapshot-specialist',
  'goal-scan': 'goal-setter',
  'unused-scan-selection': 'code-cleaner',
  'unused-scan-result': 'code-cleaner',
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: Check,
};

export default function DecisionPanel() {
  const { currentDecision, isProcessing, acceptDecision, rejectDecision } = useDecisionQueueStore();
  const awardBadge = useBadgeStore((state) => state.awardBadge);

  // Enhanced accept handler that awards badges
  const handleAccept = async () => {
    if (!currentDecision) return;

    // Award badge based on decision type
    const badgeId = DECISION_BADGE_MAP[currentDecision.type];
    if (badgeId) {
      awardBadge(badgeId);
    }

    // Call original accept logic
    await acceptDecision();
  };

  if (!currentDecision) {
    return null;
  }

  const severity: WizardStepSeverity = (currentDecision.severity as WizardStepSeverity) || 'info';
  const Icon = SEVERITY_ICONS[severity];

  // Check if this is a notification-only decision (no accept action needed)
  const isNotification = currentDecision.type.includes('error') ||
    currentDecision.type.includes('notification') ||
    currentDecision.type.includes('abort');

  // Check if this decision has custom content (e.g., file selection)
  // If so, don't show default action buttons - let custom content handle it
  const hasCustomContent = !!currentDecision.customContent;

  // Build action buttons based on decision type
  const actions: WizardStepAction[] = hasCustomContent
    ? [] // Custom content provides its own actions
    : isNotification
      ? [
        {
          label: 'Close',
          icon: X,
          onClick: rejectDecision,
          variant: 'success',
          disabled: isProcessing,
          testId: 'decision-close-btn',
        },
      ]
      : [
        {
          label: 'Reject',
          icon: X,
          onClick: rejectDecision,
          variant: 'secondary',
          disabled: isProcessing,
          testId: 'decision-reject-btn',
        },
        {
          label: 'Accept',
          icon: Check,
          onClick: handleAccept,
          variant: 'primary',
          disabled: isProcessing,
          testId: 'decision-accept-btn',
        },
      ];

  // Enhance titleActions to wire up decision queue
  const enhancedTitleActions = currentDecision.titleActions?.map(action => ({
    ...action,
    onClick: async () => {
      try {
        // Call the original onClick handler
        await action.onClick();

        // Automatically trigger decision queue based on action type
        if (action.variant === 'primary') {
          // Primary actions (like "Create Requirements") should accept the decision
          await handleAccept();
        } else if (action.variant === 'secondary' && (action.label.toLowerCase().includes('cancel') || action.label.toLowerCase().includes('reject'))) {
          // Secondary cancel/reject actions should reject the decision
          await rejectDecision();
        }
      } catch (error) {
        // If onClick throws an error, don't close the decision
        // Error is already logged/displayed by the handler
        console.error('[DecisionPanel] Action failed:', error);
      }
    },
  }));

  return (
    <WizardStepPanel
      title={currentDecision.title}
      description={currentDecision.description}
      severity={severity}
      icon={Icon}
      count={currentDecision.count}
      actions={actions}
      titleActions={enhancedTitleActions}
      isProcessing={isProcessing}
      visible={true}
      customContent={currentDecision.customContent}
      testId="decision-panel"
    />
  );
}
