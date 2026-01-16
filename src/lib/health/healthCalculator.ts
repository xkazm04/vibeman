/**
 * Health Calculator Library
 * Computes project health scores across multiple dimensions
 * and generates actionable recommendations
 */

import type { HealthScoreCategory, CategoryScores, HealthScoreStatus } from '@/app/db/models/project-health.types';

// Action item effort levels
export type EffortLevel = 'quick' | 'medium' | 'significant';

// Action item impact levels
export type ImpactLevel = 'high' | 'medium' | 'low';

// Action item status
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

// Setup dimension for tracking
export interface SetupDimension {
  id: string;
  name: string;
  description: string;
  category: HealthScoreCategory | 'setup';
  weight: number;
  currentValue: number;
  maxValue: number;
  completionPercentage: number;
  status: 'complete' | 'partial' | 'incomplete';
}

// Action item definition
export interface ActionItem {
  id: string;
  title: string;
  description: string;
  category: HealthScoreCategory | 'setup';
  effort: EffortLevel;
  impact: ImpactLevel;
  priority: number; // 1-10, higher = more urgent
  status: ActionStatus;
  quickFixAvailable: boolean;
  quickFixId?: string;
  estimatedScoreGain: number;
  relatedDimension?: string;
  prerequisiteActions?: string[];
  completedAt?: string;
}

// Achievement definition
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'setup' | 'milestone' | 'streak' | 'special';
  requirement: string;
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
  rewardPoints?: number;
}

// Health dashboard data
export interface HealthDashboardData {
  overallScore: number;
  status: HealthScoreStatus;
  dimensions: SetupDimension[];
  actionItems: ActionItem[];
  achievements: Achievement[];
  completedActionsCount: number;
  totalActionsCount: number;
  streakDays: number;
  lastActivityDate: string | null;
}

// Category display configuration
export const CATEGORY_CONFIG: Record<HealthScoreCategory | 'setup', {
  name: string;
  icon: string;
  color: string;
  description: string;
}> = {
  idea_backlog: {
    name: 'Idea Backlog',
    icon: 'Lightbulb',
    color: 'amber',
    description: 'Managing and implementing feature ideas',
  },
  tech_debt: {
    name: 'Technical Debt',
    icon: 'Wrench',
    color: 'orange',
    description: 'Code quality and maintenance issues',
  },
  security: {
    name: 'Security',
    icon: 'Shield',
    color: 'red',
    description: 'Security vulnerabilities and patches',
  },
  test_coverage: {
    name: 'Test Coverage',
    icon: 'TestTube2',
    color: 'green',
    description: 'Automated test coverage and quality',
  },
  goal_completion: {
    name: 'Goal Progress',
    icon: 'Target',
    color: 'blue',
    description: 'Project goal achievement rate',
  },
  code_quality: {
    name: 'Code Quality',
    icon: 'Code2',
    color: 'purple',
    description: 'Overall codebase quality metrics',
  },
  setup: {
    name: 'Project Setup',
    icon: 'Settings',
    color: 'cyan',
    description: 'Initial project configuration',
  },
};

/**
 * Calculate setup dimensions from project data
 */
export function calculateSetupDimensions(
  hasBlueprint: boolean,
  contextsCount: number,
  goalsCount: number,
  ideasCount: number,
  scansCompleted: number,
  hasApiKeys: boolean
): SetupDimension[] {
  const dimensions: SetupDimension[] = [
    {
      id: 'blueprint',
      name: 'Blueprint Scan',
      description: 'Run the initial project analysis',
      category: 'setup',
      weight: 0.25,
      currentValue: hasBlueprint ? 1 : 0,
      maxValue: 1,
      completionPercentage: hasBlueprint ? 100 : 0,
      status: hasBlueprint ? 'complete' : 'incomplete',
    },
    {
      id: 'contexts',
      name: 'Context Organization',
      description: 'Organize code into meaningful contexts',
      category: 'setup',
      weight: 0.20,
      currentValue: Math.min(contextsCount, 5),
      maxValue: 5,
      completionPercentage: Math.min(100, (contextsCount / 5) * 100),
      status: contextsCount >= 5 ? 'complete' : contextsCount > 0 ? 'partial' : 'incomplete',
    },
    {
      id: 'goals',
      name: 'Project Goals',
      description: 'Define development objectives',
      category: 'goal_completion',
      weight: 0.20,
      currentValue: Math.min(goalsCount, 3),
      maxValue: 3,
      completionPercentage: Math.min(100, (goalsCount / 3) * 100),
      status: goalsCount >= 3 ? 'complete' : goalsCount > 0 ? 'partial' : 'incomplete',
    },
    {
      id: 'ideas',
      name: 'Idea Generation',
      description: 'Generate feature and improvement ideas',
      category: 'idea_backlog',
      weight: 0.15,
      currentValue: Math.min(ideasCount, 10),
      maxValue: 10,
      completionPercentage: Math.min(100, (ideasCount / 10) * 100),
      status: ideasCount >= 10 ? 'complete' : ideasCount > 0 ? 'partial' : 'incomplete',
    },
    {
      id: 'scans',
      name: 'Quality Scans',
      description: 'Run tech debt and security scans',
      category: 'tech_debt',
      weight: 0.10,
      currentValue: Math.min(scansCompleted, 3),
      maxValue: 3,
      completionPercentage: Math.min(100, (scansCompleted / 3) * 100),
      status: scansCompleted >= 3 ? 'complete' : scansCompleted > 0 ? 'partial' : 'incomplete',
    },
    {
      id: 'api_keys',
      name: 'API Configuration',
      description: 'Configure LLM provider API keys',
      category: 'setup',
      weight: 0.10,
      currentValue: hasApiKeys ? 1 : 0,
      maxValue: 1,
      completionPercentage: hasApiKeys ? 100 : 0,
      status: hasApiKeys ? 'complete' : 'incomplete',
    },
  ];

  return dimensions;
}

