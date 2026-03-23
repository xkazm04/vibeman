/**
 * KB Entry Templates by Domain Category + Pattern Type
 *
 * Pre-built templates that pre-fill pattern, rationale, code_example, and anti_pattern
 * fields with guided placeholders. Dramatically lowers the barrier for manual entry creation.
 */
import type { KnowledgeCategory, KnowledgePatternType, KnowledgeLayer } from './knowledge.types';
import { CATEGORY_TO_LAYER } from './knowledge.types';

export interface KBEntryTemplate {
  id: string;
  label: string;
  description: string;
  category: KnowledgeCategory;
  layer: KnowledgeLayer;
  pattern_type: KnowledgePatternType;
  title: string;
  pattern: string;
  rationale: string;
  code_example: string;
  anti_pattern: string;
  tags: string;
}

function t(
  id: string,
  label: string,
  description: string,
  category: KnowledgeCategory,
  pattern_type: KnowledgePatternType,
  fields: { title: string; pattern: string; rationale: string; code_example: string; anti_pattern: string; tags: string },
): KBEntryTemplate {
  return { id, label, description, category, layer: CATEGORY_TO_LAYER[category], pattern_type, ...fields };
}

// ---------------------------------------------------------------------------
// Templates organized by layer for easy browsing
// ---------------------------------------------------------------------------

