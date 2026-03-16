# Features

## Structure Scan

Validates a project's file and folder layout against enforced structure rules, detects anti-patterns, and generates actionable requirement files for automated refactoring.

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     Structure Scan Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Client Request                                              │
│  ┌──────────────┐                                            │
│  │ projectPath  │                                            │
│  │ projectType  │                                            │
│  │ projectId?   │                                            │
│  └──────┬───────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────┐             │
│  │            1. SCAN  (fileScanner.ts)        │             │
│  │                                             │             │
│  │  Walk file tree recursively                 │             │
│  │  Normalize paths (cross-OS: \ → /)          │             │
│  │  Apply ignore patterns (node_modules, etc)  │             │
│  │  Collect files + directories as ScannedItem │             │
│  └──────────────────┬──────────────────────────┘             │
│                     │                                        │
│                     ▼                                        │
│  ┌─────────────────────────────────────────────┐             │
│  │         2. ANALYZE  (violationDetector.ts)  │             │
│  │                                             │             │
│  │  a) Check for missing src/ folder           │             │
│  │  b) Match each item against directory rules │             │
│  │     - Find most specific rule for parent    │             │
│  │     - Check allowed folders/files lists     │             │
│  │     - Enforce strict mode where defined     │             │
│  │  c) Check enforced anti-patterns            │             │
│  │     - Match glob patterns (src/pages/**)    │             │
│  │     - Suggest correct locations             │             │
│  │                                             │             │
│  │  Output: StructureViolation[]               │             │
│  └──────────────────┬──────────────────────────┘             │
│                     │                                        │
│                     ▼                                        │
│  ┌─────────────────────────────────────────────┐             │
│  │    3. SAVE  (helpers.ts / requirementGen)   │             │
│  │                                             │             │
│  │  Batch violations (max 20 per file)         │             │
│  │  Generate markdown requirement files        │             │
│  │  Write to .claude/commands/                 │             │
│  │  Clean up old requirement files first       │             │
│  └─────────────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### API Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/structure-scan` | Legacy single-step: scan + generate requirements |
| `POST /api/structure-scan/analyze` | Step 1: scan and return violations for review |
| `POST /api/structure-scan/save` | Step 2: generate requirement files after user accepts |
| `POST /api/structure-scan/trigger` | Unified trigger for Blueprint integration |
| `GET /api/structure-scan/templates` | Retrieve available structure templates |

### Module Architecture

```
src/app/api/structure-scan/
├── route.ts                    # Legacy single-step endpoint
├── analyze/route.ts            # Two-step: analyze
├── save/route.ts               # Two-step: save
├── trigger/route.ts            # Blueprint integration
├── templates/route.ts          # Template listing
├── structureTemplates.ts       # Template & enforced structure definitions
├── violationRequirementTemplate.ts  # Requirement file formatting
└── lib/
    ├── fileScanner.ts          # File tree walking, path normalization, pattern matching
    ├── violationDetector.ts    # Rule matching, anti-pattern detection
    ├── helpers.ts              # Request validation, fallback scanning, requirement generation
    ├── scanOrchestrator.ts     # Coordinates analyze → save workflow
    ├── requirementGenerator.ts # Grouped requirement file generation (for orchestrator)
    └── eventLogger.ts          # Database event logging
```

### Violation Types

- **`misplaced`** — File or folder exists in the wrong directory (strict mode violation)
- **`anti-pattern`** — File matches a known anti-pattern (e.g. `src/pages/` in App Router projects)
- **`missing-structure`** — Required directory structure is absent (e.g. no `src/` folder)

### Cross-OS Path Handling

All paths are normalized to forward slashes (`/`) immediately upon scanning, ensuring consistent behavior on Windows, macOS, and Linux. The `normalizePath()` function in `fileScanner.ts` handles this conversion. Glob pattern matching via `minimatch` operates on the normalized paths.
