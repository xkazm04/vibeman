# Template Mechanism Documentation

This document describes the template discovery and prompt generation system used for Claude Code CLI integration. The system enables dynamic research templates that can be discovered, configured with variables, and executed via CLI.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Template Source Project                      │
│  (e.g., res/src/templates/)                                         │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ research/    │  │ feed/        │  │ analysis/    │              │
│  │ ├─ debunk.ts │  │ ├─ news.ts   │  │ ├─ actor.ts  │              │
│  │ └─ invest.ts │  │ └─ market.ts │  │ └─ event.ts  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Scanner (ts-morph)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Vibeman (Control Plane)                      │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │ Template Scanner │───►│ SQLite Database  │                       │
│  │ (parser.ts)      │    │ discovered_      │                       │
│  └──────────────────┘    │ templates table  │                       │
│                          └────────┬─────────┘                       │
│                                   │                                  │
│  ┌──────────────────┐    ┌───────▼──────────┐                       │
│  │ Variable Form    │◄───│ Template List UI │                       │
│  │ (dynamic inputs) │    │ (by category)    │                       │
│  └────────┬─────────┘    └──────────────────┘                       │
│           │                                                          │
│           │ buildResearchPrompt()                                    │
│           ▼                                                          │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │ Prompt Generator │───►│ Claude Code CLI  │                       │
│  │ (promptGenerator)│    │ (execution)      │                       │
│  └──────────────────┘    └────────┬─────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ API Call (curl)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Target Project API                           │
│  (e.g., res/src/app/api/topics/create)                              │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │ POST /api/...    │───►│ Supabase         │                       │
│  │ (validation)     │    │ (persistence)    │                       │
│  └──────────────────┘    └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Template Configuration Structure

### TemplateConfig Interface

Templates are defined as TypeScript objects conforming to the `TemplateConfig` interface:

```typescript
interface TemplateConfig {
  // ---- Identity ----
  templateId: string;           // Unique identifier (e.g., 'news_feed')
  templateName: string;         // Display name (e.g., 'News Feed Discovery')
  description: string;          // Brief description for UI

  // ---- Search Phase Configuration ----
  searchIntro?: string;         // Main instructions (supports {{variables}})
  searchAngles?: SearchAngle[]; // Organized search focus areas
  searchDepthGuidance?: Record<string, string>; // quick/standard/deep guidance

  // ---- Extraction Phase Configuration ----
  extractionIntro?: string;     // Finding extraction instructions
  extractionGuidelines?: string; // Quality requirements
  analysisInstruction?: string;  // Per-finding analysis guidance
  findingTypes?: FindingType[]; // What to extract and how

  // ---- Ordering & Grouping ----
  priorityFindingTypes?: string[];
  groupingOrder?: string[];

  // ---- Perspectives ----
  perspectives?: string[];      // Analysis perspectives to apply

  // ---- Verification ----
  verificationConfig?: Record<string, string>;

  // ---- Resource Limits ----
  defaultMaxSearches?: number;

  // ---- Input Variables ----
  variables?: TemplateVariable[];
}

interface SearchAngle {
  name: string;
  items: string[];
}

interface FindingType {
  name: string;
  displayName: string;
  description: string;
  extractedDataSchema?: string;  // JSON schema for extracted data
  analysisFallback?: string;
}

interface TemplateVariable {
  name: string;           // Variable name for interpolation (e.g., 'query')
  label: string;          // Display label (e.g., 'Research Topic')
  type: 'text' | 'select';
  required?: boolean;
  default?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>; // For select type
}
```

### Example Template

```typescript
// src/templates/feed/news_feed.ts
import { TemplateConfig } from '../types';

export const newsFeedConfig: TemplateConfig = {
  templateId: 'news_feed',
  templateName: 'News Feed Discovery',
  description: 'Extract research-worthy claims from news sources.',

  searchIntro: `You are a research assistant specializing in extracting VERIFIABLE CLAIMS.

## Variables
- Query focus: {{query}}
- Source filter: {{source}}
- Time period: {{period}}

## Sources to Search
1. Twitter (site:twitter.com OR site:x.com)
2. BBC (site:bbc.com/news)
...`,

  searchAngles: [
    {
      name: 'FACTUAL CLAIMS TO VERIFY',
      items: [
        'What specific assertions are being made that can be fact-checked?',
        'What numerical claims are being reported?',
      ],
    },
  ],

  extractionIntro: `Extract VERIFIABLE CLAIMS from your search results.

