/**
 * Stepper Configuration
 *
 * Defines technique groups and their scan modules for the wizard stepper.
 * Supports grouping per project type and toggle-able scan groups.
 */

import {
  Eye,
  Layers,
  Box,
  Hammer,
  Sparkles,
  Code,
  Bug,
  Camera,
  Target,
  Trash2,
  FlaskConical,
  Scissors,
  FileEdit,
  LucideIcon,
} from 'lucide-react';

/**
 * Scan technique definition
 */
export interface ScanTechnique {
  id: string;
  label: string;
  icon: LucideIcon;
  color: 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo';
  description: string;
  eventTitle?: string;
  contextNeeded?: boolean;
}

/**
 * Technique group definition
 */
export interface TechniqueGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  gradientFrom: string;
  gradientVia?: string;
  techniques: ScanTechnique[];
  enabled: boolean; // Can be toggled on/off
  projectTypes: ('nextjs' | 'fastapi' | 'react' | 'python' | 'other')[]; // Which project types this group applies to
}

/**
 * Stepper configuration for different project types
 */
export interface StepperConfig {
  groups: TechniqueGroup[];
  projectType: 'nextjs' | 'fastapi' | 'react' | 'python' | 'other';
}

/**
 * Default technique groups - framework agnostic
 */
export const DEFAULT_TECHNIQUE_GROUPS: TechniqueGroup[] = [
  {
    id: 'vision',
    name: 'Vision',
    description: 'Strategic planning and project overview scans',
    color: 'cyan',
    gradientFrom: 'cyan-500/30',
    techniques: [
      {
        id: 'vision',
        label: 'Vision',
        icon: Eye,
        color: 'cyan',
        description: 'Analyze project goals and strategic direction',
        eventTitle: 'Vision Scan Completed',
      },
    ],
    enabled: true,
    projectTypes: ['nextjs', 'fastapi', 'react', 'python', 'other'],
  },
  {
    id: 'knowledge',
    name: 'Knowledge',
    description: 'Context and documentation scans',
    color: 'blue',
    gradientFrom: 'blue-500/30',
    techniques: [
      {
        id: 'contexts',
        label: 'Contexts',
        icon: Layers,
        color: 'blue',
        description: 'Scan and organize project contexts',
        eventTitle: 'Contexts Scan Completed',
      },
    ],
    enabled: true,
    projectTypes: ['nextjs', 'fastapi', 'react', 'python', 'other'],
  },
  {
    id: 'structure',
    name: 'Structure',
    description: 'Code architecture and organization scans',
    color: 'purple',
    gradientFrom: 'purple-500/30',
    techniques: [
      {
        id: 'structure',
        label: 'Structure',
        icon: Box,
        color: 'purple',
        description: 'Analyze project structure and organization',
        eventTitle: 'Structure Scan Completed',
      },
    ],
    enabled: true,
    projectTypes: ['nextjs', 'fastapi', 'react', 'python', 'other'],
  },
  {
    id: 'quality',
    name: 'Quality',
    description: 'Build, test, and code quality scans',
    color: 'amber',
    gradientFrom: 'amber-500/30',
    techniques: [
      {
        id: 'build',
        label: 'Build',
        icon: Hammer,
        color: 'amber',
        description: 'Check build configuration and detect issues',
        eventTitle: 'Build Scan Completed',
      },
    ],
    enabled: true,
    projectTypes: ['nextjs', 'fastapi', 'react', 'python', 'other'],
  },
];

/**
 * NextJS-specific technique groups
 */
