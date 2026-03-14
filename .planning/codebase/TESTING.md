# Testing Patterns

**Analysis Date:** 2026-03-14

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`
- Node environment (not jsdom or happy-dom)
- Single fork for sequential execution to prevent database conflicts

**Assertion Library:**
- Vitest's built-in `expect()` (no separate library needed)
- Methods: `toEqual()`, `toHaveProperty()`, `toHaveBeenCalledWith()`, `rejects.toThrow()`, etc.

**Run Commands:**
```bash
npm test                 # Run all tests (vitest run)
npm run test:watch      # Watch mode (not available yet - would use vitest --watch)
npm run test:coverage   # Coverage report (npm run test -- --coverage)
```

## Test File Organization

**Location:**
- Unit tests: `tests/unit/` directory (co-located with source)
- Integration tests: `tests/integration/` directory
- API route tests: `tests/api/` directory
- Setup utilities: `tests/setup/` directory
- Source component tests: alongside components as `*.test.ts` or `*.test.tsx`

**Naming:**
- Test files: `*.test.ts` or `*.test.tsx`
- Exact filename format: `component.test.tsx`, `useHook.test.ts`, `utility.test.ts`
- Vitest discovers: `src/**/*.test.ts`, `src/**/*.test.tsx`, `tests/**/*.test.ts` (configured in `vitest.config.ts`)

**Directory structure example:**
```
tests/
├── setup/
│   ├── global-setup.ts       # Runs once before all tests
│   ├── test-database.ts      # Test DB creation/cleanup
│   ├── mock-factories.ts     # Test data factories
│   └── api-test-utils.ts     # API testing helpers
├── api/
│   ├── conductor/pipeline.test.ts
│   ├── contexts/route.test.ts
│   └── ideas/route.test.ts
├── unit/
│   ├── lib/api-helpers/apiResponse.test.ts
│   ├── hooks/useAbortableFetch.test.ts
│   └── brain/insight-evidence-junction.test.ts
└── integration/
    ├── canvasState.test.ts
    └── brain-completion-cascade.test.ts
```

## Test Structure

**Suite organization pattern (from conductor pipeline test):**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';

// Setup: Database mocking
vi.mock('@/app/db/connection', () => ({
  getDatabase: () => testDb,
  closeDatabase: () => {},
}));

// Global lifecycle: runs once for entire test suite
beforeAll(() => {
  setupTestDatabase();
  console.log('Test database initialized');
});

afterAll(() => {
  cleanupTestDatabase();
  closeTestDatabase();
  console.log('Test database cleaned up');
});

// Per-test lifecycle
describe('Feature Name', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  it('should do something specific', () => {
    // Arrange
    const input = createTestProject();

    // Act
    const result = processInput(input);

    // Assert
    expect(result).toEqual({ success: true });
  });

  it('should handle error case', () => {
    expect(() => {
      throw new Error('Expected error');
    }).toThrow('Expected error');
  });
});
```

**Patterns:**
- Triple-A pattern: Arrange → Act → Assert
- Descriptive test names: `it('should handle error when projectId is missing', ...)`
- One assertion focus per test (prefer multiple specific tests over multiple assertions)
- Use `beforeEach`/`afterEach` for test isolation
- Use `beforeAll`/`afterAll` for expensive setup (once per suite)

## Mocking

**Framework:** Vitest's built-in `vi` module (from `vitest` package)

**Database mocking pattern:**
```typescript
import { vi } from 'vitest';

vi.mock('@/app/db/connection', () => ({
  getDatabase: () => testDb,      // Return real test DB
  closeDatabase: () => {},         // No-op in tests
}));
```

**Fetch mocking pattern:**
```typescript
let originalFetch: typeof global.fetch;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = vi.fn(() => Promise.resolve(new Response('OK')));
});

afterEach(() => {
  global.fetch = originalFetch;
});
```

**Function mocking pattern:**
```typescript
const mockFetch = vi.fn()
  .mockResolvedValueOnce(new Response(JSON.stringify({ data: 1 })))
  .mockResolvedValueOnce(new Response(JSON.stringify({ data: 2 })));

global.fetch = mockFetch;

// Later in test
expect(mockFetch).toHaveBeenCalledWith(
  '/api/test',
  expect.objectContaining({ signal: expect.any(AbortSignal) })
);
```

