'use client';

import { useOnboardingStore } from '@/stores/onboardingStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import Drawer from '@/components/ui/Drawer';
import StarterTasks from '../sub_GettingStarted/components/StarterTasks';
import StarterBlueprint from '../sub_GettingStarted/components/StarterBlueprint';
import { buildTasks } from '../sub_GettingStarted/lib/config';
import type { OnboardingTask } from '../sub_GettingStarted/lib/types';

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBlueprint: () => void;
}

/**
 * Getting Started Control Panel
 * Displays onboarding tasks and Blueprint access
 * Now project-specific: shows progress for the active project
 */
export default function ControlPanel({ isOpen, onClose, onOpenBlueprint }: ControlPanelProps) {
  const { isStepCompleted, setActiveModule, closeControlPanel } = useOnboardingStore();
  const { activeProject } = useActiveProjectStore();

  // Build tasks from store - now project-specific
  // Wrapper to handle type conversion from string to OnboardingStep
  const tasks = buildTasks((stepId: string) => isStepCompleted(stepId as any, activeProject?.id));

  const handleTaskClick = (task: OnboardingTask) => {
    setActiveModule(task.location);
    closeControlPanel();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={() => {
        onClose();
        closeControlPanel();
      }}
      side="left"
      maxWidth="max-w-md"
      backgroundImage="/patterns/bg_blueprint.jpg"
      transparentOverlay={true}
    >
      <StarterTasks
        tasks={tasks}
        onTaskClick={handleTaskClick}
      />

      <StarterBlueprint
        onOpenBlueprint={onOpenBlueprint}
      />
    </Drawer>
  );
}
