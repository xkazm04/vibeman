# Architecture Patterns

**Domain:** Template Discovery & Research Integration
**Researched:** 2026-03-14

## Existing Architecture (Already Built)

The architecture is already implemented and follows good patterns. This documents what exists and where refinement is needed.

### Component Boundaries

| Component | Responsibility | Layer |
|-----------|---------------|-------|
| `src/lib/template-discovery/scanner.ts` | File discovery via glob patterns | Server-side library |
| `src/lib/template-discovery/parser.ts` | ts-morph AST parsing of TemplateConfig exports | Server-side library |
| `src/app/api/template-discovery/route.ts` | HTTP API: POST scan, GET list | Next.js API route |
| `src/app/api/template-discovery/[id]/route.ts` | HTTP API: single template CRUD | Next.js API route |
| `src/app/api/template-discovery/generate/route.ts` | HTTP API: generate .md file | Next.js API route |
| `src/app/db/repositories/discovered-template.repository.ts` | SQLite CRUD for discovered_templates | Repository pattern |
| `sub_TemplateDiscovery/lib/discoveryApi.ts` | Client-side fetch wrappers | Client library |
| `sub_TemplateDiscovery/lib/promptGenerator.ts` | Interpolate template variables into prompt | Client library |
| `sub_TemplateDiscovery/lib/fileGenerator.ts` | Generate .md output file content | Client library |
| `sub_TemplateDiscovery/*.tsx` | UI components | React components |

### Data Flow

```
User enters project path
       |
       v
POST /api/template-discovery { projectPath }
       |
       v
scanner.ts: glob("src/templates/*/*.ts")  -->  List of .ts file paths
       |
       v
parser.ts: ts-morph AST parse each file   -->  Extract TemplateConfig exports
       |                                         (templateId, templateName, description, configJson)
       v
repository: upsert to discovered_templates -->  Compare contentHash for create/update/unchanged
       |
       v
Response: { templates[], results { created, updated, unchanged } }
       |
       v
Client displays template cards
       |
       v
User selects template + fills query + picks granularity
       |
       v
promptGenerator.ts: interpolate variables into template prompt
       |
       v
POST /api/template-discovery/generate   -->  Write .md file to disk
       |
       v
Display CLI command: cd [res-path] && npx claude --prompt [file]
```

## Patterns to Follow

### Pattern 1: Server-Only Imports for File System Access

**What:** Mark modules that access the file system with `import 'server-only'`
**When:** Any module using fs, glob, ts-morph, or crypto
**Why:** Prevents accidental client-side bundling of Node.js APIs
**Example:** Already done correctly in scanner.ts and parser.ts

### Pattern 2: Repository Pattern for DB Access

**What:** All SQLite operations go through repository classes
**When:** Any DB read/write for discovered templates or generation history
**Why:** Consistent with the rest of Vibeman's DB layer
**Example:** `discoveredTemplateRepository.upsert()`, `.getAll()`, `.deleteStale()`

### Pattern 3: Content Hash for Change Detection

**What:** SHA-256 hash of file content stored with each template
**When:** Re-scanning a project
**Why:** Enables efficient "update only changed" behavior without diffing config objects
**Example:** Already implemented in parser.ts `computeContentHash()`

### Pattern 4: API Route as Orchestrator

**What:** The API route coordinates scanner -> parser -> repository, not the client
**When:** Scan operations
**Why:** Keeps server-side logic server-side; client only calls one endpoint
**Example:** POST handler in `route.ts` chains discoverTemplateFiles -> parseTemplateConfig -> upsert

## Anti-Patterns to Avoid

### Anti-Pattern 1: Dynamic Import of Foreign Code

**What:** Using `require()` or dynamic `import()` to load template config files
**Why bad:** Executes arbitrary code from external projects. Security risk and runtime dependency on foreign project's dependencies.
**Instead:** AST analysis (ts-morph) without execution. Read the source text, extract config via AST traversal and regex.

### Anti-Pattern 2: Client-Side File System Access

**What:** Attempting to read files from the client
**Why bad:** Next.js client components can't access the file system. Will fail at runtime.
**Instead:** All file operations go through API routes. Client calls POST/GET endpoints.

### Anti-Pattern 3: Shared ts-morph Project Across Requests

**What:** Creating a global ts-morph Project instance reused across API calls
**Why bad:** Memory leak risk. ts-morph keeps all added source files in memory. Across multiple scans, memory grows unbounded.
**Instead:** Create a new ts-morph `Project` per request (current approach). For optimization within a single scan, reuse one Project for all files, but discard it after the request completes.

### Anti-Pattern 4: Over-Engineering the Variable System

**What:** Building a generic variable interpolation system with types, validation, defaults
**Why bad:** The res project templates have a fixed structure. The only real variable is the query (research topic). Granularity maps to a known enum.
**Instead:** Keep it simple: query string + granularity dropdown. No need for a dynamic form builder.

## Refinement Opportunities

### 1. Single ts-morph Project Per Scan

Currently `parseTemplateConfig()` creates a new Project per file. The `parseTemplateConfigs()` batch function exists but is not used by the API route. The API route should use the batch function or create one Project and add all files to it.

**Impact:** Minor performance gain for 10 files. Would matter for 100+.

### 2. Prompt Generator Location

`promptGenerator.ts` is currently in the client-side `sub_TemplateDiscovery/lib/`. If it only does string interpolation (no fs access), this is fine. But if generation involves writing files, that logic should move server-side.

### 3. Generation Output Path

The generate endpoint needs a clear strategy for where to write .md files. Options:
- Write to res project's expected input directory
- Write to a temp directory and show the path
- Write to Vibeman's own output directory

**Recommendation:** Write to a configurable output directory (default: res project path + `/research-requests/`). The CLI command then references this path.

## Sources

- Codebase analysis of `src/lib/template-discovery/` and API routes
- PROJECT.md architecture section
