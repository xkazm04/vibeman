/**
 * Structure Rules Template for Claude Code
 * This content will be added to .claude initialization to enforce structure rules
 */

// Common template sections
interface RuleSection {
  title: string;
  content: string[];
}

interface ExampleSection {
  good: string[];
  bad: string[];
}

export function generateStructureRules(projectType: 'nextjs' | 'fastapi' | 'other'): string {
  if (projectType === 'nextjs') {
    return generateNextJSStructureRules();
  } else if (projectType === 'fastapi') {
    return generateFastAPIStructureRules();
  }

  return ''; // No structure rules for 'other' project types
}

/**
 * Generate a formatted rule section
 */
function formatRuleSection(section: RuleSection): string {
  return `**${section.title}**\n${section.content.map(item => `- ${item}`).join('\n')}`;
}

/**
 * Generate examples section
 */
function formatExamples(examples: ExampleSection): string {
  const good = examples.good.map(item => `- \`${item}\``).join('\n');
  const bad = examples.bad.map(item => `- \`${item}\``).join('\n');
  return `✅ Good:\n${good}\n\n❌ Bad:\n${bad}`;
}

/**
 * Generate anti-patterns section
 */
function formatAntiPatterns(patterns: string[]): string {
  return patterns.map(pattern => `❌ ${pattern}`).join('\n');
}

/**
 * Generate header section
 */
function generateHeader(projectTypeLabel: string): string {
  return `# Project Structure Rules (${projectTypeLabel})

**CRITICAL**: All code changes must follow these structure rules.`;
}

/**
 * Generate enforcement footer
 */
function generateEnforcementSection(): string {
  return `## Enforcement

Before creating or moving any file, verify it follows these rules. Use Structure Scan to detect violations.`;
}

function generateNextJSStructureRules(): string {
  const coreDirectories = [
    '`src/app/` - Next.js App Router pages, layouts, and route handlers',
    '`src/app/api/` - API routes (route.ts files only)',
    '`src/app/[feature]/` - Feature-specific pages and components',
    '`src/components/` - Shared/reusable components ONLY',
    '`src/lib/` - Business logic, utilities, services, database',
    '`src/stores/` - Zustand state management',
    '`src/hooks/` - Custom React hooks',
    '`src/types/` - TypeScript type definitions',
    '`src/lib/queries/` - Database query functions organized by domain'
  ];

  const filePlacementRules = [
    {
      title: '1. Feature Co-location',
      content: [
        'Keep feature-specific components in their feature folders',
        'Example: `src/app/goals/GoalsList.tsx` NOT `src/components/GoalsList.tsx`',
        'Only move components to `src/components/` if used in 3+ features'
      ]
    },
    {
      title: '2. Business Logic',
      content: [
        'ALL utilities, helpers, and business logic go in `src/lib/`',
        'Database connections: `src/lib/database.ts`, `src/lib/project_database.ts`',
        'Managers/Services: `src/lib/processManager.ts`, `src/lib/gitManager.ts`',
        'Query functions: `src/lib/queries/[domain]Queries.ts`'
      ]
    },
    {
      title: '3. API Routes',
      content: [
        'Follow Next.js conventions: `src/app/api/[resource]/route.ts`',
        'Group related routes: `src/app/api/contexts/route.ts`, `src/app/api/contexts/[id]/route.ts`'
      ]
    },
    {
      title: '4. State Management',
      content: [
        'Each store manages one domain: `src/stores/activeProjectStore.ts`',
        'Use Zustand for global state, React hooks for component state'
      ]
    }
  ];

  const antiPatterns = [
    '`src/pages/**` - Use App Router (`src/app/`) instead of Pages Router',
    '`src/utils/**` - Use `src/lib/` for consistency',
    '`src/helpers/**` - Use `src/lib/` for consistency',
    '`src/components/[Feature]*.tsx` - Use `src/app/[feature]/` for feature-specific components'
  ];

  const checklistItems = [
    '**Check if the file is feature-specific** → Use `src/app/[feature]/`',
    '**Check if it\'s business logic** → Use `src/lib/`',
    '**Check if it\'s truly shared** → Only then use `src/components/`',
    '**Check if it\'s an API route** → Use `src/app/api/`'
  ];

  const examples: ExampleSection = {
    good: [
      'src/app/goals/GoalsList.tsx - Feature-specific component',
      'src/app/goals/GoalsDetailModal.tsx - Feature-specific modal',
      'src/lib/database.ts - Database connection',
      'src/lib/queries/goalQueries.ts - Goal-related queries',
      'src/components/ui/Button.tsx - Truly shared UI component'
    ],
    bad: [
      'src/components/GoalsList.tsx - Should be in `src/app/goals/`',
      'src/utils/formatDate.ts - Should be `src/lib/formatDate.ts`',
      'src/pages/index.tsx - Should use App Router'
    ]
  };

  return `${generateHeader('Next.js 15 App Router')}

## Directory Structure

### Core Directories
${coreDirectories.map(dir => `- ${dir}`).join('\n')}

### File Placement Rules

${filePlacementRules.map(section => formatRuleSection(section)).join('\n\n')}

## Anti-Patterns (DO NOT USE)

${formatAntiPatterns(antiPatterns)}

## Before Adding/Moving Files

${checklistItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

## Examples

${formatExamples(examples)}

${generateEnforcementSection()}
`;
}

