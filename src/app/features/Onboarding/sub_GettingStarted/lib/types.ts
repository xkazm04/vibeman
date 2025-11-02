/**
 * Getting Started types and interfaces
 */

export type ModuleLocation = 'coder' | 'ideas' | 'tinder' | 'tasker' | 'reflector' | 'contexts' | 'docs';

export interface OnboardingTask {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  location: ModuleLocation;
}

export interface StarterBlueprintProps {
  onOpenBlueprint: () => void;
}

export interface StarterTasksProps {
  tasks: OnboardingTask[];
  onTaskClick: (task: OnboardingTask) => void;
}
