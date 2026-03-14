# Technology Stack

**Project:** Vibeman v2.0 - Template Discovery & Research Integration
**Researched:** 2026-03-14

## Recommended Stack

### Already Installed (No New Dependencies Needed)

This milestone requires **zero new npm dependencies**. Everything needed is already in the project.

### TypeScript Parsing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ts-morph | 27.0.2 (latest) | Parse TS files to extract `TemplateConfig` exports | Already installed. Wraps TypeScript compiler API with clean navigation. The parser in `src/lib/template-discovery/parser.ts` already uses it correctly -- creates a Project per file, extracts exported declarations by type, regex-extracts key fields from initializer text. No changes needed to the parsing approach. |

**Confidence:** HIGH -- ts-morph 27.0.2 is the latest release, already installed, already working in the codebase.

### File Discovery

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| glob | 13.0.6 | Find `src/templates/*/*.ts` files in external projects | Already installed. Used in `src/lib/template-discovery/scanner.ts`. Handles pattern matching with ignore lists. Fast enough for scanning a single project directory. |
| Node.js fs/promises | Built-in | Read file content for hashing | Standard, no dependency needed. |
| Node.js crypto | Built-in | SHA-256 content hashing for change detection | Already used in parser for `contentHash`. |

**Confidence:** HIGH -- glob 13 is current, already integrated.

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| better-sqlite3 | 12.6.2 | Store discovered templates, generation history | Already the project's DB. Repository pattern at `src/app/db/repositories/discovered-template.repository.ts` already exists with upsert, deleteStale, getBySourcePath methods. |

**Confidence:** HIGH -- existing infrastructure, no changes to DB layer needed.

### UI Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React 19 | 19.2.4 | Component rendering | Already installed. |
| framer-motion | 12.35.0 | Animations for template cards, transitions | Already installed and used in existing TemplateColumn, TemplateItem components. |
| lucide-react | 0.577.0 | Icons (FolderSearch, Search, FileText, etc.) | Already installed and used in existing components. |
| @uiw/react-md-editor | 4.0.11 | Prompt preview in PromptPreviewModal | Already installed, used via dynamic import for code splitting. |
| sonner | 2.0.7 | Toast notifications for scan results | Already installed via `toast` from messageStore. |
| tailwindcss | 4.2.1 | Styling | Already the project's styling system. |

**Confidence:** HIGH -- all existing UI libraries, no new dependencies.

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zustand | 5.0.11 | Template discovery state (selected template, scan status) | Already the project's state management. Follow existing patterns like `useClientProjectStore`. |

**Confidence:** HIGH -- established project pattern.

## What NOT to Install

| Rejected Option | Why Not |
|-----------------|---------|
| @swc/core for parsing | Overkill. ts-morph already works and provides type-aware AST. SWC is a compiler, not an analysis tool. |
| chokidar for file watching | Already installed but NOT needed for this feature. Templates are scanned on-demand, not watched. The PROJECT.md explicitly says "always use latest from source" with no versioning. |
| tsx or jiti for runtime TS import | Dangerous -- would execute foreign code. The current approach (AST analysis without execution) is correct and safer. |
| react-hook-form | Overkill for a single query input + granularity selector. Plain React state is sufficient. The existing `TemplateVariableForm.tsx` already works with useState. |
| zod for validation | The template config is parsed from AST, not user input. Regex extraction of templateId/templateName is adequate validation. |
| @tanstack/react-query for template fetching | Already installed but not needed here. Template discovery is a one-shot scan triggered by user action, not a polling/caching concern. Simple fetch + setState is appropriate (already implemented in `discoveryApi.ts`). |

## Performance Considerations

### ts-morph Memory

ts-morph creates an in-memory TypeScript project per parse call. The current implementation in `parser.ts` creates a new Project per file which is wasteful but safe. For 10 templates this is fine. If scaling to 100+ templates, refactor `parseTemplateConfigs()` to reuse a single Project instance (the function exists but isn't used by the API route).

**Recommendation:** Keep current approach for now. Add single-Project optimization only if scan takes >5 seconds.

### glob Performance

glob 13 with `nodir: true` and specific ignore patterns is fast for a targeted directory scan. No optimization needed.

## Installation

```bash
# No new dependencies needed
# Everything is already in package.json
```

## Existing Code Assets

The following code already exists and forms the foundation:

| File | Status | Notes |
|------|--------|-------|
| `src/lib/template-discovery/scanner.ts` | Complete | File discovery with glob |
| `src/lib/template-discovery/parser.ts` | Complete | ts-morph AST parsing |
| `src/lib/template-discovery/index.ts` | Complete | Public API exports |
| `src/app/api/template-discovery/route.ts` | Complete | POST scan, GET list |
| `src/app/api/template-discovery/[id]/route.ts` | Exists | Single template CRUD |
| `src/app/api/template-discovery/generate/route.ts` | Exists | Generation endpoint |
| `src/app/db/repositories/discovered-template.repository.ts` | Exists | DB operations |
| `sub_TemplateDiscovery/TemplateDiscoveryPanel.tsx` | Exists | Main panel component |
| `sub_TemplateDiscovery/TemplateVariableForm.tsx` | Exists | Variable input form |
| `sub_TemplateDiscovery/PromptPreviewModal.tsx` | Exists | Prompt preview |
| `sub_TemplateDiscovery/GenerationHistoryPanel.tsx` | Exists | History view |
| `sub_TemplateDiscovery/TemplateColumn.tsx` | Exists | Template list |
| `sub_TemplateDiscovery/TemplateItem.tsx` | Exists | Template card |
| `sub_TemplateDiscovery/lib/discoveryApi.ts` | Complete | Client-side API |
| `sub_TemplateDiscovery/lib/promptGenerator.ts` | Exists | Prompt building |
| `sub_TemplateDiscovery/lib/fileGenerator.ts` | Exists | .md file generation |

## Summary

**This is a UI/UX redesign milestone, not a technology adoption milestone.** The scanning, parsing, and storage infrastructure is already built. The work is:
1. Polish and test the existing scanning pipeline
2. Redesign the Integrations module UI layout
3. Improve the variable input and generation flow
4. Add execution hints (CLI command display + copy)

## Sources

- [ts-morph npm](https://www.npmjs.com/package/ts-morph) -- confirmed v27.0.2 is latest
- [ts-morph documentation](https://ts-morph.com/) -- API reference
- Codebase analysis of `src/lib/template-discovery/` and `sub_TemplateDiscovery/`