**Patterns:**
- Mock modules at top of file with `vi.mock()`
- Mock functions per-test with `vi.fn()`
- Clear mocks between tests: `vi.clearAllMocks()`
- Use `mockResolvedValue()` for async functions
- Use `mockImplementation()` for complex behaviors

**What to Mock:**
- External API calls (fetch, SDK calls)
- Database operations (unless testing database layer specifically)
- Complex computations (when focus is on orchestration logic)
- File system operations
- Time-dependent operations (use fake timers: `vi.useFakeTimers()`)

**What NOT to Mock:**
- Core business logic being tested
- Utility functions (test the real thing)
- Database when testing repository/schema layer
- Third-party libraries for compatibility verification

## Fixtures and Factories

**Test Data Pattern:**
```typescript
// From tests/setup/mock-factories.ts

// Factory function creates object with defaults
export function createTestProject(overrides: Partial<TestProject> = {}): TestProject {
  const now = getCurrentTimestamp();
  return {
    id: generateId('proj'),
    name: 'Test Project',
    path: '/test/project/path',
    description: 'A test project for unit tests',
    created_at: now,
    updated_at: now,
    ...overrides,  // Merge custom overrides
  };
}

// Usage in test
const project = createTestProject({ name: 'Custom Project' });
const defaultProject = createTestProject();  // Full defaults
```

**Location:**
- `tests/setup/mock-factories.ts` - contains all test data factories
- Each table has factory: `createTestGoal()`, `createTestContext()`, `createTestIdea()`, etc.
- Each factory has companion insert: `insertTestGoal(db, goal)`

**Database insertion pattern:**
```typescript
import { insertTestProject, createTestProject } from '@tests/setup/mock-factories';

describe('Project operations', () => {
  it('should fetch project', () => {
    const project = createTestProject({ name: 'MyProject' });
    insertTestProject(testDb, project);

    const fetched = projectRepository.findById(project.id);
    expect(fetched.name).toBe('MyProject');
  });
});
```

## Coverage

**Requirements:** No enforced minimum (coverage not in CI pipeline)

**View Coverage:**
```bash
npm run test -- --coverage
```

**Coverage report generation:**
- Provider: `@vitest/coverage-v8`
- Generates HTML report (location varies by config)

**Coverage philosophy:**
- Focus on critical paths (database operations, API handlers, business logic)
- Integration tests cover end-to-end flows
- Unit tests cover utilities and individual functions
- Skip testing node_modules, generated code, and trivial getters/setters

## Test Types

**Unit Tests:**
- Scope: Single function or small module
- Examples: `tests/unit/lib/api-helpers/apiResponse.test.ts`, `tests/unit/hooks/useAbortableFetch.test.ts`
- Approach: Isolated with mocked dependencies
- Database: Usually mocked (unless testing repository methods)
- Location: `tests/unit/`

**Integration Tests:**
- Scope: Multiple components working together
- Examples: `tests/integration/brain-completion-cascade.test.ts`, `tests/integration/canvasState.test.ts`
- Approach: Use real services, mock only external APIs
- Database: Real test database (via `vi.mock('@/app/db/connection')`)
- Location: `tests/integration/`

**API/Route Tests:**
- Scope: Complete API endpoint request → response
- Examples: `tests/api/conductor/pipeline.test.ts`, `tests/api/contexts/route.test.ts`
- Approach: Test full handler, mock external services
- Database: Real test database
- Location: `tests/api/{feature}/`

**E2E Tests:**
- Not currently in use (no Playwright/Cypress configured)
- Would use `playwright-core` (installed but not set up for E2E)

## Common Patterns

**Async Testing:**
```typescript
it('should load data', async () => {
  const response = await buildSuccessResponse({ data: 'test' });
  const json = await response.json();

  expect(json).toHaveProperty('success', true);
  expect(json).toHaveProperty('data');
});

it('should reject with error', async () => {
  const promise = fetch('/api/test', { signal: controller.signal });
  controller.abort();

  await expect(promise).rejects.toThrow('Aborted');
});
```