export const NEXTJS_TECHNIQUE_GROUPS: TechniqueGroup[] = [
  ...DEFAULT_TECHNIQUE_GROUPS,
  {
    id: 'nextjs-ui',
    name: 'UI & Components',
    description: 'React component and UI-specific scans',
    color: 'pink',
    gradientFrom: 'pink-500/30',
    techniques: [
      {
        id: 'photo',
        label: 'Photo',
        icon: Camera,
        color: 'pink',
        description: 'Capture visual snapshots of components',
        eventTitle: 'Photo Scan Completed',
        contextNeeded: true,
      },
      {
        id: 'selectors',
        label: 'Selectors',
        icon: Target,
        color: 'indigo',
        description: 'Find missing test selectors in components',
        eventTitle: 'Selectors Scan Completed',
        contextNeeded: true,
      },
      {
        id: 'test',
        label: 'Test',
        icon: FlaskConical,
        color: 'green',
        description: 'Generate and run Playwright tests',
        eventTitle: 'Test Scan Completed',
        contextNeeded: true,
      },
      {
        id: 'testDesign',
        label: 'Test Design',
        icon: FileEdit,
        color: 'amber',
        description: 'Design and generate test scenarios for comprehensive coverage',
        eventTitle: 'Test Design Scan Completed',
        contextNeeded: true,
      },
      {
        id: 'separator',
        label: 'Separator',
        icon: Scissors,
        color: 'purple',
        description: 'Intelligently separate contexts into smaller, focused units',
        eventTitle: 'Separator Scan Completed',
        contextNeeded: true,
      },
    ],
    enabled: true,
    projectTypes: ['nextjs', 'react'],
  },
  {
    id: 'nextjs-cleanup',
    name: 'Code Cleanup',
    description: 'Detect and remove unused code',
    color: 'red',
    gradientFrom: 'red-500/30',
    techniques: [
      {
        id: 'unused',
        label: 'Unused',
        icon: Trash2,
        color: 'red',
        description: 'Find unused imports, exports, and code',
        eventTitle: 'Unused Code Scan Completed',
      },
    ],
    enabled: true,
    projectTypes: ['nextjs', 'react'],
  },
];

/**
 * FastAPI-specific technique groups
 */
export const FASTAPI_TECHNIQUE_GROUPS: TechniqueGroup[] = [
  ...DEFAULT_TECHNIQUE_GROUPS,
  {
    id: 'fastapi-api',
    name: 'API & Endpoints',
    description: 'API endpoint and routing scans',
    color: 'green',
    gradientFrom: 'green-500/30',
    techniques: [
      {
        id: 'endpoints',
        label: 'Endpoints',
        icon: Code,
        color: 'green',
        description: 'Analyze API endpoints and routes',
        eventTitle: 'Endpoints Scan Completed',
      },
    ],
    enabled: true,
    projectTypes: ['fastapi', 'python'],
  },
];

/**
 * Get stepper configuration for a project type
 */
export function getStepperConfig(projectType: 'nextjs' | 'fastapi' | 'react' | 'python' | 'other'): StepperConfig {
  let groups: TechniqueGroup[];

  switch (projectType) {
    case 'nextjs':
    case 'react':
      groups = NEXTJS_TECHNIQUE_GROUPS;
      break;
    case 'fastapi':
    case 'python':
      groups = FASTAPI_TECHNIQUE_GROUPS;
      break;
    default:
      groups = DEFAULT_TECHNIQUE_GROUPS;
  }

  // Filter groups by project type
  const filteredGroups = groups.filter(group =>
    group.projectTypes.includes(projectType)
  );

  return {
    groups: filteredGroups,
    projectType,
  };
}

/**
 * Get all techniques from a stepper config (flattened)
 */
export function getAllTechniques(config: StepperConfig): ScanTechnique[] {
  return config.groups
    .filter(group => group.enabled)
    .flatMap(group => group.techniques);
}

/**
 * Get enabled groups from a stepper config
 */
export function getEnabledGroups(config: StepperConfig): TechniqueGroup[] {
  return config.groups.filter(group => group.enabled);
}

/**
 * Toggle a technique group on/off
 */
export function toggleGroup(
  config: StepperConfig,
  groupId: string,
  enabled: boolean
): StepperConfig {
  return {
    ...config,
    groups: config.groups.map(group =>
      group.id === groupId ? { ...group, enabled } : group
    ),
  };
}

/**
 * Get technique by ID
 */
export function getTechniqueById(config: StepperConfig, techniqueId: string): ScanTechnique | null {
  for (const group of config.groups) {
    const technique = group.techniques.find(t => t.id === techniqueId);
    if (technique) return technique;
  }
  return null;
}

/**
 * Get group for a technique
 */
export function getGroupForTechnique(config: StepperConfig, techniqueId: string): TechniqueGroup | null {
  for (const group of config.groups) {
    if (group.techniques.some(t => t.id === techniqueId)) {
      return group;
    }
  }
  return null;
}
