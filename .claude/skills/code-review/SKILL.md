---
name: code-review
description: Review code for quality, security, and patterns. Scans changed files for bugs, OWASP vulnerabilities, SQLite injection, missing error handling, and anti-patterns specific to this Next.js + SQLite + Zustand stack.
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git show*), Bash(npx tsc*), Bash(npx eslint*)
argument-hint: [file-or-scope?]
---

# Code Review & Security Audit

Perform a combined code quality and security review on changed or specified files.

If `$ARGUMENTS` is provided, scope the review to that file, directory, or feature area. Otherwise, review all uncommitted changes.

## Steps

### 1. Identify scope

Determine what to review:
- If a file/directory argument is given, review those files
- Otherwise, run `git diff --name-only` and `git diff --cached --name-only` to find changed files
- If no changes exist, run `git diff --name-only HEAD~1` to review the last commit

Filter to relevant files: `.ts`, `.tsx`, `.js`, `.jsx`, `.sql`, `.json` (skip node_modules, dist, .next).

### 2. Read and analyze each file

For each changed file, read it fully and check for issues in these categories:

#### Code Quality
- Functions exceeding 50 lines
- Files exceeding 800 lines
- Nesting depth > 4 levels
- Unused imports or variables
- Missing TypeScript types (implicit `any`)
- Direct state mutation instead of immutable patterns (spread operator)
- `console.log` left in production code
- Hardcoded magic numbers without constants
- Duplicated logic that should be extracted

#### Security (OWASP Top 10 for this stack)
- **SQL Injection**: Raw string interpolation in `better-sqlite3` queries — must use parameterized `?` placeholders
- **XSS**: Unsanitized user input rendered with `dangerouslySetInnerHTML`
- **Secrets**: Hardcoded API keys, tokens, passwords, or connection strings
- **Path Traversal**: User-controlled file paths without validation
- **SSRF**: User-controlled URLs passed to `fetch()` without allowlist
- **Missing Auth**: API routes without authentication checks
- **Insecure Headers**: Missing CSRF protection, permissive CORS

#### Vibeman-Specific Patterns
- **Migration Safety**: New migrations must use `addColumnIfNotExists()`, never DROP/recreate tables, new columns must be nullable or have defaults
- **Migration Tracking**: New migrations must be wrapped in `once('mXXX', fn)` from `migration.utils.ts`
- **Database Access**: Must use `getDatabase()` from `@/app/db/connection`, not direct `new Database()`
- **Store Patterns**: Zustand stores with persist middleware must handle hydration
- **Conductor Pipeline**: v3 phases must follow PLAN → DISPATCH → REFLECT flow
- **MCP Tools**: Must validate inputs and handle errors gracefully
- **Type Narrowing Gotcha**: After `waitForResume()` inside narrowed blocks, use `(context.status as string)` assertion

### 3. Run static checks

Run these commands to supplement manual review:
```bash
npx tsc --noEmit 2>&1 | head -50
npx eslint --quiet <changed-files> 2>&1 | head -50
```

### 4. Present findings

Output a structured review report:

```markdown
# Code Review Report

## Summary
- **Files reviewed**: N
- **Issues found**: N (X critical, Y high, Z medium)
- **Security findings**: N

## Critical Issues
> Must fix before merge

### [CRITICAL] Issue title
- **File**: path/to/file.ts:42
- **Category**: Security / Code Quality / Pattern Violation
- **Description**: What's wrong and why it matters
- **Fix**: Concrete fix suggestion

## High Issues
> Should fix before merge

### [HIGH] Issue title
...

## Medium Issues
> Consider fixing

### [MEDIUM] Issue title
...

## Security Checklist
- [ ] No SQL injection (parameterized queries)
- [ ] No hardcoded secrets
- [ ] No XSS vectors
- [ ] API routes authenticated
- [ ] Migration safety rules followed
- [ ] No console.log in production code

## Positive Observations
List things done well — good patterns, clean architecture, proper error handling.
```

### 5. Offer to fix

After presenting the report, ask the user:
- **Auto-fix**: Should I fix all CRITICAL and HIGH issues now?
- **Explain**: Want me to explain any finding in more detail?
- **Re-review**: After fixes, want me to re-run the review?

## Severity Definitions

| Severity | Description | Action |
|----------|-------------|--------|
| CRITICAL | Security vulnerability, data loss risk, crash | Must fix |
| HIGH | Bug, logic error, missing validation | Should fix |
| MEDIUM | Code smell, pattern violation, maintainability | Consider fixing |
| LOW | Style, naming, minor improvements | Optional |

Only report issues with >80% confidence. Don't flag intentional patterns or documented exceptions.
