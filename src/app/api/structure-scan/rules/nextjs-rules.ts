/**
 * Next.js Structure Rules
 *
 * Defines expected file/folder patterns for Next.js 15 App Router projects.
 * These rules are used by the structure scanner to detect violations and
 * generate guidelines for AI-assisted development.
 *
 * Rule format:
 *   pattern     - Glob pattern to match files/folders
 *   description - What should exist at this location (used by LLMs for context)
 *   required    - Whether this pattern is mandatory (default: false)
 *   examples    - Example file paths matching this pattern
 *   context     - Whether this pattern defines a scannable context boundary
 */

import type { StructureRule, DirectoryRule, EnforcedStructure } from '../structureTemplates';

/** Structure rules for Next.js projects */
export const NEXTJS_RULES: StructureRule[] = [
  // Core Next.js App Router
  {
    pattern: 'src/app/**',
    description:
      'Next.js App Router pages and layouts. Use route folders with page.tsx, layout.tsx, and route.ts files.',
    required: true,
    examples: ['src/app/page.tsx', 'src/app/layout.tsx', 'src/app/projects/page.tsx'],
  },
  {
    pattern: 'src/app/api/**',
    description:
      'API route handlers. Each route should be in route.ts files following Next.js conventions.',
    required: false,
    examples: ['src/app/api/goals/route.ts', 'src/app/api/contexts/route.ts'],
  },

  // Feature-based organization
  {
    pattern: 'src/app/[feature]/**/*.tsx',
    description:
      'Feature-specific components should be co-located with their feature pages. Example: src/app/goals/GoalsList.tsx',
    required: false,
    examples: ['src/app/goals/GoalsList.tsx', 'src/app/coder/Context/ContextOverview.tsx'],
  },

  // Feature context detection (for scripted scanning)
  {
    pattern: 'src/app/features/**/layout.tsx',
    description:
      'Feature layout files that define context boundaries. Each layout.tsx and its dependencies form a context.',
    required: false,
    context: true,
    examples: [
      'src/app/features/Dashboard/layout.tsx',
      'src/app/features/Auth/sub_Login/layout.tsx',
    ],
  },
  {
    pattern: 'src/app/features/**/*layout.tsx',
    description:
      'Feature-specific layout files (e.g., DashboardLayout.tsx). Each layout and its dependencies form a context.',
    required: false,
    context: true,
    examples: [
      'src/app/features/Dashboard/DashboardLayout.tsx',
      'src/app/features/Auth/AuthLayout.tsx',
    ],
  },
  {
    pattern: 'src/app/features/**/*Layout.tsx',
    description:
      'Feature-specific layout files with uppercase L (e.g., DashboardLayout.tsx). Each layout and its dependencies form a context.',
    required: false,
    context: true,
    examples: [
      'src/app/features/Dashboard/DashboardLayout.tsx',
      'src/app/features/Auth/AuthLayout.tsx',
    ],
  },

  // Shared resources
  {
    pattern: 'src/components/**',
    description:
      'Shared/reusable components used across multiple features. Keep feature-specific components in their feature folders.',
    required: false,
    examples: ['src/components/ui/Button.tsx', 'src/components/layout/Header.tsx'],
  },
  {
    pattern: 'src/lib/**',
    description:
      'Core business logic, utilities, and services. Database connections, API clients, and helper functions.',
    required: true,
    examples: ['src/lib/database.ts', 'src/lib/processManager.ts', 'src/lib/utils.ts'],
  },
  {
    pattern: 'src/stores/**',
    description: 'Zustand state management stores. Each store should manage a specific domain.',
    required: false,
    examples: ['src/stores/activeProjectStore.ts', 'src/stores/projectConfigStore.ts'],
  },
  {
    pattern: 'src/hooks/**',
    description: 'Custom React hooks for reusable component logic.',
    required: false,
    examples: ['src/hooks/useProjects.ts', 'src/hooks/useGoals.ts'],
  },
  {
    pattern: 'src/types/**',
    description: 'Shared TypeScript type definitions and interfaces.',
    required: false,
    examples: ['src/types/index.ts', 'src/types/database.ts'],
  },

  // Database and queries
  {
    pattern: 'src/lib/queries/**',
    description:
      'Database query functions organized by domain. Each file should contain CRUD operations for a specific entity.',
    required: false,
    examples: ['src/lib/queries/goalQueries.ts', 'src/lib/queries/contextQueries.ts'],
  },
  {
    pattern: 'src/lib/database.ts',
    description: 'Main database connection and initialization logic.',
    required: false,
  },

  // Configuration
  {
    pattern: 'public/**',
    description: 'Static assets like images, fonts, and other public files.',
    required: false,
  },

  // Anti-patterns (files that should NOT exist)
  {
    pattern: 'src/pages/**',
    description:
      'AVOID: pages/ directory is for Next.js Pages Router. Use app/ directory instead (App Router).',
    required: false,
  },
  {
    pattern: 'src/utils/**',
    description: 'AVOID: Use src/lib/ instead of src/utils/ for consistency.',
    required: false,
  },
  {
    pattern: 'src/helpers/**',
    description: 'AVOID: Use src/lib/ instead of src/helpers/ for consistency.',
    required: false,
  },
];

