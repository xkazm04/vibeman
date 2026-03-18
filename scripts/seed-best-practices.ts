/**
 * Retrospective Best Practice Seeder
 *
 * Seeds the Brain knowledge library with best practices extracted from
 * historical Claude Code execution logs. Run via:
 *
 *   npx tsx scripts/seed-best-practices.ts [--dry-run]
 *
 * Calls POST /api/brain/insights/ingest with extracted practices.
 */

const VIBEMAN_URL = process.env.VIBEMAN_URL || 'http://localhost:3000';
const DRY_RUN = process.argv.includes('--dry-run');

// ─── personas-cloud project ──────────────────────────────────────────
const PERSONAS_CLOUD_PROJECT_ID = 'c6fd0474-19f1-4223-b6a9-752077c51d3d';

interface Practice {
  title: string;
  description: string;
  confidence: number;
  type?: string;
  category?: string;
}

const personasCloudPractices: Practice[] = [
  // ── Refactoring ──────────────────────────────────────────────────
  {
    title: 'Split monolithic modules via barrel re-exports',
    description:
      'When a module exceeds ~500 lines or mixes multiple domains, split into domain-scoped sub-modules (e.g., db/personas.ts, db/tools.ts, db/events.ts) with a barrel index.ts re-exporting all public functions. This preserves backward compatibility for existing `import * as db` consumers while improving internal organization and IDE navigation. Proven in personas-cloud db.ts split (738→9 modules, zero breaking changes).',
    confidence: 90,
    category: 'refactor',
  },
  {
    title: 'Inline single-callsite wrapper functions',
    description:
      'When a wrapper function has exactly one callsite and adds no logic beyond forwarding, inline the underlying call at the callsite and remove the wrapper. This reduces indirection, makes data flow explicit, and shrinks the public API surface. Example: computeNextTriggerAt() was a 1-line pass-through to computeNextTriggerAtFromParsed() with a single caller in createTrigger().',
    confidence: 85,
    category: 'refactor',
  },
  {
    title: 'Extract shared response helpers to avoid multi-location maintenance',
    description:
      'When response formatting logic (like json() helpers, error shapes, or status code mapping) is duplicated across multiple route handlers, extract into a shared utility module. This prevents drift between API endpoints and reduces the blast radius of format changes. Applied successfully when consolidating httpApi and oauthHttpHandlers response patterns.',
    confidence: 80,
    category: 'refactor',
  },
  {
    title: 'Type-safe row mappers via column metadata',
    description:
      'Use a declarative createRowMapper<T>() factory with column definitions (col name, bool coercion, default values) instead of manual row-to-object casting. This centralizes type mapping, eliminates per-query null-check boilerplate, and catches column name mismatches at compile time. Pattern: createRowMapper<Persona>({ id: { col: "id" }, enabled: { col: "enabled", bool: true } }).',
    confidence: 85,
    category: 'refactor',
  },

  // ── Performance ──────────────────────────────────────────────────
  {
    title: 'Cache prepared SQL statements by query string',
    description:
      'Implement a statement cache (Map<string, Statement>) in the database helper layer. Cache prepared statements keyed by the SQL string to avoid re-parsing on repeated queries. This is especially effective for CRUD operations called per-request. The cache should be invalidated when the database connection closes.',
    confidence: 90,
    category: 'performance',
  },
  {
    title: 'Add composite indexes for common filter combinations',
    description:
      'When query profiling reveals slow WHERE clauses filtering on multiple columns, add composite indexes matching the most frequent filter patterns. Profile first with EXPLAIN QUERY PLAN, then add targeted indexes. Avoid over-indexing — only add composites for queries that appear in hot paths (>100 calls/minute).',
    confidence: 80,
    category: 'performance',
  },
  {
    title: 'Combine retention aggregate and purge into single pass',
    description:
      'When a background job computes aggregate metrics AND purges old records from the same table, combine both operations into a single table scan. This halves I/O for large tables. Example: wrap-retention-aggregate-purge pattern computes metrics while identifying rows for deletion in one pass.',
    confidence: 75,
    category: 'performance',
  },

  // ── Security ─────────────────────────────────────────────────────
  {
    title: 'Use AES-256-GCM for sensitive data encryption',
    description:
      'Encrypt sensitive data (credentials, API keys, PII) with AES-256-GCM. Use PBKDF2 for master key derivation and HKDF for per-tenant envelope keys. Never store plaintext credentials. The crypto module should be a shared utility imported by all packages that handle sensitive data.',
    confidence: 90,
    category: 'security',
  },
  {
    title: 'Validate configuration at write time with Zod schemas',
    description:
      'Define Zod schemas for complex configuration objects (trigger configs, integration settings) and validate at write time in create/update functions, not at read time. This prevents invalid states from entering the database and gives clear error messages at the point of origin. Pattern: validateTriggerConfig(triggerType, config) throws on invalid config before INSERT.',
    confidence: 85,
    category: 'security',
  },
  {
    title: 'Scrub sensitive data from all external output',
    description:
      'Apply output scrubbing to all user-facing responses, execution logs, and error messages. Use a centralized scrubber module that strips credentials, PII, and internal system details. Apply by default — opt out explicitly when raw output is needed for debugging.',
    confidence: 85,
    category: 'security',
  },

  // ── Error Handling ───────────────────────────────────────────────
  {
    title: 'Prefer explicit null over undefined for database fields',
    description:
      'Use `?? null` (not `|| undefined`) for optional database fields. SQLite stores NULL natively but undefined becomes the string "undefined". Consistent null handling prevents type confusion and simplifies WHERE IS NULL queries. Pattern: const useCaseId = input.useCaseId ?? null.',
    confidence: 90,
    category: 'infrastructure',
  },
  {
    title: 'Fail fast with coercion functions for enum inputs',
    description:
      'Create coerce*() functions (e.g., coerceTriggerType()) that validate and coerce string inputs to enum values, throwing immediately on invalid input. This catches bad data at the API boundary before it reaches business logic or the database.',
    confidence: 80,
    category: 'infrastructure',
  },

  // ── Architecture ─────────────────────────────────────────────────
  {
    title: 'Use globalThis for singletons that must survive HMR',
    description:
      'In Next.js or similar HMR environments, use globalThis to store singletons (event bus, execution buffers, connection pools) that must survive hot-reload. Without this, each HMR cycle creates duplicate instances. Pattern: globalThis.__eventBus ??= new EventBus().',
    confidence: 90,
    category: 'infrastructure',
  },
  {
    title: 'Define explicit protocol types for message-based systems',
    description:
      'For WebSocket, event bus, or inter-process communication, define TypeScript interfaces for every message type (WorkerHello, ExecAssign, ExecComplete) and protocol constants (MANUAL_REVIEW_PROTOCOL, EVENT_ACTION_PROTOCOL). This enables compile-time validation of message shapes and makes the protocol self-documenting.',
    confidence: 85,
    category: 'infrastructure',
  },
  {
    title: 'Co-locate schema DDL with domain logic modules',
    description:
      'Place database schema definitions (CREATE TABLE, indexes) in the same directory or file as the domain CRUD functions that operate on those tables. This makes it easy to find the schema when working on business logic and ensures migrations stay in sync with code changes. Example: db/schema.ts with initDb(), initSystemDb(), initTenantDb().',
    confidence: 75,
    category: 'infrastructure',
  },

  // ── Testing/Verification ─────────────────────────────────────────
  {
    title: 'Run npx tsc --noEmit after every refactoring step',
    description:
      'After each atomic refactoring change, run `npx tsc --noEmit` to catch type errors immediately. This is a non-negotiable gate — never batch multiple refactoring steps without intermediate type checks. Filter output by modified filenames to distinguish new errors from pre-existing ones: npx tsc --noEmit --pretty false 2>&1 | grep "filename".',
    confidence: 95,
    category: 'infrastructure',
  },
];

