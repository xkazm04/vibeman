# Coding Conventions

**Analysis Date:** 2026-03-14

## Naming Patterns

**Files:**
- Camel case for component files: `ContextDetailInfo.tsx`, `useAbortableFetch.ts`
- Snake case for utility files: `api-helpers/apiResponse.ts`, `query-pattern-collector.ts`
- Index files use lowercase: `index.ts`, `index.tsx`
- Type-specific suffixes: `.types.ts` for type-only files, `.repository.ts` for data access, `.utils.ts` for utilities
- Factory functions use `create` prefix: `createTestProject()`, `createBaseAnalysisRepository()`

**Functions:**
- camelCase: `getDatabase()`, `buildSuccessResponse()`, `executeScoutStage()`
- Hooks prefixed with `use`: `useAbortableFetch`, `useConductorStatus`, `usePolling`
- Async functions clearly named: `fetchData()`, `executeStage()`, `processResults()`
- Getters/setters explicit: `getTestDatabase()`, `setLevel()`
- Factory functions: `createTestProject()`, `createTestGoal()`, `createBaseAgentLifecycle()`

**Variables:**
- camelCase: `testDb`, `projectId`, `isRunning`, `errorMessage`
- Constants UPPER_SNAKE_CASE: `TEST_DB_PATH`, `SENSITIVE_KEYS`, `PIPELINE_STAGES`
- Boolean prefixes: `is*`, `has*`, `should*`: `isInstrumented`, `hasContextFile`, `shouldRetry`
- Callback functions: `onProgress`, `onFlush`, `onAbort`
- Private module variables: `let instrumentedDb`, `let collectorWired`

**Types:**
- PascalCase: `LogContext`, `ApiResponse`, `PipelineStage`, `StageState`
- Interface prefix optional but common: `interface ContextDetailInfoProps`
- Type aliases lowercase or descriptive: `type LogLevel = 'debug' | 'info' | 'warn' | 'error'`
- Generic types: `T` for data, `TRecord` for database records

## Code Style

**Formatting:**
- Prettier is not explicitly configured (uses Next.js defaults)
- 2-space indentation (inferred from code samples)
- Single quotes for strings in code: `'test'`, `'error'`
- Double quotes for JSX attributes: `className="..."`, `message="Hello"`

**Linting:**
- ESLint with Next.js core web vitals config: `eslint-config-next/core-web-vitals`
- TypeScript strict mode enabled
- API routes cannot use `console.*` calls — must use `logger` from `@/lib/logger` instead
- ESLint rule in API routes: `no-console: ["error", { allow: [] }]`

**Linter Settings (eslint.config.mjs):**
- Extends: `nextCoreWebVitals`, `nextTypescript`
- Ignored: `node_modules/**`, `.next/**`, `out/**`, `build/**`
- Specific rule for API routes in `src/app/api/**/*.{ts,tsx}`: console calls disallowed

## Import Organization

**Order:**
1. React and external libraries: `import React from 'react'`, `import { describe, it, expect } from 'vitest'`
2. Third-party packages: `import Database from 'better-sqlite3'`, `import { motion } from 'framer-motion'`
3. Internal absolute imports using `@/*` alias: `import { getDatabase } from '@/app/db/connection'`
4. Internal relative imports (rare, prefer absolute): Avoid when possible
5. Type imports: `import type { LogContext } from '...'`, `import type { ScanType } from '@/app/features/Ideas/lib/scanTypes'`

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- Use absolute imports throughout codebase: `@/lib/logger`, `@/stores/clientProjectStore`, `@/app/db/connection`

**Example import block structure:**
```typescript
// External/React
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';

// Absolute imports (internal)
import { getDatabase } from '@/app/db/connection';
import type { PipelineRun, StageState } from './types';

// Type imports
import type { CLIProvider } from '@/lib/claude-terminal/types';
```

## Error Handling

**Patterns:**
- Try-catch blocks with specific error handling: `try { ... } catch (error) { logger.error(...) }`
- Error class distinction: `error instanceof Error ? error.message : 'Unknown error'`
- Ignore harmless errors silently: `try { db.exec(...) } catch { /* Table may not exist yet */ }`
- API errors use `buildErrorResponse(error)` helper from `@/lib/api-helpers/apiResponse`
- Destructure error properties safely: `const errorMessage = error instanceof Error ? error.message : error`

**Logger usage pattern:**
```typescript
import { logger } from '@/lib/logger';
logger.error('Operation failed', { projectId, context });
logger.debug('Processing started', { itemCount: 42 });
```

**API error responses:**
```typescript
// Import helper
import { buildErrorResponse, buildSuccessResponse } from '@/lib/api-helpers/apiResponse';

// Use in handlers
return buildErrorResponse('validation failed', { status: 400, meta: { field: 'email' } });
return buildSuccessResponse({ data: result }, { status: 201 });
```

**Sensitive redaction:**
Logger automatically redacts keys matching pattern: `password`, `secret`, `token`, `apikey`, `api_key`, `authorization`, `cookie`, `credential`, `private_key`, `access_token`, `refresh_token`, `client_secret` (case-insensitive)

## Logging

