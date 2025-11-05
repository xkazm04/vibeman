'use client';

import React from 'react';
import { Check, X, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useDecisionQueueStore } from '@/stores/decisionQueueStore';
import { useBadgeStore } from '@/stores/badgeStore';
import WizardStepPanel, { WizardStepAction, WizardStepSeverity } from '@/app/components/ui/WizardStepPanel';

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
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
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

  // Build action buttons based on decision type
  const actions: WizardStepAction[] = isNotification
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

  return (
    <WizardStepPanel
      title={currentDecision.title}
      description={currentDecision.description}
      severity={severity}
      icon={Icon}
      count={currentDecision.count}
      actions={actions}
      isProcessing={isProcessing}
      visible={true}
      testId="decision-panel"
    />
  );
}
