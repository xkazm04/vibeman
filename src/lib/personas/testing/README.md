# Persona Design Test Framework

Automated QA framework that validates the persona design engine by running predefined use cases through it and evaluating the quality of generated configurations (prompt, tools, triggers, connectors).

## What it does

For each test case, the framework:
1. Creates mock persona/tools in memory (no DB reads needed)
2. Builds a design prompt using `buildDesignPrompt()` from the design engine
3. Spawns Claude CLI to generate a full persona design
4. Parses the result with `extractDesignResult()`
5. Runs **structural evaluation** (deterministic checks, scored 0-100)
6. Runs **semantic evaluation** (spawns 2nd Claude CLI for LLM-based scoring, 5 dimensions)
7. Saves results to SQLite (`persona_design_reviews` table)
8. Generates JSON + Markdown reports

## How to run from UI

1. Open the Personas module in the app
2. Click the **flask icon** ("Reviews") in the sidebar
3. Click **"Run New Review"** in the top-right corner
4. Confirm and watch streaming terminal output
5. After completion, the table refreshes with results

## How to run from API

```bash
# Start all 5 test cases
curl -X POST http://localhost:3002/api/personas/design-reviews

# Start specific test cases
curl -X POST http://localhost:3002/api/personas/design-reviews \
  -H "Content-Type: application/json" \
  -d '{"useCaseIds": ["gmail-smart-filter", "github-pr-reviewer"]}'

# Stream progress (SSE)
curl http://localhost:3002/api/personas/design-reviews/{testRunId}/stream

# Fetch latest reviews (one per test case)
curl http://localhost:3002/api/personas/design-reviews?latest=true

# Filter by connectors
curl http://localhost:3002/api/personas/design-reviews?connectors=gmail,slack

# Fetch specific run
curl http://localhost:3002/api/personas/design-reviews/{testRunId}

# Delete old reviews
curl -X DELETE http://localhost:3002/api/personas/design-reviews \
  -H "Content-Type: application/json" \
  -d '{"olderThan": "2026-01-01T00:00:00Z"}'
```

## Test cases

| ID | Name | Connectors | Triggers | Complexity |
|----|------|------------|----------|------------|
| `gmail-smart-filter` | Gmail Smart Filter | gmail, slack | polling | Medium |
| `github-pr-reviewer` | GitHub PR Reviewer | github, slack | webhook | High |
| `daily-calendar-digest` | Daily Calendar Digest | google_calendar | schedule | Medium |
| `webhook-data-processor` | Webhook Data Processor | http | webhook + event_sub | Medium |
| `multi-agent-coordinator` | Multi-Agent Coordinator | http | event_subscription | High |

## Adding new test cases

Add entries to `TEST_CASES` array in `testCases.ts`:

```typescript
{
  id: 'my-new-case',
  name: 'My New Case',
  description: 'What this case tests',
  instruction: 'Natural language instruction (same as DesignTab input)',
  mode: 'create',
  expectations: {
    structural: {
      minTools: 1,
      maxTools: 5,
      requiredConnectors: ['gmail'],
      requiredTriggerTypes: ['schedule'],
    },
    semantic: {
      identityKeywords: ['keyword1', 'keyword2'],
      behaviorRequirements: ['must handle X', 'should do Y'],
    },
  },
  mockContext: {
    personaName: 'My Agent',
    personaDescription: 'Agent description',
    availableTools: ['gmail_read', 'gmail_send', 'http_request'],
  },
}
```

## Evaluation criteria

### Structural (deterministic, 0-100)

| Check | Weight | Description |
|-------|--------|-------------|
| Tool count range | 15 | `suggested_tools` count within min/max |
| Required connectors | 20 | All expected connectors present in `suggested_connectors` |
| Required trigger types | 15 | All expected trigger types present in `suggested_triggers` |
| Notification channels | 5 | Present when expected |
| Event subscriptions | 5 | Present when expected |
| Prompt sections | 15 | All `structured_prompt` sections non-empty |
| Markdown length | 10 | `full_prompt_markdown` > 100 chars |
| Summary present | 5 | `summary` field is non-empty |
| Feasibility status | 10 | Matches expected feasibility level |

**Pass threshold: 80/100**

### Semantic (LLM-based, 0-100)

| Dimension | Description |
|-----------|-------------|
| Identity Clarity | How well the identity section defines who the persona is |
| Behavioral Coverage | How thoroughly instructions cover expected behaviors |
| Tool Usage Appropriateness | Whether tool guidance matches the use case |
| Error Handling | Coverage of failure scenarios and recovery |
| Example Quality | Quality and relevance of provided examples |

**Pass threshold: weighted average >= 70/100**

## Interpreting results

- **Score >= 80**: Good quality design output
- **Score 60-79**: Acceptable but may need prompt tuning
- **Score < 60**: Design engine likely not handling this case well
- **Stale (> 7 days)**: Amber warning; re-run recommended after engine changes
- **Expired (> 30 days)**: Red warning; results unreliable, must re-run

## File structure

```
src/lib/personas/testing/
  index.ts           — Barrel export
  testTypes.ts       — Type definitions (DesignTestCase, evaluations, DB model)
  testCases.ts       — 5 predefined use case definitions
  testRunner.ts      — Orchestrator (CLI spawning, DB save, SSE buffers)
  testEvaluator.ts   — Structural + semantic evaluation logic
  testReporter.ts    — JSON + Markdown report generation
  README.md          — This file
```

## Adding new connectors

When a new connector is added to the persona system:

1. Add relevant tool entries to `BUILTIN_TOOLS` in `testRunner.ts`
2. Create a new test case in `testCases.ts` exercising the connector
3. Add the connector to `CONNECTOR_PILLS` in `DesignReviewsPage.tsx` for UI filtering
4. Run a new review to establish baseline scores
