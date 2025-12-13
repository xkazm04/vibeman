/**
 * ROI Simulator Feature Types
 * Local type definitions for the ROI Simulator feature
 */

export type {
  DbRefactoringEconomics,
  DbROISimulation,
  DbPortfolioOptimization,
  DbVelocityPrediction,
  DbDebtPaydownStrategy,
  ROISimulatorSummary,
  RefactoringCategory,
  RefactoringWithROI,
} from '@/app/db';

export const REFACTORING_CATEGORIES = [
  { value: 'performance', label: 'Performance', color: 'emerald' },
  { value: 'security', label: 'Security', color: 'red' },
  { value: 'maintainability', label: 'Maintainability', color: 'blue' },
  { value: 'scalability', label: 'Scalability', color: 'purple' },
  { value: 'code_quality', label: 'Code Quality', color: 'amber' },
  { value: 'architecture', label: 'Architecture', color: 'cyan' },
  { value: 'testing', label: 'Testing', color: 'green' },
  { value: 'documentation', label: 'Documentation', color: 'gray' },
  { value: 'dependency', label: 'Dependencies', color: 'orange' },
  { value: 'infrastructure', label: 'Infrastructure', color: 'indigo' },
] as const;

export const ROI_CATEGORY_COLORS = {
  excellent: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  good: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
  marginal: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  poor: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
  negative: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
} as const;

export const URGENCY_COLORS = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  low: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
} as const;

export const STATUS_COLORS = {
  proposed: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' },
  approved: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  in_progress: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
  deferred: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
} as const;

export const SIMULATION_TYPE_LABELS: Record<string, string> = {
  baseline: 'Baseline',
  aggressive: 'Aggressive',
  conservative: 'Conservative',
  custom: 'Custom',
  optimal: 'Optimal',
};

export const OPTIMIZATION_TYPE_LABELS: Record<string, string> = {
  max_roi: 'Maximum ROI',
  max_velocity: 'Maximum Velocity',
  min_risk: 'Minimum Risk',
  balanced: 'Balanced',
  pareto: 'Pareto Optimal',
};

export const STRATEGY_TYPE_LABELS: Record<string, string> = {
  snowball: 'Snowball (Quick Wins)',
  avalanche: 'Avalanche (High Impact)',
  highest_roi: 'Highest ROI First',
  highest_risk: 'Highest Risk First',
  balanced: 'Balanced',
  custom: 'Custom',
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function formatHours(hours: number): string {
  if (hours < 8) return `${hours.toFixed(1)}h`;
  if (hours < 40) return `${(hours / 8).toFixed(1)} days`;
  if (hours < 160) return `${(hours / 40).toFixed(1)} weeks`;
  return `${(hours / 160).toFixed(1)} months`;
}