/**
 * Generate action items based on health scores and setup status
 */
export function generateActionItems(
  categoryScores: CategoryScores,
  dimensions: SetupDimension[],
  existingActions: ActionItem[] = []
): ActionItem[] {
  const actions: ActionItem[] = [];
  const existingIds = new Set(existingActions.map(a => a.id));

  // Setup-related actions from incomplete dimensions
  for (const dim of dimensions) {
    if (dim.status !== 'complete') {
      const actionId = `setup_${dim.id}`;
      if (!existingIds.has(actionId)) {
        actions.push({
          id: actionId,
          title: `Complete ${dim.name}`,
          description: dim.description,
          category: dim.category,
          effort: dim.id === 'blueprint' ? 'quick' : 'medium',
          impact: 'high',
          priority: dim.status === 'incomplete' ? 9 : 6,
          status: 'pending',
          quickFixAvailable: ['blueprint', 'api_keys'].includes(dim.id),
          quickFixId: dim.id === 'blueprint' ? 'run_blueprint' : dim.id === 'api_keys' ? 'configure_api' : undefined,
          estimatedScoreGain: Math.round(dim.weight * 20),
          relatedDimension: dim.id,
        });
      }
    }
  }

  // Category-specific actions based on scores
  const categoryActions = generateCategoryActions(categoryScores);
  for (const action of categoryActions) {
    if (!existingIds.has(action.id)) {
      actions.push(action);
    }
  }

  // Sort by priority (descending) then by impact
  return actions.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return impactOrder[b.impact] - impactOrder[a.impact];
  });
}

/**
 * Generate category-specific actions
 */
