Execute this analysis immediately without asking questions.

# Cross-Project Pattern Scan

Analyze two codebases, extract best patterns AND anti-patterns from each, and propose mutual improvements.

## Parameters
- **Project A**: $1 (first argument — path to project A)
- **Project B**: $2 (second argument — path to project B)

If paths are not provided, ask the user for them before proceeding.

## Step 0: Query Existing KB State

Before scanning, check what the KB already knows to avoid duplicating entries:

```bash
curl -s http://localhost:3000/api/knowledge-base?action=stats
curl -s "http://localhost:3000/api/knowledge-base?action=query&limit=100" | head -c 3000
```

Note existing entry titles. Focus on NEW patterns and cross-project insights that don't overlap with what's already captured.

## Step 1: Detect Project Languages

For each project, examine package.json, Cargo.toml, go.mod, requirements.txt, pom.xml, or equivalent to determine the primary language.

**Valid language values**: `typescript`, `javascript`, `python`, `rust`, `go`, `java`, `csharp`, `universal`

Set the `language` field correctly on ALL entries:
- Use the project's actual language (e.g., `typescript` for Next.js/TS projects)
- Use `universal` ONLY for patterns that genuinely apply across any language

## Phase 1: Individual Analysis

For each project, scan across the **8 canonical domains** (use these EXACT names):
`ui`, `api`, `state_management`, `database`, `testing`, `performance`, `architecture`, `security`

Identify 10-15 patterns per project. Focus on what each project does **WELL** and what it does **POORLY**.

**Minimum 20% must be anti-patterns or gotchas** — these are the most valuable for cross-project learning because they warn the other project what NOT to copy.

## Phase 2: Cross-Pollination

Compare the pattern sets and identify:

1. **A's strengths missing in B**: Patterns well-executed in A that B lacks or does poorly
2. **B's strengths missing in A**: Patterns well-executed in B that A lacks or does poorly
3. **Shared strengths**: Patterns both do well (high-confidence universal patterns)
4. **Shared weaknesses**: Areas neither handles well (opportunities for both)

## Output

Write JSON to a temporary file to avoid bash quoting issues, then POST:

```bash
# Write payload to file
cat > /tmp/cross-project-scan.json << 'JSONEOF'
{ ... payload ... }
JSONEOF

# POST it
curl -X POST http://localhost:3000/api/knowledge-base/ingest \
  -H "Content-Type: application/json" \
  -d @/tmp/cross-project-scan.json
```

Determine project IDs by checking:
```bash
curl -s http://localhost:3000/api/projects | head -c 500
```

### Payload Structure

```json
{
  "source": "cross-project-scan",
  "projectId": "PROJECT_A_ID",
  "crossProjectId": "PROJECT_B_ID",
  "entries": [
    {
      "domain": "api",
      "title": "Pattern name (3-8 words)",
      "description": "2-4 sentences. WHY this is good/bad. Consequences of following/ignoring.",
      "pattern_type": "best_practice|anti_pattern|convention|gotcha|optimization",
      "language": "typescript|universal",
      "codePattern": "Representative code snippet",
      "filePaths": ["path/in/project"],
      "tags": ["cross-cutting-tag1", "tag2"],
      "confidence": 75
    }
  ],
  "improvements": [
    {
      "targetProject": "PROJECT_A_ID",
      "sourceProject": "PROJECT_B_ID",
      "domain": "testing",
      "title": "Adopt mock factory pattern from Project B",
      "description": "Project B uses centralized mock factories that Project A lacks. This would reduce test setup boilerplate by ~40%.",
      "sourceFilePaths": ["projectB/tests/setup/factories.ts"],
      "targetFilePaths": ["projectA/tests/"],
      "effort": 3,
      "impact": 7,
      "tags": ["testing", "mock-factory"]
    }
  ]
}
```

## Entry Requirements

- `domain`: one of `ui`, `api`, `state_management`, `database`, `testing`, `performance`, `architecture`, `security`
- `title`: 3-8 word pattern name
- `description`: 2-4 sentences. For good patterns: WHY it works. For anti-patterns: what BREAKS and how to FIX
- `pattern_type`: `best_practice`, `convention`, `optimization`, `gotcha`, or `anti_pattern`
- `language`: project's primary language or `universal`
- `codePattern`: representative snippet (optional)
- `filePaths`: 1-3 file paths from the SOURCE project
- `tags`: 2-5 cross-cutting tags (don't duplicate domain name)
- `confidence`: 50-95

## Improvement Requirements

- `targetProject`: project ID that should adopt this improvement
- `sourceProject`: project ID where the pattern comes from
- `domain`: knowledge domain
- `title`: actionable title (verb + what to do)
- `description`: 2-3 sentences explaining what to do and expected benefit
- `sourceFilePaths`: specific files showing the pattern in source project
- `targetFilePaths`: specific files/directories in target project to improve
- `effort`: 1-10 (1=trivial, 10=major refactor)
- `impact`: 1-10 (1=minor polish, 10=critical improvement)
- `tags`: keyword tags

## Quality Criteria
- 10-15 knowledge entries per project (20-30 total)
- **Minimum 5 anti-patterns or gotchas** across both projects
- 8-15 improvement proposals (bidirectional — both A→B and B→A)
- Each improvement must reference SPECIFIC files in both projects
- Improvements must be ACTIONABLE (not vague "improve testing")
- Effort/impact scores must be realistic
- Tags should capture cross-cutting concerns NOT obvious from the domain
- Use canonical domain names only
- Set language correctly per project