function generateFastAPIStructureRules(): string {
  const coreDirectories = [
    '`app/` - All application code',
    '`app/main.py` - FastAPI app instance and startup',
    '`app/api/` - API route handlers (routers)',
    '`app/models/` - Database models and Pydantic schemas',
    '`app/services/` - Business logic layer',
    '`app/core/` - Configuration, settings, security',
    '`app/db/` - Database connection and session management',
    '`app/crud/` - Database CRUD operations'
  ];

  const filePlacementRules = [
    {
      title: '1. Separation of Concerns',
      content: [
        'Routes: `app/api/[resource].py` - Handle HTTP requests/responses only',
        'Services: `app/services/[resource]_service.py` - Business logic',
        'CRUD: `app/crud/[resource].py` - Database operations',
        'Models: `app/models/[resource].py` - Data models'
      ]
    },
    {
      title: '2. Configuration',
      content: [
        'All config in `app/core/config.py` using Pydantic BaseSettings',
        'Security utilities in `app/core/security.py`',
        'Dependencies in `app/core/deps.py`'
      ]
    },
    {
      title: '3. Database',
      content: [
        'Connection management in `app/db/database.py`',
        'Session handling in `app/db/session.py`',
        'Models use SQLAlchemy or your chosen ORM'
      ]
    },
    {
      title: '4. API Routes',
      content: [
        'Each router handles one resource',
        'Group related endpoints in one file',
        'Use dependency injection for shared logic'
      ]
    }
  ];

  const antiPatterns = [
    '`app/utils/**` - Use `app/core/` or `app/services/`',
    '`app/helpers/**` - Use `app/core/` or `app/services/`',
    '`*.py` in root - Keep all code under `app/`',
    'Mixed concerns in routes - Separate routes, services, and data access'
  ];

  const checklistItems = [
    '**Is it a route handler?** → `app/api/`',
    '**Is it business logic?** → `app/services/`',
    '**Is it database access?** → `app/crud/`',
    '**Is it configuration?** → `app/core/`',
    '**Is it a data model?** → `app/models/`'
  ];

  const examples: ExampleSection = {
    good: [
      'app/api/users.py - User routes',
      'app/services/user_service.py - User business logic',
      'app/crud/user.py - User CRUD operations',
      'app/models/user.py - User models',
      'app/core/config.py - Application config'
    ],
    bad: [
      'app/utils/user_helper.py - Should be `app/services/user_service.py`',
      'user_routes.py in root - Should be `app/api/users.py`',
      'Business logic in route handlers - Should be in services'
    ]
  };

  return `${generateHeader('FastAPI')}

## Directory Structure

### Core Directories
${coreDirectories.map(dir => `- ${dir}`).join('\n')}

### File Placement Rules

${filePlacementRules.map(section => formatRuleSection(section)).join('\n\n')}

## Anti-Patterns (DO NOT USE)

${formatAntiPatterns(antiPatterns)}

## Before Adding/Moving Files

${checklistItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

## Examples

${formatExamples(examples)}

${generateEnforcementSection()}
`;
}
