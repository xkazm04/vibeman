'use client';
import React from 'react';
import { Target } from 'lucide-react';
import { Goal } from '../../../../types';
import { UniversalModal } from '../../../../components/UniversalModal';
import GoalsAddModal from './components/GoalsAddModal';
import GoalsDetailModalContent from './components/GoalsDetailModalContent';

interface GoalModalProps {
  mode: 'add' | 'detail';
  isOpen: boolean;
  onClose: () => void;

  // Props for 'add' mode
  onSubmit?: (goal: Omit<Goal, 'id' | 'order' | 'projectId'>) => void;
  projectPath?: string;
  onRequirementCreated?: () => void;

  // Props for 'detail' mode
  goal?: Goal | null;
  onSave?: (goalId: string, updates: Partial<Goal>) => Promise<Goal | null>;
  projectId?: string | null;
}

/**
 * Unified GoalModal component that handles both 'add' and 'detail' modes
 *
 * - 'add' mode: Uses GoalsAddModal which includes Goal and Code tabs
 * - 'detail' mode: Uses GoalsDetailModalContent for viewing/editing goal details
 */
export default function GoalModal({
  mode,
  isOpen,
  onClose,
  onSubmit,
  projectPath,
  onRequirementCreated,
  goal,
  onSave,
  projectId
}: GoalModalProps) {
  const isAddMode = mode === 'add';
  const isDetailMode = mode === 'detail';

  // For 'add' mode, delegate to GoalsAddModal which has its own modal wrapper with tabs
  if (isAddMode && onSubmit) {
    return (
      <GoalsAddModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={onSubmit}
        projectPath={projectPath}
        onRequirementCreated={onRequirementCreated}
      />
    );
  }

  // For 'detail' mode, wrap GoalsDetailModalContent in UniversalModal
  if (isDetailMode && goal) {
    return (
      <UniversalModal
        isOpen={isOpen}
        onClose={onClose}
        title="Goal Details"
        subtitle="View goal information"
        icon={Target}
        iconBgColor="from-blue-600/20 to-slate-600/20"
        iconColor="text-blue-400"
        maxWidth="max-w-6xl"
      >
        <GoalsDetailModalContent
          goal={goal}
          projectId={projectId || null}
          onSave={onSave}
          onClose={onClose}
        />
      </UniversalModal>
    );
  }

  return null;
}
