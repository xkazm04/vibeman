/**
 * Onboarding Components
 *
 * Components for tracking and displaying Getting Started progress,
 * contextual next actions, and progress celebrations.
 */

// Progress visualization
export { default as ModuleProgressBar } from './ModuleProgressBar';
export { ModuleProgressDots, ModuleProgressRing } from './ModuleProgressBar';

// Next action guidance
export { default as NextActionBanner } from './NextActionBanner';
export { InlineNextAction, StepCompletionToast } from './NextActionBanner';

// Celebrations
export { default as ProgressCelebration } from './ProgressCelebration';
export { useProgressCelebration, MiniCelebration } from './ProgressCelebration';
