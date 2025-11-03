/**
 * Structure Templates for Different Project Types
 * Defines expected file/folder patterns and their purposes
 */

import { logger } from '@/lib/logger';

export interface StructureRule {
  pattern: string; // Glob pattern to match files
  description: string; // What should be in this location (for LLMs)
  required?: boolean; // Whether this structure is mandatory
  examples?: string[]; // Example file paths
  context?: boolean; // Whether this pattern defines a context (for scripted context scanning)
}

export interface ProjectStructureTemplate {
  type: 'nextjs' | 'fastapi';
  name: string;
  description: string;
  rules: StructureRule[];
}

/**
 * Directory-level enforcement rules
 * Defines what folders and files are allowed at each directory level
 */
export interface DirectoryRule {
  path: string; // Relative path (e.g., "src", "src/app", "src/app/features")
  description: string; // What this directory is for
  allowedFolders?: Array<{
    name: string; // Folder name or pattern (e.g., "api", "*-page", "sub_*")
    description: string;
    recursive?: boolean; // If true, any subdirectories are allowed
  }>;
  allowedFiles?: Array<{
    name: string; // File name or pattern (e.g., "*.tsx", "globals.css")
    description: string;
  }>;
  subdirectoryRules?: DirectoryRule[]; // Rules for subdirectories
  strictMode?: boolean; // If true, only explicitly allowed items are permitted
}

/**
 * Enforced project structure with hierarchical rules
 */
export interface EnforcedStructure {
  projectType: 'nextjs' | 'fastapi';
  name: string;
  description: string;
  directoryRules: DirectoryRule[];
  antiPatterns?: Array<{
    pattern: string;
    description: string;
    suggestedLocation: string;
  }>;
}

/**
 * NextJS Project Structure Template
 * Based on vibeman best practices and Next.js 15 App Router conventions
 */
export const NEXTJS_STRUCTURE: ProjectStructureTemplate = {
  type: 'nextjs',
  name: 'Next.js 15 with App Router',
  description: 'Modern Next.js project structure with feature-based organization',
  rules: [
    // Core Next.js App Router
    {
      pattern: 'src/app/**',
      description: 'Next.js App Router pages and layouts. Use route folders with page.tsx, layout.tsx, and route.ts files.',
      required: true,
      examples: ['src/app/page.tsx', 'src/app/layout.tsx', 'src/app/projects/page.tsx'],
    },
    {
      pattern: 'src/app/api/**',
      description: 'API route handlers. Each route should be in route.ts files following Next.js conventions.',
      required: false,
      examples: ['src/app/api/goals/route.ts', 'src/app/api/contexts/route.ts'],
    },

    // Feature-based organization - TBD critical to rewrite and test
    {
      pattern: 'src/app/[feature]/**/*.tsx',
      description: 'Feature-specific components should be co-located with their feature pages. Example: src/app/goals/GoalsList.tsx',
      required: false,
      examples: ['src/app/goals/GoalsList.tsx', 'src/app/coder/Context/ContextOverview.tsx'],
    },

    // Feature context detection (for scripted scanning)
    {
      pattern: 'src/app/features/**/layout.tsx',
      description: 'Feature layout files that define context boundaries. Each layout.tsx and its dependencies form a context.',
      required: false,
      context: true,
      examples: ['src/app/features/Dashboard/layout.tsx', 'src/app/features/Auth/sub_Login/layout.tsx'],
    },
    {
      pattern: 'src/app/features/**/*layout.tsx',
      description: 'Feature-specific layout files (e.g., DashboardLayout.tsx). Each layout and its dependencies form a context.',
      required: false,
      context: true,
      examples: ['src/app/features/Dashboard/DashboardLayout.tsx', 'src/app/features/Auth/AuthLayout.tsx'],
    },
    {
      pattern: 'src/app/features/**/*Layout.tsx',
      description: 'Feature-specific layout files with uppercase L (e.g., DashboardLayout.tsx). Each layout and its dependencies form a context.',
      required: false,
      context: true,
      examples: ['src/app/features/Dashboard/DashboardLayout.tsx', 'src/app/features/Auth/AuthLayout.tsx'],
    },

    // Shared resources
    {
      pattern: 'src/components/**',
      description: 'Shared/reusable components used across multiple features. Keep feature-specific components in their feature folders.',
      required: false,
      examples: ['src/components/ui/Button.tsx', 'src/components/layout/Header.tsx'],
    },
    {
      pattern: 'src/lib/**',
      description: 'Core business logic, utilities, and services. Database connections, API clients, and helper functions.',
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
      description: 'Database query functions organized by domain. Each file should contain CRUD operations for a specific entity.',
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
      description: 'AVOID: pages/ directory is for Next.js Pages Router. Use app/ directory instead (App Router).',
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
  ],
};

/**
 * Enforced NextJS Structure with Strict Rules
 * Hierarchical structure defining exactly what's allowed at each level
 *
 * IMPORTANT: This structure assumes a Next.js project WITH a src/ folder.
 * For projects without src/ (where app/ is at root), use NEXTJS_ENFORCED_STRUCTURE_NO_SRC
 */
export const NEXTJS_ENFORCED_STRUCTURE: EnforcedStructure = {
  projectType: 'nextjs',
  name: 'Next.js 15 Enforced Structure (with src/)',
  description: 'Strict Next.js structure with explicit folder and file rules (assumes src/ folder exists)',
  directoryRules: [
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
          allowedFiles: [
            { name: '*.ts', description: 'Store files' },
          ],
        },
        {
          path: 'src/types',
          description: 'TypeScript types',
          strictMode: false,
          allowedFiles: [
            { name: '*.ts', description: 'Type definition files' },
          ],
        },
      ],
    },
  ],
  antiPatterns: [
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
  ],
};

