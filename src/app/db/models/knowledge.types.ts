/**
 * Knowledge Base Types
 * Cross-project knowledge entries organized by Language > Layer > Category hierarchy
 */

// --- Layer (second level of hierarchy) ---

export type KnowledgeLayer = 'frontend' | 'backend' | 'data' | 'infrastructure' | 'cross_cutting';

export const KNOWLEDGE_LAYERS: KnowledgeLayer[] = ['frontend', 'backend', 'data', 'infrastructure', 'cross_cutting'];

export const KNOWLEDGE_LAYER_LABELS: Record<KnowledgeLayer, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  data: 'Data',
  infrastructure: 'Infrastructure',
  cross_cutting: 'Cross-Cutting',
};

// --- Category (third level, expanded from old "domain") ---

export type KnowledgeCategory =
  // Legacy domains (kept for backward compat)
  | 'ui' | 'api' | 'state_management' | 'database' | 'testing' | 'performance' | 'architecture' | 'security'
  // New frontend categories
  | 'styling' | 'accessibility' | 'routing'
  // New backend categories
  | 'middleware' | 'auth' | 'validation' | 'error_handling'
  // New data categories
  | 'caching' | 'migrations' | 'queries' | 'orm'
  // New infrastructure categories
  | 'devops' | 'monitoring' | 'deployment' | 'ci_cd' | 'logging'
  // New cross-cutting categories
  | 'patterns';

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  'ui', 'api', 'state_management', 'database', 'testing', 'performance', 'architecture', 'security',
  'styling', 'accessibility', 'routing',
  'middleware', 'auth', 'validation', 'error_handling',
  'caching', 'migrations', 'queries', 'orm',
  'devops', 'monitoring', 'deployment', 'ci_cd', 'logging',
  'patterns',
];

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  ui: 'UI Patterns',
  api: 'API Design',
  state_management: 'State Management',
  database: 'Database',
  testing: 'Testing',
  performance: 'Performance',
  architecture: 'Architecture',
  security: 'Security',
  styling: 'Styling',
  accessibility: 'Accessibility',
  routing: 'Routing',
  middleware: 'Middleware',
  auth: 'Auth',
  validation: 'Validation',
  error_handling: 'Error Handling',
  caching: 'Caching',
  migrations: 'Migrations',
  queries: 'Queries',
  orm: 'ORM',
  devops: 'DevOps',
  monitoring: 'Monitoring',
  deployment: 'Deployment',
  ci_cd: 'CI/CD',
  logging: 'Logging',
  patterns: 'Patterns',
};

/** Which categories belong to which layer */
export const LAYER_CATEGORIES: Record<KnowledgeLayer, KnowledgeCategory[]> = {
  frontend: ['ui', 'state_management', 'styling', 'accessibility', 'routing'],
  backend: ['api', 'middleware', 'auth', 'validation', 'error_handling'],
  data: ['database', 'caching', 'migrations', 'queries', 'orm'],
  infrastructure: ['devops', 'monitoring', 'deployment', 'ci_cd', 'logging'],
  cross_cutting: ['architecture', 'testing', 'performance', 'security', 'patterns'],
};

/** Reverse lookup: category → layer */
export const CATEGORY_TO_LAYER: Record<KnowledgeCategory, KnowledgeLayer> = Object.entries(LAYER_CATEGORIES).reduce(
  (acc, [layer, cats]) => {
    for (const cat of cats) acc[cat] = layer as KnowledgeLayer;
    return acc;
  },
  {} as Record<KnowledgeCategory, KnowledgeLayer>,
);

// --- Backward compatibility aliases ---
// "domain" was the old name for "category"
export type KnowledgeDomain = KnowledgeCategory;
export const KNOWLEDGE_DOMAINS: KnowledgeDomain[] = KNOWLEDGE_CATEGORIES;
export const KNOWLEDGE_DOMAIN_LABELS: Record<KnowledgeDomain, string> = KNOWLEDGE_CATEGORY_LABELS;

export type KnowledgeLanguage = 'typescript' | 'javascript' | 'python' | 'rust' | 'go' | 'java' | 'csharp' | 'universal';

export const KNOWLEDGE_LANGUAGES: KnowledgeLanguage[] = ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'csharp', 'universal'];

export type KnowledgePatternType = 'best_practice' | 'anti_pattern' | 'convention' | 'gotcha' | 'optimization';
export type KnowledgeSourceType = 'scan' | 'insight_graduation' | 'cli_session' | 'cross_project' | 'manual';
export type KnowledgeEntryStatus = 'active' | 'deprecated' | 'archived';

export interface DbKnowledgeEntry {
  id: string;
  domain: KnowledgeCategory; // category (legacy column name "domain")
  layer: KnowledgeLayer;
  pattern_type: KnowledgePatternType;
  title: string;
  pattern: string;
  rationale: string | null;
  code_example: string | null;
  anti_pattern: string | null;
  applies_to: string; // JSON string[]
  file_patterns: string | null; // JSON string[]
  tags: string; // JSON string[]
  language: KnowledgeLanguage;
  confidence: number;
  source_project_id: string | null;
  source_type: KnowledgeSourceType;
  source_insight_id: string | null;
  times_applied: number;
  times_helpful: number;
  last_applied_at: string | null;
  status: KnowledgeEntryStatus;
  canonical_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeEntryInput {
  domain: KnowledgeCategory;
  layer?: KnowledgeLayer; // auto-derived from domain/category if omitted
  pattern_type: KnowledgePatternType;
  title: string;
  pattern: string;
  rationale?: string;
  code_example?: string;
  anti_pattern?: string;
  applies_to?: string[];
  file_patterns?: string[];
  tags?: string[];
  language?: KnowledgeLanguage;
  confidence?: number;
  source_project_id?: string;
  source_type?: KnowledgeSourceType;
  source_insight_id?: string;
}

export interface KnowledgeQuery {
  domain?: KnowledgeCategory;
  layer?: KnowledgeLayer;
  tags?: string[];
  applies_to?: string[];
  language?: KnowledgeLanguage;
  search?: string;
  min_confidence?: number;
  project_id?: string;
  status?: KnowledgeEntryStatus;
  limit?: number;
}

export interface KnowledgeExportEntry {
  domain: KnowledgeCategory;
  layer: KnowledgeLayer;
  pattern_type: KnowledgePatternType;
  title: string;
  pattern: string;
  rationale?: string;
  code_example?: string;
  anti_pattern?: string;
  language: KnowledgeLanguage;
  confidence: number;
  tags: string[];
  times_applied: number;
  times_helpful: number;
}
