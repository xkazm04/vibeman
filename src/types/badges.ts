/**
 * Badge Types for Blueprint Onboarding
 *
 * Each decision step in the Blueprint onboarding process can award a badge
 * to gamify the experience and track user progress.
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: 'build' | 'context' | 'photo' | 'structure' | 'vision';
  earnedAt?: string; // ISO timestamp
}

export interface BadgeProgress {
  totalBadges: number;
  earnedBadges: number;
  badges: Badge[];
}

/**
 * Predefined badges for each onboarding decision step
 */
export const AVAILABLE_BADGES: Record<string, Badge> = {
  // Build badges
  'build-scanner': {
    id: 'build-scanner',
    name: 'Build Scanner',
    description: 'Analyzed build configuration and dependencies',
    icon: 'Package',
    category: 'build',
  },
  'dependency-detective': {
    id: 'dependency-detective',
    name: 'Dependency Detective',
    description: 'Identified critical project dependencies',
    icon: 'Search',
    category: 'build',
  },

  // Context badges
  'context-curator': {
    id: 'context-curator',
    name: 'Context Curator',
    description: 'Organized project contexts and documentation',
    icon: 'FolderTree',
    category: 'context',
  },
  'documentation-master': {
    id: 'documentation-master',
    name: 'Documentation Master',
    description: 'Set up comprehensive context documentation',
    icon: 'BookOpen',
    category: 'context',
  },

  // Photo/Screenshot badges
  'visual-architect': {
    id: 'visual-architect',
    name: 'Visual Architect',
    description: 'Configured screenshot and visual testing',
    icon: 'Camera',
    category: 'photo',
  },
  'snapshot-specialist': {
    id: 'snapshot-specialist',
    name: 'Snapshot Specialist',
    description: 'Set up automated visual regression testing',
    icon: 'Image',
    category: 'photo',
  },

  // Structure badges
  'structure-strategist': {
    id: 'structure-strategist',
    name: 'Structure Strategist',
    description: 'Mapped out project architecture and file structure',
    icon: 'GitBranch',
    category: 'structure',
  },
  'architecture-explorer': {
    id: 'architecture-explorer',
    name: 'Architecture Explorer',
    description: 'Explored and understood project organization',
    icon: 'Map',
    category: 'structure',
  },

  // Vision badges
  'vision-keeper': {
    id: 'vision-keeper',
    name: 'Vision Keeper',
    description: 'Defined project vision and goals',
    icon: 'Eye',
    category: 'vision',
  },
  'goal-setter': {
    id: 'goal-setter',
    name: 'Goal Setter',
    description: 'Established clear project objectives',
    icon: 'Target',
    category: 'vision',
  },

  // Completion badge
  'blueprint-master': {
    id: 'blueprint-master',
    name: 'Blueprint Master',
    description: 'Completed entire Blueprint onboarding journey',
    icon: 'Award',
    category: 'vision',
  },
};