## IMPORTANT: Save via API
\`\`\`bash
curl -X POST http://localhost:3001/api/topics/create \\
  -H "Content-Type: application/json" \\
  -d '{"topics": [...]}'
\`\`\``,

  findingTypes: [
    {
      name: 'research_topic',
      displayName: 'Research Topic',
      description: 'A verifiable claim extracted from news.',
      extractedDataSchema: '{"sourceSlug": "...", "title": "...", ...}',
    },
  ],

  extractionGuidelines: `## Required Fields
1. **title**: Original headline
2. **claim**: Verifiable claim extracted
3. **researchQuery**: Research question
...`,

  variables: [
    {
      name: 'query',
      label: 'Topic Focus',
      type: 'text',
      required: false,
      default: 'general',
      placeholder: 'e.g., AI regulation',
    },
    {
      name: 'source',
      label: 'Source Filter',
      type: 'select',
      default: 'all',
      options: [
        { value: 'all', label: 'All Sources' },
        { value: 'bbc', label: 'BBC' },
        // ...
      ],
    },
  ],
};

export default newsFeedConfig;
```

## Template Discovery System

### Scanner (scanner.ts)

The scanner finds template files in a project directory:

```typescript
// Key functions
export async function scanTemplateDirectory(
  projectPath: string
): Promise<ScanResult>

// Scans for:
// - src/templates/**/*.ts
// - Extracts category from folder path (e.g., 'feed', 'research')
// - Ignores index.ts, types.ts, and test files
```

### Parser (parser.ts)

The parser extracts template configurations using ts-morph:

```typescript
// Uses ts-morph to parse TypeScript AST
import { Project, SyntaxKind } from 'ts-morph';

export function parseTemplateFile(filePath: string): ParsedTemplate[] {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  // Find exported variable declarations
  // Extract TemplateConfig object properties
  // Return array of parsed templates
}
```

### Database Schema (SQLite)

```sql
CREATE TABLE discovered_templates (
  id TEXT PRIMARY KEY,
  template_id TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  config_json TEXT,           -- Raw TypeScript object literal
  category TEXT DEFAULT 'general',
  discovered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Repository Pattern

```typescript
// discovered-template.repository.ts
export class DiscoveredTemplateRepository {
  upsertTemplate(template: DiscoveredTemplateInput): UpsertResult
  findAll(): DbDiscoveredTemplate[]
  findByCategory(category: string): DbDiscoveredTemplate[]
  findByTemplateId(templateId: string): DbDiscoveredTemplate | null
  deleteByFilePath(filePath: string): number
}
```

## Prompt Generation

### Variable Interpolation

Variables in templates use `{{variableName}}` syntax:

```typescript
export function interpolateTemplate(
  content: string,
  values: Record<string, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}
```

### Config Extraction from TypeScript

Since `config_json` stores raw TypeScript (not JSON), we parse it with regex:

```typescript
function extractConfigFromTs(configText: string): Partial<TemplateConfig> {
  const config: Partial<TemplateConfig> = {};

  // Extract template literals
  const searchIntroMatch = configText.match(/searchIntro:\s*`([\s\S]*?)`/);
  if (searchIntroMatch) {
    config.searchIntro = searchIntroMatch[1];
  }

  // Extract arrays of objects
  const searchAnglesMatch = configText.match(/searchAngles:\s*\[([\s\S]*?)\n\s*\],/);
  // ... parse each angle object

  return config;
}
```

### Building the Final Prompt

```typescript
export function buildResearchPrompt(
  template: DbDiscoveredTemplate,
  query: string,
  variables?: Record<string, string>
): string {
  const config = extractConfigFromTs(template.config_json);
  const vars = { query, ...variables };

  const sections: string[] = [];

  // Header
  sections.push(`# ${template.template_name}`);

  // Description
  if (template.description) {
    sections.push(interpolateTemplate(template.description, vars));
  }

  // Main Instructions (searchIntro)
  if (config.searchIntro) {
    sections.push(interpolateTemplate(config.searchIntro, vars));
  }

  // Search Angles
  if (config.searchAngles) {
    sections.push('## Search Focus Areas');
    for (const angle of config.searchAngles) {
      sections.push(`### ${angle.name}`);
      for (const item of angle.items) {
        sections.push(`- ${interpolateTemplate(item, vars)}`);
      }
    }
  }

  // Extraction Instructions
  if (config.extractionIntro) {
    sections.push('## Extraction Instructions');
    sections.push(interpolateTemplate(config.extractionIntro, vars));
  }

  // ... more sections

  return sections.join('\n');
}
```

## UI Components

### TemplateVariableForm

Dynamic form that reads variables from template config:

```typescript
function extractVariablesFromTsConfig(configText: string): TemplateVariable[] {
  const variablesMatch = configText.match(/variables:\s*\[([\s\S]*?)\n\s*\]/);
  // Parse variable objects using regex
  // Return array of TemplateVariable
}