**Error Testing:**
```typescript
it('should build error response from string', async () => {
  const response = buildErrorResponse('Not found', { status: 404 });
  const json = await response.json();

  expect(json).toHaveProperty('success', false);
  expect(json).toHaveProperty('error', 'Not found');
  expect(response.status).toBe(404);
});

it('should build error response from Error object', async () => {
  const error = new Error('Database connection failed');
  const response = buildErrorResponse(error);
  const json = await response.json();

  expect(json.error).toBe('Database connection failed');
});
```

**Testing state/stores:**
```typescript
// Usually requires @testing-library/react for real React hooks
// For Zustand stores, test the state logic directly

const state = useThemeStore.getState();
expect(state.theme).toBe('purple');

useThemeStore.setState({ theme: 'cyan' });
const updated = useThemeStore.getState();
expect(updated.theme).toBe('cyan');
```

**Testing database operations:**
```typescript
it('should insert and retrieve project', () => {
  const project = createTestProject();
  insertTestProject(testDb, project);

  const stmt = testDb.prepare('SELECT * FROM projects WHERE id = ?');
  const retrieved = stmt.get(project.id);

  expect(retrieved.name).toBe(project.name);
  expect(retrieved.path).toBe(project.path);
});
```

**Testing with transactions (isolation):**
```typescript
import { withTestTransaction } from '@tests/setup/test-database';

it('should isolate changes', () => {
  withTestTransaction((db) => {
    const project = createTestProject();
    insertTestProject(db, project);

    // All changes rolled back after function returns
    const count = db.prepare('SELECT COUNT(*) as cnt FROM projects').get();
    expect(count.cnt).toBe(1);
  });

  // After test, changes are rolled back
});
```

## Test Database Setup

**Configuration:**
- Path: `database/test.db` (separate from `database/main.db`)
- Mode: WAL (Write-Ahead Logging) for concurrent access
- Lifecycle: Created before tests, cleaned after

**Global setup (`tests/setup/global-setup.ts`):**
```typescript
beforeAll(() => {
  // Delete any existing test database
  deleteTestDatabase();
  // Initialize fresh schema
  setupTestDatabase();
  console.log('Test database initialized');
});

afterAll(() => {
  cleanupTestDatabase();
  closeTestDatabase();
  console.log('Test database cleaned up');
});
```

**Available setup functions from `tests/setup/test-database.ts`:**
- `setupTestDatabase()` - Create schema
- `getTestDatabase()` - Get or create connection
- `cleanupTestDatabase()` - Delete all data
- `closeTestDatabase()` - Close connection
- `deleteTestDatabase()` - Delete file completely
- `withTestTransaction(fn)` - Run within rollback-able transaction
- `createSavepoint(name)` - Nested transaction support
- `rollbackToSavepoint(name)` - Rollback to point
- `releaseSavepoint(name)` - Release savepoint

## Test Organization Best Practices

**File structure:**
- Group related tests in describe blocks: `describe('User operations', () => { ... })`
- One describe per main concept/component
- Organize tests from simplest (happy path) to complex (edge cases)

**Test data:**
- Use factories for all test data (never hardcode values)
- Prefer minimal overrides: `createTestProject({ name: 'Custom' })`
- Share setUp logic in `beforeEach()`, not repeated in each test

**Assertion clarity:**
```typescript
// Good: clear what's being tested
expect(json).toHaveProperty('success', true);
expect(json).toHaveProperty('error', 'Not found');

// Less clear: multiple properties tested at once
expect(json).toEqual({ success: true, error: 'Not found' });
```

**Mocking strategy:**
- Mock at module level for all tests in file
- Reset mocks in `beforeEach()`
- Override specific mock in individual tests if needed

## Running Tests Locally

```bash
# Run all tests once
npm test

# Run specific test file
npm test tests/api/conductor/pipeline.test.ts

# Run tests matching pattern
npm test -- --grep "should handle error"

# View coverage
npm test -- --coverage

# Debug (attach debugger)
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

## Debugging Tests

**Console output:**
- Add `console.log()` statements (will appear in test output)
- Logger methods work in tests: `logger.debug()`, `logger.info()`

**Breaking:**
- Use `debugger;` statement and run with `--inspect` flag
- Or use VS Code debugger with Vitest extension

**Viewing database state:**
- Add queries in test to inspect DB: `testDb.prepare('SELECT * FROM projects').all()`
- Use `withTestTransaction()` to inspect mid-operation

---

*Testing analysis: 2026-03-14*
