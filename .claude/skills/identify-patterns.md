Execute this analysis immediately without asking questions.

# Identify Good Patterns & Anti-Patterns in Current Codebase

## Objective
Scan the current repository and identify well-executed patterns AND anti-patterns that should become entries in the Vibeman Knowledge Base.

## Step 0: Query Existing KB State

Before scanning, check what the KB already knows. Run:

```bash
curl -s http://localhost:3000/api/knowledge-base?action=stats
```

Review the domain counts and identify which domains have **few or zero** entries — prioritize those gaps. Then query existing entries to avoid duplicating what's already captured:

```bash
curl -s "http://localhost:3000/api/knowledge-base?action=query&limit=100" | head -c 2000
```

Note existing entry titles so you can focus on NEW patterns or higher-confidence replacements.

## Step 1: Detect Project Language

Examine the project's package.json, Cargo.toml, go.mod, requirements.txt, pom.xml, or equivalent to determine the primary language. Set the `language` field on ALL entries accordingly:

- **Valid values**: `typescript`, `javascript`, `python`, `rust`, `go`, `java`, `csharp`, `universal`
- Use `universal` ONLY for patterns that genuinely apply across languages (e.g., "never store secrets in git", "use cursor pagination over offset")
- If the project uses TypeScript, set `language: "typescript"` — NOT `universal`

## Step 2: Analysis Domains

Analyze the codebase across these **8 canonical domains** (use these EXACT names in the `domain` field):

1. **ui** — Component composition, memoization, prop patterns, render optimization, animation, accessibility
2. **api** — Route organization, validation, error response shapes, middleware, rate limiting
3. **state_management** — Store patterns, persistence, derived state, cross-store coordination
4. **database** — Migration safety, repository patterns, query optimization, transactions, indexes
5. **testing** — Mock strategies, test isolation, fixture factories, coverage patterns
6. **performance** — Lazy loading, caching, debouncing, virtual scrolling, bundle splitting
7. **architecture** — Module boundaries, feature organization, shared utilities, dependency direction
8. **security** — Input sanitization, auth patterns, CSRF/XSS prevention, secret management

For each domain, identify 2-5 noteworthy patterns.

## Step 3: Anti-Pattern Extraction (CRITICAL)

**At least 20% of entries MUST be anti-patterns or gotchas.** These are the most valuable entries because they prevent mistakes.

For each domain, actively look for:

- **Anti-patterns**: Code that works but is fragile, unmaintainable, or will cause bugs at scale
- **Gotchas**: Non-obvious traps where the code behaves unexpectedly or violates the principle of least surprise
- **Tech debt hotspots**: Areas where shortcuts were taken that future developers should be warned about
- **Inconsistencies**: Places where the codebase contradicts its own conventions

Anti-patterns are MORE valuable than best practices. A missed best practice is a missed optimization; a missed anti-pattern is a future bug.

Examples of anti-patterns to look for:
- Functions that silently swallow errors
- State mutations that bypass the store
- SQL queries built with string concatenation
- Components that re-render unnecessarily due to missing memoization
- Circular dependencies masked by lazy imports
- Missing null checks on optional DB columns
- Race conditions in concurrent operations

## How to Analyze

1. Read the project structure to understand the codebase layout
2. For each domain, identify 2-5 files or patterns — mix of good AND bad
3. Only flag patterns that are INTENTIONALLY good design or GENUINELY problematic
4. Prioritize patterns that are REUSABLE across projects
5. Include specific file paths as evidence
6. For anti-patterns: explain what can go wrong AND suggest the fix

## Output

After completing analysis, POST results to the Vibeman API. Determine the project ID by checking:

```bash
curl -s http://localhost:3000/api/projects | head -c 500
```

Then POST:

```bash
curl -X POST http://localhost:3000/api/knowledge-base/ingest \
  -H "Content-Type: application/json" \
  -d @/tmp/kb-patterns.json
```

Write the JSON payload to a file first to avoid bash quoting issues. The JSON structure:

```json
{
  "source": "identify-patterns",
  "projectId": "PROJECT_ID_HERE",
  "entries": [
    {
      "domain": "database",
      "title": "Short pattern name (3-8 words)",
      "description": "2-4 sentences explaining WHY this pattern is good/bad and HOW it works. Be specific about consequences.",
      "pattern_type": "best_practice",
      "language": "typescript",
      "codePattern": "Representative code snippet if applicable",
      "filePaths": ["src/path/to/file.ts"],
      "tags": ["keyword1", "keyword2"],
      "confidence": 80
    }
  ]
}
```

## Entry Requirements

For each entry provide:
- `domain`: one of `ui`, `api`, `state_management`, `database`, `testing`, `performance`, `architecture`, `security`
- `title`: 3-8 word pattern name
- `description`: 2-4 sentences. For good patterns: explain WHY this is good. For anti-patterns: explain what BREAKS and how to FIX it.
- `pattern_type`: `best_practice`, `convention`, `optimization`, `gotcha`, or `anti_pattern`
- `language`: one of `typescript`, `javascript`, `python`, `rust`, `go`, `java`, `csharp`, `universal`
- `codePattern`: representative code snippet (optional, escaped for JSON)
- `filePaths`: array of 1-3 file paths where this pattern appears
- `tags`: 2-5 keyword tags for cross-cutting searchability (avoid tags that duplicate the domain name)
- `confidence`: 50-95 (how confident this is a genuine reusable pattern)

## Quality Criteria
- Target 20-35 entries total across all domains
- **Minimum 5 anti-patterns or gotchas** (aim for 7-10)
- Every entry must reference specific files
- Explain the WHY (rationale), not just the WHAT
- Prefer patterns with evidence of working well (multiple usages, no reverts)
- Tags should capture cross-cutting concerns NOT obvious from the domain (e.g., "error-handling" on a database entry, "race-condition" on a state entry)
- Use canonical domain names only — do NOT invent new domain categories
- Set language correctly — avoid marking language-specific patterns as `universal`