async function ingestPractices(projectId: string, projectName: string, practices: Practice[]) {
  console.log(`\n=== Ingesting ${practices.length} best practices for ${projectName} ===`);
  console.log(`Project ID: ${projectId}`);
  console.log(`Dry run: ${DRY_RUN}\n`);

  if (DRY_RUN) {
    for (const p of practices) {
      console.log(`  [${p.category}] ${p.title} (confidence: ${p.confidence})`);
    }
    console.log(`\n  Would create ${practices.length} best_practice insights.`);
    return;
  }

  const response = await fetch(`${VIBEMAN_URL}/api/brain/insights/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      source: 'cli-log-retrospective-analysis',
      practices,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`  ERROR: ${response.status} - ${err}`);
    return;
  }

  const result = await response.json();
  console.log(`  Created: ${result.data.created} insights`);
  console.log(`  Skipped: ${result.data.skipped} (duplicates)`);
  console.log(`  Reflection ID: ${result.data.reflectionId}`);

  if (result.data.createdTitles?.length > 0) {
    console.log('\n  Created:');
    for (const t of result.data.createdTitles) {
      console.log(`    + ${t}`);
    }
  }

  if (result.data.skippedTitles?.length > 0) {
    console.log('\n  Skipped (already exist):');
    for (const t of result.data.skippedTitles) {
      console.log(`    ~ ${t}`);
    }
  }
}

async function main() {
  try {
    await ingestPractices(
      PERSONAS_CLOUD_PROJECT_ID,
      'personas-cloud',
      personasCloudPractices
    );

    console.log('\nDone.');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