export function TemplateVariableForm({
  template,
  onGenerate,
  onPreview,
}: Props) {
  const { variables } = useMemo(() => {
    const vars = extractVariablesFromTsConfig(template.config_json);
    // Fallback to default query variable if none found
    return { variables: vars };
  }, [template]);

  // Render form inputs based on variable type
  // Handle validation
  // Call buildResearchPrompt on generate
}
```

## API Integration

### Target API Schema

Templates can instruct Claude Code to call APIs. Example schema:

```typescript
// POST /api/topics/create
interface CreateTopicsRequest {
  topics: Array<{
    sourceSlug: string;
    title: string;
    description?: string;
    sourceUrl?: string;
    signals?: ('breaking' | 'trending' | 'controversial')[];
    // Extended fields
    researchQuery?: string;
    suggestedTemplate?: string;
    claim?: string;
    sourceBias?: 'left' | 'center-left' | 'center' | 'center-right' | 'right';
    debunkable?: 1 | 2 | 3 | 4 | 5;
  }>;
}

interface CreateTopicsResponse {
  created: number;
  topics: ResearchTopic[];
  errors?: Array<{ index: number; error: string }>;
}
```

### Database Schema (Supabase)

```sql
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'globe',
  color TEXT NOT NULL DEFAULT '#666666',
  search_pattern TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE research_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES data_sources(id),
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  session_id UUID,
  signals TEXT[] NOT NULL DEFAULT '{}',
  research_query TEXT,
  suggested_template TEXT,
  claim TEXT,
  source_bias TEXT,
  debunkable SMALLINT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Folder Structure

### Template Source Project

```
src/
└── templates/
    ├── types/
    │   ├── index.ts          # Export all types
    │   └── config.ts         # TemplateConfig interface
    ├── research/             # Category: research
    │   ├── debunk_claim.ts
    │   ├── actor_investigation.ts
    │   └── index.ts
    ├── feed/                 # Category: feed
    │   ├── news_feed.ts
    │   └── index.ts
    └── index.ts              # Main exports
```

### Vibeman (Control Plane)

```
src/
├── lib/
│   └── template-discovery/
│       ├── scanner.ts        # Find template files
│       ├── parser.ts         # Parse with ts-morph
│       └── index.ts
├── app/
│   ├── db/
│   │   ├── repositories/
│   │   │   └── discovered-template.repository.ts
│   │   └── models/
│   │       └── types.ts      # DbDiscoveredTemplate
│   └── features/
│       └── Integrations/
│           └── sub_TemplateDiscovery/
│               ├── TemplateDiscoveryPanel.tsx
│               ├── TemplateVariableForm.tsx
│               └── lib/
│                   └── promptGenerator.ts
```

## Replication Checklist

To replicate this system in another project:

### 1. Template Source Setup
- [ ] Create `src/templates/types/config.ts` with TemplateConfig interface
- [ ] Create template folders by category (e.g., `research/`, `feed/`)
- [ ] Write template files exporting `TemplateConfig` objects
- [ ] Include `variables` array for dynamic inputs
- [ ] Include API call instructions in `extractionIntro`

### 2. Control Plane Setup
- [ ] Install `ts-morph` for TypeScript parsing
- [ ] Create scanner to find template files
- [ ] Create parser to extract configurations
- [ ] Set up SQLite table for discovered templates
- [ ] Create repository for CRUD operations
- [ ] Build UI components for template selection and variable input
- [ ] Create prompt generator with interpolation

### 3. Target API Setup
- [ ] Create API route for receiving results
- [ ] Define validation rules
- [ ] Set up database tables
- [ ] Handle the data schema defined in templates

### 4. Integration
- [ ] Connect template discovery to CLI execution
- [ ] Pass generated prompt to Claude Code
- [ ] Handle API responses and errors

## Key Design Decisions

1. **TypeScript over JSON**: Templates are TypeScript files, not JSON. This enables:
   - IDE support and type checking
   - Template literals for multi-line strings
   - Easy refactoring and imports

2. **Category from Folder**: Template category is derived from folder path, not config:
   - `src/templates/feed/news.ts` → category: `feed`
   - `src/templates/research/debunk.ts` → category: `research`

3. **Raw Config Storage**: Store raw TypeScript in `config_json`, parse at runtime:
   - Preserves original formatting
   - No lossy JSON conversion
   - Regex parsing handles template literals

4. **Variable Interpolation**: Simple `{{var}}` syntax:
   - Works in any string field
   - Supports nested content
   - Fallback to original if var not found

5. **API Instructions in Template**: Templates include curl examples:
   - Claude Code can execute directly
   - Self-documenting schema
   - Clear execution path