export const KB_ENTRY_TEMPLATES: KBEntryTemplate[] = [

  // ── Frontend ────────────────────────────────────────────────────────────

  t('ui-best-practice', 'UI Best Practice', 'Recommended pattern for UI components', 'ui', 'best_practice', {
    title: '[Component/Pattern name] for [use case]',
    pattern: 'Use [component/approach] when building [specific UI scenario].\n\nKey principles:\n- [Principle 1]\n- [Principle 2]\n- [Principle 3]',
    rationale: 'This pattern ensures [consistency/performance/accessibility] because [reason]. Without it, [negative consequence].',
    code_example: '// Good: Using the recommended pattern\n<ComponentName prop={value}>\n  {children}\n</ComponentName>',
    anti_pattern: 'Don\'t use [alternative approach] because [reason]. This leads to [negative outcome].',
    tags: 'ui, component',
  }),

  t('ui-convention', 'UI Convention', 'Standard practice for UI development', 'ui', 'convention', {
    title: '[Convention name] in [context]',
    pattern: 'Always [do this] when [building/modifying UI]. This is the team standard for [area].\n\nRules:\n- [Rule 1]\n- [Rule 2]',
    rationale: 'Consistency across the codebase makes components predictable and maintainable.',
    code_example: '// Standard approach\nimport { Component } from \'@/components/shared\';\n\n// Use shared component instead of custom implementation',
    anti_pattern: 'Don\'t create one-off implementations when a shared component exists.',
    tags: 'ui, convention',
  }),

  t('ui-gotcha', 'UI Gotcha', 'Common pitfall in UI development', 'ui', 'gotcha', {
    title: '[Unexpected behavior] when [doing X]',
    pattern: 'When [specific scenario], [unexpected thing happens] because [root cause].\n\nWorkaround:\n- [Step 1]\n- [Step 2]',
    rationale: 'This catches developers off guard because [reason]. It typically manifests as [symptom].',
    code_example: '// This looks correct but fails:\n[problematic code]\n\n// Fix:\n[corrected code]',
    anti_pattern: 'Don\'t assume [common assumption] — it breaks when [condition].',
    tags: 'ui, gotcha, pitfall',
  }),

  t('state-best-practice', 'State Management Pattern', 'Recommended state management approach', 'state_management', 'best_practice', {
    title: '[Store/pattern name] for [data type]',
    pattern: 'Manage [type of state] using [approach/store pattern].\n\nWhen to use:\n- [Condition 1]\n- [Condition 2]\n\nWhen NOT to use:\n- [Condition where alternative is better]',
    rationale: 'This pattern prevents [common issue like stale state, unnecessary re-renders] and keeps state [predictable/minimal].',
    code_example: '// Store definition\nconst useMyStore = create<State>((set) => ({\n  data: null,\n  setData: (d) => set({ data: d }),\n}));',
    anti_pattern: 'Don\'t store [derived/server/transient] state in [global store]. Compute it instead.',
    tags: 'state, store',
  }),

  t('accessibility-convention', 'Accessibility Convention', 'A11y standard for interactive elements', 'accessibility', 'convention', {
    title: '[ARIA/focus/keyboard] pattern for [element type]',
    pattern: 'All [interactive elements] must include:\n- [ARIA attribute or role]\n- [Keyboard handler]\n- [Focus management detail]',
    rationale: 'Required for [WCAG level] compliance. Screen readers [specific behavior] without this.',
    code_example: '<button\n  role="[role]"\n  aria-label="[descriptive label]"\n  onKeyDown={handleKeyboard}\n>\n  {content}\n</button>',
    anti_pattern: 'Don\'t use div/span as interactive elements without role and tabIndex.',
    tags: 'a11y, accessibility, aria',
  }),

  // ── Backend ─────────────────────────────────────────────────────────────

  t('api-best-practice', 'API Best Practice', 'Recommended pattern for API routes', 'api', 'best_practice', {
    title: '[HTTP method] [endpoint pattern] for [operation]',
    pattern: 'When implementing [type of endpoint], follow this structure:\n\n1. Validate input [how]\n2. Perform operation [approach]\n3. Return response [format/status codes]',
    rationale: 'Consistent API design makes endpoints predictable for consumers and simplifies error handling.',
    code_example: 'export async function POST(req: Request) {\n  const body = await req.json();\n  // validate\n  // process\n  return NextResponse.json({ data }, { status: 201 });\n}',
    anti_pattern: 'Don\'t mix concerns (validation, business logic, response formatting) in a single function body.',
    tags: 'api, route, rest',
  }),

  t('api-gotcha', 'API Gotcha', 'Common API pitfall', 'api', 'gotcha', {
    title: '[Unexpected behavior] in [API context]',
    pattern: 'When [calling/handling API in scenario], [unexpected thing] happens because [root cause].\n\nThe fix:\n- [Specific solution]',
    rationale: 'This is easy to miss because [reason]. Symptoms include [error message, silent failure, data corruption].',
    code_example: '// Broken:\nawait fetch(\'/api/endpoint\'); // [why this fails]\n\n// Fixed:\nawait fetch(\'/api/endpoint\', { [fix] });',
    anti_pattern: 'Don\'t assume [common wrong assumption about the API behavior].',
    tags: 'api, gotcha',
  }),

  t('middleware-convention', 'Middleware Convention', 'Standard middleware pattern', 'middleware', 'convention', {
    title: '[Middleware name] for [purpose]',
    pattern: 'Apply [middleware type] to [which routes/handlers] using [composition approach].\n\nOrdering: This middleware runs [before/after] [other middleware] because [reason].',
    rationale: 'Consistent middleware ordering prevents [race conditions, auth bypasses, double processing].',
    code_example: '// Middleware composition\nexport function withAuth(handler: Handler) {\n  return async (req: Request) => {\n    // auth check\n    return handler(req);\n  };\n}',
    anti_pattern: 'Don\'t duplicate middleware logic inline in route handlers.',
    tags: 'middleware, composition',
  }),

  t('auth-best-practice', 'Auth Best Practice', 'Authentication/authorization pattern', 'auth', 'best_practice', {
    title: '[Auth mechanism] for [protected resource]',
    pattern: 'Protect [resource type] using [auth approach].\n\nFlow:\n1. [Verify token/session]\n2. [Check permissions/roles]\n3. [Handle unauthorized access]',
    rationale: 'Centralized auth prevents [bypass, inconsistent enforcement]. OWASP [reference] recommends this.',
    code_example: '// Auth guard\nconst session = await getSession(req);\nif (!session) {\n  return NextResponse.json({ error: \'Unauthorized\' }, { status: 401 });\n}',
    anti_pattern: 'Don\'t check auth at the end of a handler after side effects have already occurred.',
    tags: 'auth, security',
  }),

  t('validation-convention', 'Validation Convention', 'Input validation standard', 'validation', 'convention', {
    title: 'Validate [input type] at [boundary]',
    pattern: 'All [user input / external data] must be validated at [system boundary].\n\nSchema:\n- [Field]: [type, constraints]\n- [Field]: [type, constraints]',
    rationale: 'Validation at the boundary catches bad data before it enters business logic, preventing [corruption, injection, crashes].',
    code_example: '// Validate at API boundary\nconst { title, pattern } = body;\nif (!title?.trim() || !pattern?.trim()) {\n  return NextResponse.json({ error: \'Missing required fields\' }, { status: 400 });\n}',
    anti_pattern: 'Don\'t validate deep inside business logic — validate once at the entry point.',
    tags: 'validation, input, boundary',
  }),

  t('error-handling-best-practice', 'Error Handling Pattern', 'Structured error handling approach', 'error_handling', 'best_practice', {
    title: '[Error type] handling in [context]',
    pattern: 'Handle [error category] by:\n1. [Catch strategy]\n2. [Log with context]\n3. [User-facing response]\n4. [Recovery/retry if applicable]',
    rationale: 'Unhandled errors cause [crash, data loss, poor UX]. Structured handling ensures [graceful degradation].',
    code_example: 'try {\n  const result = await operation();\n  return result;\n} catch (err) {\n  console.error(\'[Context] Operation failed:\', err);\n  return { error: \'Operation failed\', fallback: defaultValue };\n}',
    anti_pattern: 'Don\'t swallow errors with empty catch blocks. Don\'t expose internal error details to users.',
    tags: 'error, handling, resilience',
  }),

  // ── Data ────────────────────────────────────────────────────────────────

  t('database-gotcha', 'Database Gotcha', 'Common database pitfall', 'database', 'gotcha', {
    title: '[Unexpected behavior] when [SQL/DB operation]',
    pattern: 'When executing [specific query or operation], [unexpected result] occurs because [root cause, e.g., implicit type coercion, NULL handling, transaction isolation].\n\nWorkaround:\n- [Specific fix]',
    rationale: 'This catches developers because [reason]. In production it manifests as [data corruption, silent wrong results, deadlock].',
    code_example: '-- Broken:\nSELECT * FROM entries WHERE field = NULL; -- returns 0 rows\n\n-- Fixed:\nSELECT * FROM entries WHERE field IS NULL;',
    anti_pattern: 'Don\'t assume [common wrong assumption about SQL/DB behavior].',
    tags: 'database, sql, gotcha',
  }),

  t('database-best-practice', 'Database Best Practice', 'Recommended database pattern', 'database', 'best_practice', {
    title: '[Pattern name] for [data access scenario]',
    pattern: 'When [reading/writing data], use [approach] to ensure [consistency/performance/safety].\n\nSteps:\n1. [Step 1]\n2. [Step 2]',
    rationale: 'This pattern prevents [N+1 queries, race conditions, data inconsistency] by [mechanism].',
    code_example: '// Repository pattern\nconst entries = db.prepare(\n  \'SELECT * FROM entries WHERE domain = ? ORDER BY confidence DESC\'\n).all(domain);',
    anti_pattern: 'Don\'t [query in a loop, skip transactions for multi-table writes, use string interpolation in SQL].',
    tags: 'database, repository',
  }),

  t('migrations-convention', 'Migration Convention', 'Database migration standard', 'migrations', 'convention', {
    title: '[Migration type] for [schema change]',
    pattern: 'When [adding column / creating table / modifying schema]:\n- New columns MUST be nullable or have defaults\n- Use addColumnIfNotExists() helper\n- Wrap in runOnce() migration tracker\n- Never drop/recreate tables',
    rationale: 'Existing data on other devices must not break. Migrations run once per device via tracking table.',
    code_example: 'export function m999_add_feature_column() {\n  return once(\'m999\', (db) => {\n    addColumnIfNotExists(db, \'table_name\', \'new_col\', \'TEXT DEFAULT NULL\');\n  });\n}',
    anti_pattern: 'Never use DROP TABLE + CREATE TABLE. Never add NOT NULL columns without defaults.',
    tags: 'migration, schema, database',
  }),

  t('queries-optimization', 'Query Optimization', 'Database query performance pattern', 'queries', 'optimization', {
    title: 'Optimize [query type] for [scenario]',
    pattern: 'When [querying pattern], apply [optimization technique] to reduce [time/memory/IO].\n\nBefore: [describe slow approach]\nAfter: [describe optimized approach]\n\nExpected improvement: [metric]',
    rationale: 'Without optimization, [query] takes [time] at [scale]. This matters because [user-facing latency, resource pressure].',
    code_example: '-- Add index for frequent lookups\nCREATE INDEX IF NOT EXISTS idx_entries_domain_confidence\n  ON entries (domain, confidence DESC);',
    anti_pattern: 'Don\'t add indexes blindly — each index slows writes. Profile before optimizing.',
    tags: 'query, performance, index',
  }),

  t('caching-best-practice', 'Caching Pattern', 'Cache strategy for data access', 'caching', 'best_practice', {
    title: '[Cache strategy] for [data type]',
    pattern: 'Cache [data type] using [strategy: TTL, stale-while-revalidate, write-through].\n\nInvalidation triggers:\n- [When to invalidate]\n- [What to invalidate]\n\nTTL: [duration and reasoning]',
    rationale: 'Reduces [DB load, API latency, compute cost] for [frequently accessed, rarely changing] data.',
    code_example: '// React Query with stale-while-revalidate\nconst { data } = useQuery({\n  queryKey: [\'entries\', domain],\n  queryFn: () => fetchEntries(domain),\n  staleTime: 5 * 60 * 1000, // 5 min\n});',
    anti_pattern: 'Don\'t cache [user-specific, frequently mutated] data without clear invalidation strategy.',
    tags: 'cache, performance, invalidation',
  }),

  // ── Infrastructure ──────────────────────────────────────────────────────

  t('monitoring-convention', 'Monitoring Convention', 'Observability standard', 'monitoring', 'convention', {
    title: '[Metric/log/trace] for [system component]',
    pattern: 'Instrument [component] with:\n- [Metric type]: [what it measures]\n- [Log level]: [when to emit]\n- [Alert threshold]: [when to page]',
    rationale: 'Without this observability, [failure mode] goes undetected for [duration], causing [impact].',
    code_example: 'console.info(`[${component}] Operation completed`, {\n  duration_ms: Date.now() - start,\n  result_count: results.length,\n});',
    anti_pattern: 'Don\'t log sensitive data (tokens, passwords). Don\'t alert on non-actionable events.',
    tags: 'monitoring, observability, logging',
  }),

  t('deployment-best-practice', 'Deployment Practice', 'Deployment safety pattern', 'deployment', 'best_practice', {
    title: '[Deployment pattern] for [change type]',
    pattern: 'When deploying [type of change], follow:\n1. [Pre-deploy check]\n2. [Deploy strategy: rolling, blue-green, canary]\n3. [Post-deploy verification]\n4. [Rollback criteria]',
    rationale: 'Safe deployment prevents [downtime, data loss, user impact] during releases.',
    code_example: '# Pre-deploy checklist\n- [ ] Migrations are backward compatible\n- [ ] Feature flags are in place\n- [ ] Monitoring dashboards are open\n- [ ] Rollback plan is documented',
    anti_pattern: 'Don\'t deploy schema changes and code changes in the same release without feature flags.',
    tags: 'deployment, release, safety',
  }),

  // ── Cross-Cutting ──────────────────────────────────────────────────────

  t('testing-best-practice', 'Testing Best Practice', 'Test strategy for reliable coverage', 'testing', 'best_practice', {
    title: '[Test type] strategy for [component/module]',
    pattern: 'Test [component] using [approach: unit, integration, E2E].\n\nCover:\n- [Happy path scenario]\n- [Edge case 1]\n- [Error scenario]\n\nMock: [what to mock and what to keep real]',
    rationale: 'This test strategy catches [category of bugs] that [other test types] miss.',
    code_example: 'describe(\'[module]\', () => {\n  it(\'should [expected behavior] when [condition]\', () => {\n    const result = doThing(input);\n    expect(result).toEqual(expected);\n  });\n});',
    anti_pattern: 'Don\'t test implementation details. Don\'t mock everything — integration points catch real bugs.',
    tags: 'testing, vitest, coverage',
  }),

  t('performance-optimization', 'Performance Optimization', 'Performance improvement technique', 'performance', 'optimization', {
    title: 'Optimize [operation] by [technique]',
    pattern: 'When [operation] is slow due to [root cause], apply [optimization].\n\nBefore: [current performance]\nAfter: [expected improvement]\n\nMeasurement: [how to verify the improvement]',
    rationale: 'This impacts [user experience, resource cost, throughput] at [scale threshold].',
    code_example: '// Before: O(n^2)\nfor (const a of list) {\n  for (const b of list) { /* ... */ }\n}\n\n// After: O(n) with Map\nconst lookup = new Map(list.map(x => [x.id, x]));\nfor (const a of list) {\n  const b = lookup.get(a.refId);\n}',
    anti_pattern: 'Don\'t optimize without profiling first. Premature optimization adds complexity.',
    tags: 'performance, optimization',
  }),

  t('architecture-convention', 'Architecture Convention', 'Architectural standard for the project', 'architecture', 'convention', {
    title: '[Architectural pattern] for [domain/layer]',
    pattern: 'Organize [type of code] using [pattern: repository, service, facade].\n\nBoundaries:\n- [Layer A] depends on [Layer B] but NOT vice versa\n- [Shared code] lives in [location]\n- [Feature code] lives in [location]',
    rationale: 'Clear architecture boundaries prevent [circular dependencies, coupling, maintenance burden].',
    code_example: '// Feature → Service → Repository layering\n// src/app/features/X/     → UI + hooks\n// src/lib/X/              → business logic\n// src/app/db/repositories/ → data access',
    anti_pattern: 'Don\'t import from features/ into lib/. Don\'t bypass the repository layer for direct DB access.',
    tags: 'architecture, layering, boundaries',
  }),

  t('security-anti-pattern', 'Security Anti-Pattern', 'Security vulnerability to avoid', 'security', 'anti_pattern', {
    title: '[Vulnerability type] via [attack vector]',
    pattern: 'AVOID: [specific insecure pattern]\n\nRisk: [what an attacker can do]\nSeverity: [Critical/High/Medium/Low]\n\nMitigation:\n- [Fix 1]\n- [Fix 2]',
    rationale: 'OWASP [category]. This vulnerability allows [impact] and has been exploited via [known vector].',
    code_example: '// VULNERABLE:\ndb.exec(`SELECT * FROM users WHERE name = \'${userInput}\'`);\n\n// SAFE:\ndb.prepare(\'SELECT * FROM users WHERE name = ?\').get(userInput);',
    anti_pattern: 'Never use string interpolation for SQL, HTML, or shell commands with user input.',
    tags: 'security, owasp, vulnerability',
  }),

  t('patterns-best-practice', 'Design Pattern', 'Reusable design pattern', 'patterns', 'best_practice', {
    title: '[Pattern name] for [problem type]',
    pattern: 'Apply [design pattern] when [problem conditions exist].\n\nStructure:\n- [Component 1]: [responsibility]\n- [Component 2]: [responsibility]\n\nWhen to use: [conditions]\nWhen NOT to use: [conditions]',
    rationale: 'This pattern solves [specific problem] while keeping [flexibility, testability, simplicity].',
    code_example: '// Pattern implementation\nclass [PatternComponent] {\n  constructor(private dependency: [Type]) {}\n  \n  execute() {\n    // [pattern logic]\n  }\n}',
    anti_pattern: 'Don\'t apply this pattern when [simpler approach] suffices. Over-abstraction is worse than duplication.',
    tags: 'design-pattern, architecture',
  }),
];

/** Lookup templates by category */
export function getTemplatesForCategory(category: KnowledgeCategory): KBEntryTemplate[] {
  return KB_ENTRY_TEMPLATES.filter(t => t.category === category);
}

/** Lookup templates by pattern type */
export function getTemplatesForPatternType(patternType: KnowledgePatternType): KBEntryTemplate[] {
  return KB_ENTRY_TEMPLATES.filter(t => t.pattern_type === patternType);
}

/** Lookup templates by category + pattern type */
export function getTemplatesForCategoryAndType(
  category: KnowledgeCategory,
  patternType: KnowledgePatternType,
): KBEntryTemplate[] {
  return KB_ENTRY_TEMPLATES.filter(t => t.category === category && t.pattern_type === patternType);
}

/** Get all templates grouped by layer for display */
export function getTemplatesGroupedByLayer(): Record<string, KBEntryTemplate[]> {
  const groups: Record<string, KBEntryTemplate[]> = {};
  for (const tmpl of KB_ENTRY_TEMPLATES) {
    const key = tmpl.layer;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tmpl);
  }
  return groups;
}