/**
 * FastAPI Project Structure Template
 * Based on FastAPI best practices
 */
export const FASTAPI_STRUCTURE: ProjectStructureTemplate = {
  type: 'fastapi',
  name: 'FastAPI Project',
  description: 'Standard FastAPI project structure with clean architecture',
  rules: [
    // Core application
    {
      pattern: 'app/**',
      description: 'Main application code. All Python modules should be under app/ directory.',
      required: true,
      examples: ['app/main.py', 'app/__init__.py'],
    },
    {
      pattern: 'app/main.py',
      description: 'FastAPI application entry point with app instance and startup configuration.',
      required: true,
    },

    // API routes
    {
      pattern: 'app/api/**',
      description: 'API route handlers organized by domain/resource. Each router should handle a specific entity.',
      required: true,
      examples: ['app/api/users.py', 'app/api/items.py', 'app/api/auth.py'],
    },
    {
      pattern: 'app/api/__init__.py',
      description: 'API router initialization and aggregation.',
      required: true,
    },

    // Models and schemas
    {
      pattern: 'app/models/**',
      description: 'Pydantic models for request/response validation and database models (SQLAlchemy/etc).',
      required: true,
      examples: ['app/models/user.py', 'app/models/item.py'],
    },
    {
      pattern: 'app/schemas/**',
      description: 'Pydantic schemas for API request/response validation, separate from database models.',
      required: false,
      examples: ['app/schemas/user.py', 'app/schemas/item.py'],
    },

    // Services and business logic
    {
      pattern: 'app/services/**',
      description: 'Business logic layer. Services should contain the core application logic, separate from API routes.',
      required: true,
      context: true,
      examples: ['app/services/user_service.py', 'app/services/auth_service.py'],
    },

    // Database
    {
      pattern: 'app/db/**',
      description: 'Database configuration, connection management, and session handling.',
      required: false,
      examples: ['app/db/database.py', 'app/db/session.py'],
    },
    {
      pattern: 'app/crud/**',
      description: 'CRUD operations for database entities. Each file handles database operations for a specific model.',
      required: false,
      examples: ['app/crud/user.py', 'app/crud/item.py'],
    },

    // Core configuration
    {
      pattern: 'app/core/**',
      description: 'Core configuration, settings, security, and shared utilities.',
      required: true,
      examples: ['app/core/config.py', 'app/core/security.py', 'app/core/deps.py'],
    },
    {
      pattern: 'app/core/config.py',
      description: 'Application configuration using Pydantic BaseSettings.',
      required: true,
    },

    // Dependencies
    {
      pattern: 'requirements.txt',
      description: 'Python dependencies for the project.',
      required: true,
    },

    // Anti-patterns
    {
      pattern: 'app/utils/**',
      description: 'AVOID: Use app/core/ or app/services/ instead of utils/ for better organization.',
      required: false,
    },
    {
      pattern: 'app/helpers/**',
      description: 'AVOID: Use app/core/ or app/services/ instead of helpers/ for better organization.',
      required: false,
    },
    {
      pattern: '*.py (root level)',
      description: 'AVOID: Python files in root directory. Keep application code under app/ directory.',
      required: false,
    },
  ],
};

/**
 * Get structure template by project type (with custom template support)
 * Server-side only - loads from file system
 */
