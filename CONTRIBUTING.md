# Contributing to Vibeman

Thank you for your interest in contributing to Vibeman! This guide covers everything you need to get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Code Style Guidelines](#code-style-guidelines)
  - [Logging](#logging)
- [Commit Conventions](#commit-conventions)
- [Running Tests](#running-tests)
- [Database Migrations](#database-migrations)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Getting Help](#getting-help)

---

## Getting Started

### Fork and Clone

1. **Fork** the repository on GitHub by clicking the "Fork" button.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/vibeman.git
   cd vibeman
   ```
3. **Add the upstream remote** so you can pull future changes:
   ```bash
   git remote add upstream https://github.com/vibeman/vibeman.git
   ```
4. **Keep your fork up to date** before starting new work:
   ```bash
   git fetch upstream
   git checkout master
   git merge upstream/master
   ```

---

## Development Setup

### Prerequisites

- **Node.js 20+** with npm
- **C/C++ build tools** for `better-sqlite3` native compilation (see [README.md](README.md#prerequisites) for platform-specific instructions)
- At least one AI CLI provider installed (Claude Code CLI recommended)

### Environment Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local — at minimum, set one LLM provider API key (e.g. ANTHROPIC_API_KEY)

# Start the development server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). The SQLite database is created automatically on first start — no manual database setup required.

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for the complete environment variable reference.

### Useful Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm test             # Run all tests
npm run lint         # Run ESLint
npx tsc --noEmit     # Type-check without emitting
npm run build:mcp    # Compile MCP server
```

---

## Development Workflow

1. **Create a branch** from `master` for your work (see [naming conventions](#branch-naming-conventions)):
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the [code style guidelines](#code-style-guidelines) below.

3. **Run checks** before committing:
   ```bash
   npm test
   npm run lint
   npx tsc --noEmit
   ```

4. **Commit** with a descriptive message following our [commit conventions](#commit-conventions).

5. **Push** to your fork and **open a pull request** against `master`.

---

## Branch Naming Conventions

Use a descriptive prefix followed by a short kebab-case summary:

| Prefix | Use for |
|--------|---------|
| `feature/` | New features (`feature/voice-search`) |
| `fix/` | Bug fixes (`fix/duplicate-goal-creation`) |
| `refactor/` | Code restructuring (`refactor/extract-scan-utils`) |
| `docs/` | Documentation changes (`docs/api-reference`) |
| `test/` | Adding or fixing tests (`test/conductor-retries`) |
| `chore/` | Tooling, deps, CI (`chore/upgrade-vitest`) |

Keep branch names short and lowercase. Use the related issue number when applicable: `fix/123-null-project-path`.

---

## Code Style Guidelines

### TypeScript

- **Strict mode is enabled.** All code must pass `strict: true` TypeScript compilation.
- **No `any` types** unless absolutely necessary. Prefer `unknown` with type guards.
- Use the `@/*` path alias for imports (maps to `src/*`):
  ```typescript
  import { getDatabase } from '@/app/db/connection';
  import { useThemeStore } from '@/stores/themeStore';
  ```
- Prefer `interface` for object shapes, `type` for unions and intersections.
- Export types alongside their implementations, not from separate files.

### Type Conventions

Vibeman enforces strict TypeScript throughout the codebase. Follow these conventions when adding or modifying types:

**Where types live:**

| Kind | Location |
|------|----------|
| Database models (snake_case) | `src/app/db/models/types.ts` |
| Frontend domain types (camelCase) | `src/types/index.ts` |
| API request/response shapes | `src/types/api.ts` |
| Domain-specific API types | `src/lib/api-types/{domain}.ts` |
| Zod validation schemas | `src/lib/api/schemas/{domain}.ts` |
| Feature-local types | `src/app/features/{Feature}/lib/types.ts` |

**Rules:**

1. **No `any`** — use `unknown` with type guards instead. The only exception is third-party library interop where the upstream type is genuinely untyped.
2. **All exported functions must have explicit return types.** This prevents accidental API surface changes and improves IDE support.
   ```typescript
   // Good
   export function getGoals(projectId: string): Promise<DbGoal[]> { ... }
   // Bad
   export function getGoals(projectId: string) { ... }
   ```
3. **Prefer `interface` for object shapes, `type` for unions/intersections.**
   ```typescript
   interface GoalFilter { status?: string; projectId: string }
   type GoalStatus = 'open' | 'in_progress' | 'done' | 'rejected';
   ```
4. **Database types use `snake_case`; frontend types use `camelCase`.** Map between them at the API boundary (route handlers and query functions).
5. **API response types** — import from `@/types/api` for the standard envelope:
   ```typescript
   import type { ApiResponse } from '@/types/api';
   const data: ApiResponse<Goal[]> = await res.json();
   if (data.success) { /* data.data is Goal[] */ }
   ```
6. **Avoid type assertions (`as`)** unless narrowing from `unknown` after a runtime check. Never use `as any`.
7. **Mark unused callback parameters** with an underscore prefix (`_id`) rather than omitting them, to preserve the function signature contract.

### React Components

- Use **functional components** with hooks exclusively.
- Place components in the feature directory they belong to: `src/app/features/{Feature}/components/`.
- Co-locate feature-specific logic in `lib/` subdirectories within the feature folder.
- Use Zustand stores (in `src/stores/`) for cross-feature state. Use `useShallow` for selector optimization:
  ```typescript
  import { useShallow } from 'zustand/react/shallow';
  const { items, loading } = useMyStore(useShallow(s => ({ items: s.items, loading: s.loading })));
  ```

### API Routes

- API routes live in `src/app/api/{resource}/route.ts` (Next.js App Router convention).
- Return consistent response shapes:
  ```typescript
  // Success
  return NextResponse.json({ success: true, data: result });
  // Error
  return NextResponse.json({ success: false, error: 'Description' }, { status: 400 });
  ```
- Use Zod schemas for request validation where applicable.

### Input Validation & Sanitization

All API routes that accept user input **must** validate and sanitise before performing any file-system or database operations. The shared utilities live in `src/lib/validation/`:

| Module | Purpose |
|--------|---------|
| `inputValidator.ts` | Pure validators — return `null` on success or an error string on failure |
| `sanitizers.ts` | Sanitisers — strip dangerous characters, normalise paths, truncate strings |
| `@/lib/pathSecurity` | Low-level path traversal / containment checks (used internally by validators) |

**Validation rules available:**

| Validator | Checks |
|-----------|--------|
| `validateProjectPath` | Non-empty, absolute, no traversal, exists as a readable directory |
| `validateProjectType` | Must be `'nextjs'` or `'fastapi'` |
| `validateProjectId` | UUID v4 format |
| `validateRequirementName` | Filename-safe (alphanumeric, hyphens, underscores, dots; max 255 chars) |

**How to use in a route handler:**

```typescript
import { validate, validateProjectPath, validateProjectType } from '@/lib/validation/inputValidator';
import { sanitizePath } from '@/lib/validation/sanitizers';

// 1. Validate — throws ValidationError (400) on first failure
validate([
  { field: 'projectPath', value: body.projectPath, validator: validateProjectPath },
  { field: 'projectType', value: body.projectType, validator: validateProjectType },
]);

// 2. Sanitise — normalise paths before fs operations
const safePath = sanitizePath(body.projectPath);
```

**Rules:**
1. **Validate at the boundary** — every API route that reads `request.json()` must validate before acting.
2. **Sanitise paths** — always pass user-provided paths through `sanitizePath()` before any `fs` call.
3. **Sanitise display strings** — use `sanitizeString()` for user-provided names that will appear in logs or responses.
4. **Never trust array contents** — validate array fields are actually arrays and check individual items when they contain paths or IDs.

### Styling

- Use **Tailwind CSS** utility classes. Avoid inline styles.
- Use the theme system via `useThemeStore().getThemeColors()` for dynamic theming.
- Use `clsx` or `tailwind-merge` for conditional class composition.

### File Naming

- React components: `PascalCase.tsx` (e.g., `GoalModal.tsx`)
- Utilities and hooks: `camelCase.ts` (e.g., `usePolling.ts`)
- API routes: `route.ts` inside the appropriate directory
- Test files: `*.test.ts` or `*.test.tsx` alongside the source file
- Store files: `camelCaseStore.ts` (e.g., `themeStore.ts`)

### Logging

Vibeman uses a centralized logger (`src/lib/logger.ts`) for all server-side logging. **Never use `console.log`/`console.error` directly** — always use the logger.

#### Quick Start

```typescript
import { logger } from '@/lib/logger';

// Create a child logger scoped to your module
const log = logger.child('my-feature');

// Log with structured context objects
log.info('Operation started', { projectId, mode: 'async' });
log.warn('Retrying after failure', { attempt: 2, maxRetries: 3 });
log.error('Operation failed', { error, projectId });
```

#### Log Levels

| Level | When to use |
|-------|-------------|
| `debug` | Granular details useful during development (loop iterations, intermediate values) |
| `info` | Key lifecycle events: operation start, completion, important decisions |
| `warn` | Recoverable issues: retries, fallbacks, degraded behavior |
| `error` | Failures requiring attention: unhandled errors, data corruption, external service failures |

Control via `LOG_LEVEL` environment variable (e.g., `LOG_LEVEL=debug`). Defaults: `debug` in development, `warn` in production.

#### Patterns to Follow

**Use child loggers** for module-scoped prefixes:
```typescript
const log = logger.child('conductor', { runId });
log.info('Phase started'); // [INFO] [conductor] Phase started {"runId":"abc"}
```

**Track duration** for operations that may be slow:
```typescript
const elapsed = logger.startTimer();
await doExpensiveWork();
const { durationMs } = elapsed();
log.info('Work completed', { durationMs });
```

**Log at these points in API routes / operations:**
1. Start — what was requested and key parameters
2. Key decisions — which branch/mode was chosen and why
3. Errors — what failed, with the error object as context
4. Completion — success/failure, duration, and result summary

#### Sensitive Data

The logger automatically redacts fields matching common sensitive key names (`password`, `token`, `secret`, `api_key`, `authorization`, `credential`, etc.) and values that look like API keys or long base64 strings.

**Rules:**
- Never log raw request bodies that may contain credentials
- Never log file contents or full database rows
- Use specific fields: log `{ userId, action }` not the entire user object
- When in doubt, log less — you can always add more logging later

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build process, tooling, dependencies |

### Scopes

Use the feature or system area as the scope:

- `conductor`, `task-runner`, `goals`, `ideas`, `context`, `brain`, `annette`
- `db`, `api`, `ui`, `store`, `lib`

### Examples

```
feat(conductor): add retry logic to dispatch phase
fix(goals): prevent duplicate status transitions
docs(readme): add Ollama setup instructions
refactor(db): extract migration utilities to shared module
test(ideas): add property-based tests for idea filtering
```

---

## Running Tests

### Test Framework

Vibeman uses **Vitest** with a SQLite test database. Tests run sequentially (single fork) to avoid database conflicts.

```bash
# Run all tests
npm test

# Run tests in watch mode
npx vitest

# Run a specific test file
npx vitest src/app/db/repositories/goal.repository.test.ts

# Run tests with coverage
npx vitest --coverage
```

### Writing Tests

- Place test files alongside source files as `*.test.ts` or in the `tests/` directory.
- Use mock factories from `tests/setup/` for consistent test data.
- The global setup (`tests/setup/global-setup.ts`) initializes a clean test database before each run.
- For database tests, the test DB uses the same migration system as production.

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
  beforeEach(() => {
    // Setup test state
  });

  it('should do the expected thing', () => {
    // Arrange
    // Act
    // Assert
    expect(result).toBe(expected);
  });
});
```

---

## Database Migrations

The migration system is critical to understand before making database changes. All migrations are in `src/app/db/migrations/`.

### Rules

1. **All new columns MUST be nullable or have defaults.** Existing data on other devices must not break.
2. **Never drop or recreate tables.** Use `addColumnIfNotExists()` from `migration.utils.ts`.
3. **Wrap migrations in `runOnce('mXXX', fn)`.** The `_migrations_applied` tracking table prevents re-runs.
4. **Never use destructive operations** (DROP TABLE, DELETE FROM) in migrations.

### Adding a Migration

1. Create a new file in `src/app/db/migrations/` following the existing numbering scheme.
2. Wrap the migration in `runOnce()`:
   ```typescript
   import { runOnce } from './migration.utils';

   export function m200_add_priority_to_goals(db: Database) {
     runOnce('m200', db, () => {
       db.exec(`ALTER TABLE goals ADD COLUMN priority INTEGER DEFAULT 0`);
     });
   }
   ```
3. Register the migration in `runMigrations()` in the migrations index file.
4. Test by running the app — migrations execute automatically on startup.

---

## Pull Request Process

1. **Ensure all checks pass:**
   - `npm test` — all tests pass
   - `npm run lint` — no linting errors
   - `npx tsc --noEmit` — no type errors

2. **Keep PRs focused.** One feature or fix per PR. If you find other issues, open separate PRs.

3. **Write a clear PR description:**
   - What the change does and why
   - Screenshots for UI changes
   - Any migration or environment changes needed

4. **Link related issues** using `Fixes #123` or `Closes #123` in the PR description.

5. **Be responsive to review feedback.** We aim to review PRs within a few days.

---

## Issue Guidelines

### Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version, browser)
- Error messages or screenshots

### Requesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md). Describe:
- The problem you're trying to solve
- Your proposed solution
- Alternative approaches you've considered

---

## Architecture

For a detailed overview of the codebase architecture, feature organization, and design patterns, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Getting Help

If you're unsure about anything or need guidance:

- **Questions about the codebase or how to contribute** — open a [Discussion](https://github.com/vibeman/vibeman/discussions)
- **Bug reports** — file an [issue](https://github.com/vibeman/vibeman/issues) using the Bug Report template
- **Feature ideas** — file an [issue](https://github.com/vibeman/vibeman/issues) using the Feature Request template
- **Architecture and design** — see [ARCHITECTURE.md](ARCHITECTURE.md) for a technical deep-dive

We're happy to help newcomers get oriented. No question is too small.