/**
 * Enforced directory structure for Next.js projects with src/ folder.
 * Defines strict rules about what folders and files are allowed at each level.
 */
export const NEXTJS_DIRECTORY_RULES: DirectoryRule[] = [
  {
    path: 'src',
    description: 'Source code directory - only specified folders allowed',
    strictMode: true,
    allowedFolders: [
      { name: 'app', description: 'Next.js App Router - pages, layouts, and routes' },
      { name: 'components', description: 'Shared/reusable components only' },
      { name: 'hooks', description: 'Custom React hooks' },
      { name: 'lib', description: 'Business logic, utilities, and services' },
      { name: 'stores', description: 'Zustand state management stores' },
      { name: 'types', description: 'TypeScript type definitions' },
    ],
    subdirectoryRules: [
      {
        path: 'src/app',
        description: 'App Router directory - pages and API routes',
        strictMode: true,
        allowedFolders: [
          { name: 'api', description: 'API route handlers' },
          { name: 'features', description: 'Shared feature components and logic' },
          { name: '*-page', description: 'Page folders (must end with -page)' },
        ],
        allowedFiles: [
          { name: 'globals.css', description: 'Global CSS styles' },
          { name: 'favicon.ico', description: 'Favicon icon' },
          { name: 'layout.tsx', description: 'Root layout component' },
          { name: 'page.tsx', description: 'Root page component' },
        ],
        subdirectoryRules: [
          {
            path: 'src/app/features',
            description: 'Shared feature components - supports subfeatures one level deep',
            strictMode: true,
            allowedFolders: [
              { name: 'components', description: 'Feature-specific components' },
              { name: 'lib', description: 'Feature-specific utilities and logic' },
              { name: 'sub_*', description: 'Subfeatures (one level only)' },
            ],
            allowedFiles: [
              { name: '*', description: 'Any file types allowed in features root' },
            ],
            subdirectoryRules: [
              {
                path: 'src/app/features/sub_*',
                description: 'Subfeature folders - cannot have nested subfeatures',
                strictMode: true,
                allowedFolders: [
                  { name: 'components', description: 'Subfeature components' },
                  { name: 'lib', description: 'Subfeature utilities' },
                ],
                allowedFiles: [
                  { name: '*', description: 'Any file types allowed in subfeatures' },
                ],
              },
            ],
          },
          {
            path: 'src/app/api',
            description: 'API routes with recursive subdirectories',
            strictMode: false,
            allowedFolders: [
              { name: '*', description: 'API route folders', recursive: true },
            ],
            allowedFiles: [
              { name: 'route.ts', description: 'API route handler' },
              { name: '*.ts', description: 'TypeScript files for API logic' },
            ],
          },
        ],
      },
      {
        path: 'src/components',
        description: 'Shared components - recursive structure allowed',
        strictMode: false,
        allowedFolders: [
          { name: '*', description: 'Component folders', recursive: true },
        ],
        allowedFiles: [
          { name: '*.tsx', description: 'React components' },
          { name: '*.ts', description: 'TypeScript utilities' },
          { name: '*.css', description: 'Component styles' },
        ],
      },
      {
        path: 'src/lib',
        description: 'Business logic and utilities - recursive structure allowed',
        strictMode: false,
        allowedFolders: [
          { name: '*', description: 'Utility folders', recursive: true },
        ],
        allowedFiles: [
          { name: '*.ts', description: 'TypeScript files' },
          { name: '*.tsx', description: 'React utilities' },
        ],
      },
      {
        path: 'src/hooks',
        description: 'Custom React hooks',
        strictMode: false,
        allowedFiles: [
          { name: '*.ts', description: 'Hook files' },
          { name: '*.tsx', description: 'Hook files with JSX' },
        ],
      },
      {
        path: 'src/stores',
        description: 'Zustand stores',
        strictMode: false,
        allowedFiles: [{ name: '*.ts', description: 'Store files' }],
      },
      {
        path: 'src/types',
        description: 'TypeScript types',
        strictMode: false,
        allowedFiles: [{ name: '*.ts', description: 'Type definition files' }],
      },
    ],
  },
];

/** Anti-patterns to detect in Next.js projects */
export const NEXTJS_ANTI_PATTERNS: EnforcedStructure['antiPatterns'] = [
  {
    pattern: 'src/pages/**',
    description: 'Pages Router directory (legacy)',
    suggestedLocation: 'src/app/',
  },
  {
    pattern: 'src/utils/**',
    description: 'Utils directory',
    suggestedLocation: 'src/lib/',
  },
  {
    pattern: 'src/helpers/**',
    description: 'Helpers directory',
    suggestedLocation: 'src/lib/',
  },
  {
    pattern: 'src/app/features/sub_*/sub_*/**',
    description: 'Nested subfeatures (not allowed)',
    suggestedLocation: 'Flatten to src/app/features/sub_*/',
  },
];