function generateCategoryActions(categoryScores: CategoryScores): ActionItem[] {
  const actions: ActionItem[] = [];

  // Idea backlog actions
  if (categoryScores.idea_backlog.score < 70) {
    if (categoryScores.idea_backlog.issues_count && categoryScores.idea_backlog.issues_count > 20) {
      actions.push({
        id: 'review_pending_ideas',
        title: 'Review Pending Ideas',
        description: `You have ${categoryScores.idea_backlog.issues_count} pending ideas. Review and prioritize them to improve flow.`,
        category: 'idea_backlog',
        effort: 'medium',
        impact: 'medium',
        priority: 5,
        status: 'pending',
        quickFixAvailable: true,
        quickFixId: 'open_ideas_tinder',
        estimatedScoreGain: 10,
      });
    }
    actions.push({
      id: 'implement_top_idea',
      title: 'Implement Top-Rated Idea',
      description: 'Pick and implement the highest-rated accepted idea to show progress.',
      category: 'idea_backlog',
      effort: 'significant',
      impact: 'high',
      priority: 4,
      status: 'pending',
      quickFixAvailable: false,
      estimatedScoreGain: 15,
    });
  }

  // Tech debt actions
  if (categoryScores.tech_debt.score < 70) {
    actions.push({
      id: 'run_tech_debt_scan',
      title: 'Run Tech Debt Scan',
      description: 'Scan the codebase to identify and prioritize technical debt items.',
      category: 'tech_debt',
      effort: 'quick',
      impact: 'medium',
      priority: 7,
      status: 'pending',
      quickFixAvailable: true,
      quickFixId: 'run_tech_debt_scan',
      estimatedScoreGain: 5,
    });
    if (categoryScores.tech_debt.issues_count && categoryScores.tech_debt.issues_count > 0) {
      actions.push({
        id: 'resolve_critical_debt',
        title: 'Resolve Critical Tech Debt',
        description: 'Address the most critical technical debt items first.',
        category: 'tech_debt',
        effort: 'significant',
        impact: 'high',
        priority: 8,
        status: 'pending',
        quickFixAvailable: false,
        estimatedScoreGain: 20,
      });
    }
  }

  // Security actions
  if (categoryScores.security.score < 85) {
    actions.push({
      id: 'run_security_scan',
      title: 'Run Security Scan',
      description: 'Scan for security vulnerabilities in dependencies and code.',
      category: 'security',
      effort: 'quick',
      impact: 'high',
      priority: 9,
      status: 'pending',
      quickFixAvailable: true,
      quickFixId: 'run_security_scan',
      estimatedScoreGain: 10,
    });
    if (categoryScores.security.issues_count && categoryScores.security.issues_count > 0) {
      actions.push({
        id: 'apply_security_patches',
        title: 'Apply Security Patches',
        description: `Apply ${categoryScores.security.issues_count} pending security patches.`,
        category: 'security',
        effort: 'medium',
        impact: 'high',
        priority: 10,
        status: 'pending',
        quickFixAvailable: true,
        quickFixId: 'apply_patches',
        estimatedScoreGain: 25,
      });
    }
  }

  // Test coverage actions
  if (categoryScores.test_coverage.score < 70) {
    actions.push({
      id: 'generate_test_scenarios',
      title: 'Generate Test Scenarios',
      description: 'Use AI to generate test scenarios for critical code paths.',
      category: 'test_coverage',
      effort: 'quick',
      impact: 'medium',
      priority: 5,
      status: 'pending',
      quickFixAvailable: true,
      quickFixId: 'generate_tests',
      estimatedScoreGain: 10,
    });
    actions.push({
      id: 'implement_critical_tests',
      title: 'Implement Critical Tests',
      description: 'Write tests for the most critical functionality first.',
      category: 'test_coverage',
      effort: 'significant',
      impact: 'high',
      priority: 4,
      status: 'pending',
      quickFixAvailable: false,
      estimatedScoreGain: 15,
    });
  }

  // Goal completion actions
  if (categoryScores.goal_completion.score < 70) {
    actions.push({
      id: 'define_smart_goals',
      title: 'Define SMART Goals',
      description: 'Create specific, measurable, achievable goals for the project.',
      category: 'goal_completion',
      effort: 'medium',
      impact: 'high',
      priority: 6,
      status: 'pending',
      quickFixAvailable: false,
      estimatedScoreGain: 10,
    });
    actions.push({
      id: 'complete_next_goal',
      title: 'Complete Next Goal',
      description: 'Focus on completing the next achievable goal.',
      category: 'goal_completion',
      effort: 'significant',
      impact: 'high',
      priority: 5,
      status: 'pending',
      quickFixAvailable: false,
      estimatedScoreGain: 20,
    });
  }

  // Code quality actions
  if (categoryScores.code_quality.score < 70) {
    actions.push({
      id: 'run_refactor_analysis',
      title: 'Run Refactor Analysis',
      description: 'Analyze the codebase for refactoring opportunities.',
      category: 'code_quality',
      effort: 'quick',
      impact: 'medium',
      priority: 5,
      status: 'pending',
      quickFixAvailable: true,
      quickFixId: 'run_refactor_wizard',
      estimatedScoreGain: 10,
    });
  }

  return actions;
}

/**
 * Generate achievements based on project state
 */
