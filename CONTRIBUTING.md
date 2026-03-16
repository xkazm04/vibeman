# Contributing to Vibeman

Thank you for your interest in contributing to Vibeman! This guide covers everything you need to get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
  - [Logging](#logging)
- [Commit Conventions](#commit-conventions)
- [Running Tests](#running-tests)
- [Database Migrations](#database-migrations)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

---

## Development Setup

### Prerequisites

- **Node.js 20+** with npm
- **C/C++ build tools** for `better-sqlite3` native compilation (see [README.md](README.md#prerequisites) for platform-specific instructions)
- At least one AI CLI provider installed (Claude Code CLI recommended)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/vibeman.git
cd vibeman

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start the development server
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). The SQLite database is created automatically on first start.

### Useful Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm test             # Run all tests
npm run lint         # Run ESLint
npm run build:mcp    # Compile MCP server
```

---

## Development Workflow

1. **Create a branch** from `master` for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines below.

3. **Run tests and lint** before committing:
   ```bash
   npm test
   npm run lint
   npx tsc --noEmit    # Type-check without emitting
   ```

4. **Commit** with a descriptive message following our [commit conventions](#commit-conventions).

5. **Open a pull request** against `master`.

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

## Questions?

If you're unsure about anything, open a [Discussion](https://github.com/your-username/vibeman/discussions) or an issue. We're happy to help!
