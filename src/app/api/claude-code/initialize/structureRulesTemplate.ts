/**
 * Structure Rules Template for Claude Code
 * This content will be added to .claude initialization to enforce structure rules
 */

export function generateStructureRules(projectType: 'nextjs' | 'fastapi' | 'other'): string {
  if (projectType === 'nextjs') {
    return generateNextJSStructureRules();
  } else if (projectType === 'fastapi') {
    return generateFastAPIStructureRules();
  }

  return ''; // No structure rules for 'other' project types
}

function generateNextJSStructureRules(): string {
  return `
# Project Structure Rules (Next.js 15 App Router)

**CRITICAL**: All code changes must follow these structure rules.

## Directory Structure

### Core Directories
- \`src/app/\` - Next.js App Router pages, layouts, and route handlers
- \`src/app/api/\` - API routes (route.ts files only)
- \`src/app/[feature]/\` - Feature-specific pages and components
- \`src/components/\` - Shared/reusable components ONLY
- \`src/lib/\` - Business logic, utilities, services, database
- \`src/stores/\` - Zustand state management
- \`src/hooks/\` - Custom React hooks
- \`src/types/\` - TypeScript type definitions
- \`src/lib/queries/\` - Database query functions organized by domain

### File Placement Rules

**1. Feature Co-location**
- Keep feature-specific components in their feature folders
- Example: \`src/app/goals/GoalsList.tsx\` NOT \`src/components/GoalsList.tsx\`
- Only move components to \`src/components/\` if used in 3+ features

**2. Business Logic**
- ALL utilities, helpers, and business logic go in \`src/lib/\`
- Database connections: \`src/lib/database.ts\`, \`src/lib/project_database.ts\`
- Managers/Services: \`src/lib/processManager.ts\`, \`src/lib/gitManager.ts\`
- Query functions: \`src/lib/queries/[domain]Queries.ts\`

**3. API Routes**
- Follow Next.js conventions: \`src/app/api/[resource]/route.ts\`
- Group related routes: \`src/app/api/contexts/route.ts\`, \`src/app/api/contexts/[id]/route.ts\`

**4. State Management**
- Each store manages one domain: \`src/stores/activeProjectStore.ts\`
- Use Zustand for global state, React hooks for component state

## Anti-Patterns (DO NOT USE)

❌ \`src/pages/**\` - Use App Router (\`src/app/\`) instead of Pages Router
❌ \`src/utils/**\` - Use \`src/lib/\` for consistency
❌ \`src/helpers/**\` - Use \`src/lib/\` for consistency
❌ \`src/components/[Feature]*.tsx\` - Use \`src/app/[feature]/\` for feature-specific components

## Before Adding/Moving Files

1. **Check if the file is feature-specific** → Use \`src/app/[feature]/\`
2. **Check if it's business logic** → Use \`src/lib/\`
3. **Check if it's truly shared** → Only then use \`src/components/\`
4. **Check if it's an API route** → Use \`src/app/api/\`

## Examples

✅ Good:
- \`src/app/goals/GoalsList.tsx\` - Feature-specific component
- \`src/app/goals/GoalsDetailModal.tsx\` - Feature-specific modal
- \`src/lib/database.ts\` - Database connection
- \`src/lib/queries/goalQueries.ts\` - Goal-related queries
- \`src/components/ui/Button.tsx\` - Truly shared UI component

❌ Bad:
- \`src/components/GoalsList.tsx\` - Should be in \`src/app/goals/\`
- \`src/utils/formatDate.ts\` - Should be \`src/lib/formatDate.ts\`
- \`src/pages/index.tsx\` - Should use App Router

## Enforcement

Before creating or moving any file, verify it follows these rules. Use Structure Scan to detect violations.
`;
}

function generateFastAPIStructureRules(): string {
  return `
# Project Structure Rules (FastAPI)

**CRITICAL**: All code changes must follow these structure rules.

## Directory Structure

### Core Directories
- \`app/\` - All application code
- \`app/main.py\` - FastAPI app instance and startup
- \`app/api/\` - API route handlers (routers)
- \`app/models/\` - Database models and Pydantic schemas
- \`app/services/\` - Business logic layer
- \`app/core/\` - Configuration, settings, security
- \`app/db/\` - Database connection and session management
- \`app/crud/\` - Database CRUD operations

### File Placement Rules

**1. Separation of Concerns**
- Routes: \`app/api/[resource].py\` - Handle HTTP requests/responses only
- Services: \`app/services/[resource]_service.py\` - Business logic
- CRUD: \`app/crud/[resource].py\` - Database operations
- Models: \`app/models/[resource].py\` - Data models

**2. Configuration**
- All config in \`app/core/config.py\` using Pydantic BaseSettings
- Security utilities in \`app/core/security.py\`
- Dependencies in \`app/core/deps.py\`

**3. Database**
- Connection management in \`app/db/database.py\`
- Session handling in \`app/db/session.py\`
- Models use SQLAlchemy or your chosen ORM

**4. API Routes**
- Each router handles one resource
- Group related endpoints in one file
- Use dependency injection for shared logic

## Anti-Patterns (DO NOT USE)

❌ \`app/utils/**\` - Use \`app/core/\` or \`app/services/\`
❌ \`app/helpers/**\` - Use \`app/core/\` or \`app/services/\`
❌ \`*.py\` in root - Keep all code under \`app/\`
❌ Mixed concerns in routes - Separate routes, services, and data access

## Before Adding/Moving Files

1. **Is it a route handler?** → \`app/api/\`
2. **Is it business logic?** → \`app/services/\`
3. **Is it database access?** → \`app/crud/\`
4. **Is it configuration?** → \`app/core/\`
5. **Is it a data model?** → \`app/models/\`

## Examples

✅ Good:
- \`app/api/users.py\` - User routes
- \`app/services/user_service.py\` - User business logic
- \`app/crud/user.py\` - User CRUD operations
- \`app/models/user.py\` - User models
- \`app/core/config.py\` - Application config

❌ Bad:
- \`app/utils/user_helper.py\` - Should be \`app/services/user_service.py\`
- \`user_routes.py\` in root - Should be \`app/api/users.py\`
- Business logic in route handlers - Should be in services

## Enforcement

Before creating or moving any file, verify it follows these rules. Use Structure Scan to detect violations.
`;
}