export function generateAchievements(
  overallScore: number,
  dimensions: SetupDimension[],
  completedActions: number,
  streakDays: number
): Achievement[] {
  const achievements: Achievement[] = [];

  // Setup achievements
  const completedDimensions = dimensions.filter(d => d.status === 'complete').length;
  achievements.push({
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first setup dimension',
    icon: 'Footprints',
    category: 'setup',
    requirement: 'Complete 1 setup dimension',
    progress: Math.min(1, completedDimensions),
    maxProgress: 1,
    unlockedAt: completedDimensions >= 1 ? new Date().toISOString() : undefined,
    rewardPoints: 10,
  });

  achievements.push({
    id: 'half_way_there',
    name: 'Halfway There',
    description: 'Complete half of the setup dimensions',
    icon: 'Flag',
    category: 'setup',
    requirement: 'Complete 3 setup dimensions',
    progress: Math.min(3, completedDimensions),
    maxProgress: 3,
    unlockedAt: completedDimensions >= 3 ? new Date().toISOString() : undefined,
    rewardPoints: 25,
  });

  achievements.push({
    id: 'fully_configured',
    name: 'Fully Configured',
    description: 'Complete all setup dimensions',
    icon: 'CheckCircle2',
    category: 'setup',
    requirement: 'Complete all 6 setup dimensions',
    progress: completedDimensions,
    maxProgress: 6,
    unlockedAt: completedDimensions >= 6 ? new Date().toISOString() : undefined,
    rewardPoints: 50,
  });

  // Score milestones
  achievements.push({
    id: 'score_50',
    name: 'Getting Healthy',
    description: 'Reach a health score of 50',
    icon: 'Heart',
    category: 'milestone',
    requirement: 'Reach 50 health score',
    progress: Math.min(50, overallScore),
    maxProgress: 50,
    unlockedAt: overallScore >= 50 ? new Date().toISOString() : undefined,
    rewardPoints: 20,
  });

  achievements.push({
    id: 'score_70',
    name: 'Good Health',
    description: 'Reach a health score of 70',
    icon: 'HeartPulse',
    category: 'milestone',
    requirement: 'Reach 70 health score',
    progress: Math.min(70, overallScore),
    maxProgress: 70,
    unlockedAt: overallScore >= 70 ? new Date().toISOString() : undefined,
    rewardPoints: 35,
  });

  achievements.push({
    id: 'score_85',
    name: 'Excellent Health',
    description: 'Reach a health score of 85',
    icon: 'Sparkles',
    category: 'milestone',
    requirement: 'Reach 85 health score',
    progress: Math.min(85, overallScore),
    maxProgress: 85,
    unlockedAt: overallScore >= 85 ? new Date().toISOString() : undefined,
    rewardPoints: 50,
  });

  // Action achievements
  achievements.push({
    id: 'action_hero',
    name: 'Action Hero',
    description: 'Complete 5 action items',
    icon: 'Zap',
    category: 'milestone',
    requirement: 'Complete 5 actions',
    progress: Math.min(5, completedActions),
    maxProgress: 5,
    unlockedAt: completedActions >= 5 ? new Date().toISOString() : undefined,
    rewardPoints: 30,
  });

  achievements.push({
    id: 'action_master',
    name: 'Action Master',
    description: 'Complete 15 action items',
    icon: 'Trophy',
    category: 'milestone',
    requirement: 'Complete 15 actions',
    progress: Math.min(15, completedActions),
    maxProgress: 15,
    unlockedAt: completedActions >= 15 ? new Date().toISOString() : undefined,
    rewardPoints: 75,
  });

  // Streak achievements
  achievements.push({
    id: 'streak_3',
    name: 'On a Roll',
    description: 'Maintain a 3-day activity streak',
    icon: 'Flame',
    category: 'streak',
    requirement: 'Active for 3 consecutive days',
    progress: Math.min(3, streakDays),
    maxProgress: 3,
    unlockedAt: streakDays >= 3 ? new Date().toISOString() : undefined,
    rewardPoints: 15,
  });

  achievements.push({
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day activity streak',
    icon: 'Medal',
    category: 'streak',
    requirement: 'Active for 7 consecutive days',
    progress: Math.min(7, streakDays),
    maxProgress: 7,
    unlockedAt: streakDays >= 7 ? new Date().toISOString() : undefined,
    rewardPoints: 40,
  });

  return achievements;
}

/**
 * Calculate overall setup completion percentage
 */
export function calculateSetupCompletion(dimensions: SetupDimension[]): number {
  if (dimensions.length === 0) return 0;

  let totalWeight = 0;
  let weightedCompletion = 0;

  for (const dim of dimensions) {
    totalWeight += dim.weight;
    weightedCompletion += dim.weight * (dim.completionPercentage / 100);
  }

  return totalWeight > 0 ? Math.round((weightedCompletion / totalWeight) * 100) : 0;
}

/**
 * Get status color for display
 */
export function getStatusColor(status: HealthScoreStatus): string {
  switch (status) {
    case 'excellent': return 'emerald';
    case 'good': return 'green';
    case 'fair': return 'yellow';
    case 'poor': return 'orange';
    case 'critical': return 'red';
    default: return 'gray';
  }
}

/**
 * Get effort badge color
 */
export function getEffortColor(effort: EffortLevel): string {
  switch (effort) {
    case 'quick': return 'green';
    case 'medium': return 'yellow';
    case 'significant': return 'orange';
    default: return 'gray';
  }
}

/**
 * Get impact badge color
 */
export function getImpactColor(impact: ImpactLevel): string {
  switch (impact) {
    case 'high': return 'red';
    case 'medium': return 'yellow';
    case 'low': return 'gray';
    default: return 'gray';
  }
}
