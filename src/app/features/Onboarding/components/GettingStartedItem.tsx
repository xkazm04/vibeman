'use client';

import OnboardingTaskItem from './OnboardingTaskItem';
import { OnboardingTask } from './OnboardingPanel';

interface GettingStartedItemProps {
  task: OnboardingTask;
  index: number;
  isNextTask: boolean;
  isFutureTask: boolean;
}

/**
 * GettingStartedItem Component
 *
 * Wrapper around OnboardingTaskItem with amber theme for OnboardingPanel.
 * This component is kept for backward compatibility.
 */
export default function GettingStartedItem({ task, index, isNextTask, isFutureTask }: GettingStartedItemProps) {
  return (
    <OnboardingTaskItem
      task={task}
      index={index}
      isNextTask={isNextTask}
      isFutureTask={isFutureTask}
      theme="amber"
      animationDelay={0.3}
    />
  );
}