**Framework:** Custom `Logger` class in `@/lib/logger.ts` (not using external logging library)

**Log Levels:**
- `debug`: Development-only detailed diagnostics
- `info`: Informational messages (development only by default)
- `warn`: Warning conditions (all environments)
- `error`: Error conditions (all environments)

**Environment-based behavior:**
- Development: all levels enabled
- Production: only `warn` and `error` enabled

**Patterns:**
- Always use named logger instance: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`
- Include context object as second parameter: `logger.error('Failed to process', { userId, error })`
- API routes MUST NOT use `console.*` — use `logger` instead

**Log formatting (automatic):**
```
[ISO_TIMESTAMP] [LEVEL] message context_object
```

## Comments

**When to Comment:**
- Complex algorithms or non-obvious logic
- Workarounds for known bugs or limitations
- Important assumptions or invariants
- Section headers for logical groupings using `// ====...====`
- TODO/FIXME notes for deferred work

**JSDoc/TSDoc:**
- Document exported functions with doc comments
- Include `@example` blocks for complex functions
- Use `@deprecated` for old APIs
- Document parameters and return types in complex scenarios

**Pattern:**
```typescript
/**
 * Brief description of function
 *
 * Longer explanation if needed
 *
 * @example
 * const result = buildSuccessResponse({ data: 'test' });
 *
 * @param data The payload to wrap
 * @param options Response options
 * @returns NextResponse with standardized envelope
 */
export function buildSuccessResponse<T>(
  data: T,
  options: BuildResponseOptions<T> = {}
): NextResponse<ApiResponse<T>> {
  // Implementation
}
```

## Function Design

**Size:**
- Prefer functions under 50 lines
- Extract complex logic into smaller helper functions
- Split long methods into single-responsibility functions

**Parameters:**
- Use destructuring for objects: `function processTask({ id, title, status }: Task)`
- Optional parameters at end: `fn(required, optional?: string)`
- Use options objects for multiple booleans: `{ meta?: Record<string, unknown>, headers?: Record<string, string> }`

**Return Values:**
- Always specify explicit return types in TypeScript
- Use discriminated unions for success/error: `{ success: true, data: T } | { success: false, error: string }`
- Return early to reduce nesting (guard clauses)

**Error handling within functions:**
- Throw specific errors for exceptional conditions
- Use try-catch only when explicitly catching and handling
- Don't silently swallow errors unless intentional with comment

## Module Design

**Exports:**
- Named exports preferred for tree-shaking: `export function getDatabase()`, `export const logger`
- Single default export acceptable for components: `export default function ContextDetailInfo(...)`
- Type-only exports: `export type { ApiResponse }`, `export interface LogContext`

**Barrel Files:**
- Use `index.ts` to re-export related functionality
- Pattern in `src/types/index.ts`: `export { ... } from './ideaCategory'`, `export type { ... } from './...ts'`
- Keeps related exports organized at directory level

**Module responsibilities:**
- Single concern per file: database connection, logging, api helpers, etc.
- Avoid circular dependencies (check imports during review)
- Private symbols for internal-only state: `const IS_INSTRUMENTED = Symbol('...')`

## React/Component Patterns

**Component naming:** PascalCase for all components
- `export default function ContextDetailInfo({ context }: Props) { ... }`
- Props interfaces: `interface ContextDetailInfoProps`
- Suffixes: `.tsx` for React components

**Hooks:** Always prefixed with `use`
- Custom hooks exported from component directory or dedicated hooks folder
- Pattern: `export function usePolling(interval: number): State`

**Prop spreading:** Avoid spreading unknown props; be explicit
- DO: `<div className={clsx(...)} {...specificProps}>`
- DON'T: `<Component {...unknownProps}>`

## Database Patterns

**Connection:** Use `getDatabase()` from `@/app/db/connection`
- Returns `Database.Database` from better-sqlite3
- Single instance (cached/singleton pattern)

**Prepared statements:** Cached automatically by `statementCache`
- No manual caching needed; wrapper handles it
- Query instrumentation happens automatically for schema intelligence

**Type-safe queries:** Use repositories over raw SQL when possible
- Pattern: `ideaRepository.findById(id)`, `socialConfigRepository.upsert(config)`
- Repositories located in `src/app/db/repositories/`

## Zustand Store Patterns

**Store initialization:**
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

export const useThemeStore = create<State>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'purple',
        setTheme: (theme) => set({ theme }),
      }),
      { name: 'theme-storage', storage: createJSONStorage(...) }
    )
  )
);
```

**Usage:** `const theme = useThemeStore((s) => s.theme)`

## Test Utilities

**Mock factories in `tests/setup/mock-factories.ts`:**
- All test data factories prefixed `createTest*()`: `createTestProject()`, `createTestGoal()`
- Factories return objects with sensible defaults
- Overrides via spread: `createTestProject({ name: 'Custom' })`
- IDs generated with `generateId(prefix)`, timestamps with `getCurrentTimestamp()`

**Database helpers:**
- Insert helpers: `insertTestProject(db, project)`, `insertTestGoal(db, goal)`
- Each factory has companion insert function
- Test database separate: `database/test.db` (never `database/main.db`)

---

*Convention analysis: 2026-03-14*
