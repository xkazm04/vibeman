'use client';

import { useOnboardingStore } from '@/stores/onboardingStore';
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
 */
export default function ControlPanel({ isOpen, onClose, onOpenBlueprint }: ControlPanelProps) {
  const { isStepCompleted, setActiveModule, closeControlPanel } = useOnboardingStore();

  // Build tasks from store
  const tasks = buildTasks(isStepCompleted);

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
