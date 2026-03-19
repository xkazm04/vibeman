/**
 * Knowledge Base Types
 * Cross-project knowledge entries organized by technical domain
 */

export type KnowledgeDomain = 'ui' | 'api' | 'state_management' | 'database' | 'testing' | 'performance' | 'architecture' | 'security';

export const KNOWLEDGE_DOMAINS: KnowledgeDomain[] = ['ui', 'api', 'state_management', 'database', 'testing', 'performance', 'architecture', 'security'];

export const KNOWLEDGE_DOMAIN_LABELS: Record<KnowledgeDomain, string> = {
  ui: 'UI Patterns',
  api: 'API Design',
  state_management: 'State Management',
  database: 'Database Patterns',
  testing: 'Testing',
  performance: 'Performance',
  architecture: 'Architecture',
  security: 'Security',
};

export type KnowledgePatternType = 'best_practice' | 'anti_pattern' | 'convention' | 'gotcha' | 'optimization';
export type KnowledgeSourceType = 'scan' | 'insight_graduation' | 'cli_session' | 'cross_project' | 'manual';
export type KnowledgeEntryStatus = 'active' | 'deprecated' | 'archived';

export interface DbKnowledgeEntry {
  id: string;
  domain: KnowledgeDomain;
  pattern_type: KnowledgePatternType;
  title: string;
  pattern: string;
  rationale: string | null;
  code_example: string | null;
  anti_pattern: string | null;
  applies_to: string; // JSON string[]
  file_patterns: string | null; // JSON string[]
  tags: string; // JSON string[]
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
  domain: KnowledgeDomain;
  pattern_type: KnowledgePatternType;
  title: string;
  pattern: string;
  rationale?: string;
  code_example?: string;
  anti_pattern?: string;
  applies_to?: string[];
  file_patterns?: string[];
  tags?: string[];
  confidence?: number;
  source_project_id?: string;
  source_type?: KnowledgeSourceType;
  source_insight_id?: string;
}

export interface KnowledgeQuery {
  domain?: KnowledgeDomain;
  tags?: string[];
  applies_to?: string[];
  search?: string;
  min_confidence?: number;
  project_id?: string;
  status?: KnowledgeEntryStatus;
  limit?: number;
}

export interface KnowledgeExportEntry {
  domain: KnowledgeDomain;
  pattern_type: KnowledgePatternType;
  title: string;
  pattern: string;
  rationale?: string;
  code_example?: string;
  anti_pattern?: string;
  confidence: number;
  tags: string[];
  times_applied: number;
  times_helpful: number;
}
