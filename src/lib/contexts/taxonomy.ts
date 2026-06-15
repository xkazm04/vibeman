/**
 * Context Taxonomy — canonical enums for categorizing contexts and groups.
 *
 * Single source of truth shared by the generation prompt, repositories, the
 * export, and the balance audit. Keep in sync with the prompt template at
 * src/lib/blueprint/prompts/templates/context-map-generator.md.
 */

/** Technical layer a context's code primarily belongs to. */
export const CONTEXT_CATEGORIES = ['ui', 'api', 'lib', 'data', 'test', 'config'] as const;
export type ContextCategory = (typeof CONTEXT_CATEGORIES)[number];

export const CONTEXT_CATEGORY_DESCRIPTIONS: Record<ContextCategory, string> = {
  ui: 'User-facing components, pages, views, styling',
  api: 'HTTP/RPC endpoints, route handlers, controllers',
  lib: 'Shared libraries, utilities, business logic, services',
  data: 'Database schema, repositories, models, stores, migrations',
  test: 'Test suites, fixtures, mocks',
  config: 'Build / tooling / runtime configuration',
};

/**
 * Business/architectural role of a context GROUP. This is the domain axis —
 * distinct from the existing architecture-layer `type` (pages|client|server|external).
 */
export const GROUP_DOMAINS = ['feature', 'infrastructure', 'shared', 'integration', 'data'] as const;
export type GroupDomain = (typeof GROUP_DOMAINS)[number];

export const GROUP_DOMAIN_DESCRIPTIONS: Record<GroupDomain, string> = {
  feature: 'A user-facing capability / product feature (full-stack vertical slice)',
  infrastructure: 'Cross-cutting platform: auth, logging, config, build, deploy, observability',
  shared: 'Reusable primitives consumed across features (UI kit, utils, shared types)',
  integration: 'External-service connectors / third-party APIs / webhooks',
  data: 'Persistence layer: schema, repositories, models, migrations',
};

/** How one context group relates to another. */
export const RELATIONSHIP_TYPES = ['calls', 'uses', 'depends_on', 'triggers'] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_TYPE_DESCRIPTIONS: Record<RelationshipType, string> = {
  calls: 'Source invokes target at runtime (HTTP/RPC/function call)',
  uses: 'Source imports/consumes target code or types',
  depends_on: 'Source cannot function without target (hard dependency)',
  triggers: 'Source emits an event/job the target reacts to',
};

export const DEFAULT_RELATIONSHIP_TYPE: RelationshipType = 'uses';

export function isContextCategory(v: unknown): v is ContextCategory {
  return typeof v === 'string' && (CONTEXT_CATEGORIES as readonly string[]).includes(v);
}
export function isGroupDomain(v: unknown): v is GroupDomain {
  return typeof v === 'string' && (GROUP_DOMAINS as readonly string[]).includes(v);
}
export function isRelationshipType(v: unknown): v is RelationshipType {
  return typeof v === 'string' && (RELATIONSHIP_TYPES as readonly string[]).includes(v);
}