export async function getStructureTemplateWithCustom(type: 'nextjs' | 'fastapi'): Promise<ProjectStructureTemplate> {
  if (typeof window !== 'undefined') {
    // Client-side: use default
    return getStructureTemplate(type);
  }

  // Server-side: check for custom template
  try {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    const customPath = path.join(process.cwd(), 'data', 'custom-templates', `${type}.json`);

    try {
      const customContent = await fs.readFile(customPath, 'utf-8');
      const customTemplate = JSON.parse(customContent);

      const baseTemplate = type === 'nextjs' ? NEXTJS_STRUCTURE : FASTAPI_STRUCTURE;
      return {
        ...baseTemplate,
        rules: customTemplate.rules,
      };
    } catch {
      // Custom template doesn't exist, use default
      return getStructureTemplate(type);
    }
  } catch (error) {
    logger.warn('Failed to load custom template, using default', { error });
    return getStructureTemplate(type);
  }
}

/**
 * Get structure template by project type (default only)
 */
export function getStructureTemplate(type: 'nextjs' | 'fastapi'): ProjectStructureTemplate {
  switch (type) {
    case 'nextjs':
      return NEXTJS_STRUCTURE;
    case 'fastapi':
      return FASTAPI_STRUCTURE;
    default:
      throw new Error(`Unknown project type: ${type}`);
  }
}

/**
 * Get enforced structure by project type
 */
export function getEnforcedStructure(type: 'nextjs' | 'fastapi'): EnforcedStructure | null {
  switch (type) {
    case 'nextjs':
      return NEXTJS_ENFORCED_STRUCTURE;
    case 'fastapi':
      // FastAPI enforced structure not yet implemented
      return null;
    default:
      return null;
  }
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ProjectStructureTemplate[] {
  return [NEXTJS_STRUCTURE, FASTAPI_STRUCTURE];
}

/**
 * Convert EnforcedStructure to human-readable guidelines
 * Used for generating dynamic documentation in requirement files
 */
export function generateGuidelinesFromEnforcedStructure(structure: EnforcedStructure): string {
  let guidelines = `### ${structure.name}\n\n`;
  guidelines += `${structure.description}\n\n`;

  // Process directory rules
  guidelines += `**Directory Structure:**\n\n`;

  function processDirectoryRule(rule: DirectoryRule, indent: number = 0): string {
    const indentStr = '  '.repeat(indent);
    let text = '';

    // Add directory description
    text += `${indentStr}- **\`${rule.path}/\`**: ${rule.description}\n`;

    // Add allowed folders
    if (rule.allowedFolders && rule.allowedFolders.length > 0) {
      text += `${indentStr}  - Allowed folders:\n`;
      for (const folder of rule.allowedFolders) {
        const folderDesc = folder.recursive ? ` (recursive)` : '';
        text += `${indentStr}    - \`${folder.name}\` - ${folder.description}${folderDesc}\n`;
      }
    }

    // Add allowed files
    if (rule.allowedFiles && rule.allowedFiles.length > 0) {
      text += `${indentStr}  - Allowed files:\n`;
      for (const file of rule.allowedFiles) {
        text += `${indentStr}    - \`${file.name}\` - ${file.description}\n`;
      }
    }

    // Add strict mode note
    if (rule.strictMode) {
      text += `${indentStr}  - ⚠️ **Strict mode**: Only explicitly listed items are allowed\n`;
    }

    // Process subdirectories
    if (rule.subdirectoryRules && rule.subdirectoryRules.length > 0) {
      for (const subRule of rule.subdirectoryRules) {
        text += processDirectoryRule(subRule, indent + 1);
      }
    }

    text += '\n';
    return text;
  }

  for (const rule of structure.directoryRules) {
    guidelines += processDirectoryRule(rule);
  }

  // Add anti-patterns section
  if (structure.antiPatterns && structure.antiPatterns.length > 0) {
    guidelines += `**Anti-Patterns (AVOID):**\n\n`;
    for (const antiPattern of structure.antiPatterns) {
      guidelines += `- ❌ \`${antiPattern.pattern}\` - ${antiPattern.description}\n`;
      guidelines += `  - Use instead: \`${antiPattern.suggestedLocation}\`\n`;
    }
    guidelines += '\n';
  }

  // Add key principles
  guidelines += `**Key Principles:**\n\n`;
  if (structure.projectType === 'nextjs') {
    guidelines += `1. **Strict src/ structure**: Only \`app\`, \`components\`, \`hooks\`, \`lib\`, \`stores\`, and \`types\` folders are allowed in \`src/\`\n`;
    guidelines += `2. **App Router structure**: Only \`api\`, \`features\`, and \`*-page\` folders allowed in \`src/app/\`, plus specific root files\n`;
    guidelines += `3. **Feature organization**: Use \`src/app/features/\` for shared feature logic with optional \`sub_*\` subfeatures (one level only)\n`;
    guidelines += `4. **No nested subfeatures**: Subfeatures (\`sub_*\`) cannot contain other subfeatures\n`;
    guidelines += `5. **Consistent naming**: Use \`src/lib/\` for all utilities (not \`utils/\` or \`helpers/\`)\n`;
  }

  return guidelines;
}
