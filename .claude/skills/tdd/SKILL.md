---
name: tdd
description: Test-driven development workflow. Write failing tests first, then implement minimal code to pass, then refactor. Uses Vitest with better-sqlite3 test database. Enforces RED → GREEN → IMPROVE cycle.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npx vitest*), Bash(npx tsc*)
argument-hint: <feature or function to implement>
---

# TDD Workflow — RED → GREEN → IMPROVE

Implement features using strict test-driven development with Vitest.

`$ARGUMENTS` describes the feature or function to implement.

## Workflow

### Phase 1: UNDERSTAND

Before writing anything, understand the context:

1. Read relevant existing code in the area being modified
2. Read existing tests in `tests/` to understand patterns and conventions
3. Check `tests/setup/mock-factories.ts` for available test helpers
4. Check `tests/setup/global-setup.ts` for test database configuration
5. Identify the test file location — mirror the source structure under `tests/`

**Test file naming**: `tests/unit/path/feature.test.ts` or `tests/integration/path/feature.test.ts`

### Phase 2: RED — Write Failing Tests

Write tests FIRST that describe the desired behavior:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('featureName', () => {
  it('should handle the primary use case', () => {
    // Arrange
    const input = createTestInput()

    // Act
    const result = featureFunction(input)

    // Assert
    expect(result).toEqual(expectedOutput)
  })

  it('should handle edge case', () => {
    // ...
  })

  it('should reject invalid input', () => {
    expect(() => featureFunction(null)).toThrow()
  })
})
```

**Test categories to cover:**
- Happy path (primary use case)
- Edge cases (empty input, boundary values)
- Error cases (invalid input, missing data)
- Integration points (database, API calls)

**Run tests to confirm they FAIL:**
```bash
npx vitest run --reporter=verbose <test-file>
```

Verify output shows failing tests (RED). If tests pass without implementation, the tests are wrong — they're not testing new behavior.

### Phase 3: GREEN — Minimal Implementation

Write the MINIMUM code needed to make tests pass:

- Don't optimize yet
- Don't add features not covered by tests
- Don't refactor existing code
- Just make the red tests turn green

**Run tests again:**
```bash
npx vitest run --reporter=verbose <test-file>
```

All tests must pass (GREEN). If any fail, fix the implementation (not the tests, unless the test has a bug).

### Phase 4: IMPROVE — Refactor

Now refactor with confidence:

- Extract common logic into helpers
- Improve naming and readability
- Remove duplication
- Optimize performance if needed
- Add TypeScript types if missing

**Run tests after each refactor step:**
```bash
npx vitest run --reporter=verbose <test-file>
```

Tests must stay GREEN throughout refactoring. If a test breaks, undo the refactor and try a different approach.

### Phase 5: VERIFY

Final verification:

1. **Type check**: `npx tsc --noEmit`
2. **Run all tests**: `npx vitest run` (ensure no regressions)
3. **Review coverage**: Check that new code is covered

## Vibeman-Specific Test Patterns

### Database Tests
```typescript
import { getDatabase } from '@/app/db/connection'

describe('database operation', () => {
  let db: ReturnType<typeof getDatabase>

  beforeEach(() => {
    db = getDatabase() // Uses test DB from global setup
  })

  it('should insert and retrieve', () => {
    db.prepare('INSERT INTO table (col) VALUES (?)').run('value')
    const row = db.prepare('SELECT * FROM table WHERE col = ?').get('value')
    expect(row).toBeDefined()
  })
})
```

### Mock Factories
```typescript
import { createMockProject, createMockContext } from '@tests/setup/mock-factories'

const project = createMockProject({ name: 'test-project' })
const context = createMockContext({ projectId: project.id })
```

### API Route Tests
```typescript
import { testApiRoute } from '@tests/setup/api-test-utils'

it('should return 200', async () => {
  const response = await testApiRoute('/api/endpoint', { method: 'GET' })
  expect(response.status).toBe(200)
})
```

## Output Format

After completing the cycle, present a summary:

```markdown
# TDD Report

## Feature: <description>

## Tests Written
- test-file.test.ts: N tests (N passing)

## Implementation
- source-file.ts: <what was implemented>

## Cycle Log
1. RED: Wrote N tests → all failing as expected
2. GREEN: Implemented <description> → all passing
3. IMPROVE: <refactoring done>
4. VERIFY: Types OK, no regressions

## Coverage
- New code: covered by N test cases
- Edge cases: <list>
```

## Rules

- NEVER write implementation before tests
- NEVER modify tests to make them pass (fix the implementation instead)
- NEVER skip the RED phase — if tests pass immediately, they're not testing new behavior
- ALWAYS run tests between phases to confirm state transitions
- Keep test files focused — one describe block per function/module
- Use descriptive test names that read as specifications
