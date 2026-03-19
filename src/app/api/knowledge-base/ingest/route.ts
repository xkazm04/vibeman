/**
 * Knowledge Base Ingest API
 * Bulk import knowledge entries from skill scans
 * POST /api/knowledge-base/ingest
 */

import { NextRequest } from 'next/server';
import { knowledgeRepository } from '@/app/db/repositories/knowledge.repository';
import { KNOWLEDGE_DOMAINS, KNOWLEDGE_LANGUAGES } from '@/app/db/models/knowledge.types';
import type { KnowledgeDomain, KnowledgePatternType, KnowledgeLanguage } from '@/app/db/models/knowledge.types';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
import { withObservability } from '@/lib/observability/middleware';
import { generateId } from '@/app/db/repositories/repository.utils';

interface IngestEntry {
  domain: string;
  title: string;
  description: string;
  codePattern?: string;
  filePaths?: string[];
  tags?: string[];
  confidence?: number;
  pattern_type?: string;
  language?: string;
}

interface ImprovementProposal {
  targetProject: string;
  sourceProject: string;
  domain: string;
  title: string;
  description: string;
  sourceFilePaths?: string[];
  targetFilePaths?: string[];
  effort?: number;
  impact?: number;
  tags?: string[];
}

interface IngestRequest {
  source: 'identify-patterns' | 'cross-project-scan' | 'manual' | 'cli_session';
  projectId: string;
  crossProjectId?: string;
  entries: IngestEntry[];
  improvements?: ImprovementProposal[];
}

const VALID_PATTERN_TYPES = ['best_practice', 'anti_pattern', 'convention', 'gotcha', 'optimization'];

function mapDomain(raw: string): KnowledgeDomain {
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, '_');
  const mapping: Record<string, KnowledgeDomain> = {
    code_structure: 'architecture',
    error_handling: 'api',
    component_patterns: 'ui',
    api_design: 'api',
    state_management: 'state_management',
    testing_patterns: 'testing',
    performance: 'performance',
    accessibility: 'ui',
    ui: 'ui',
    api: 'api',
    database: 'database',
    testing: 'testing',
    architecture: 'architecture',
    security: 'security',
  };
  return mapping[normalized] || 'architecture';
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json() as IngestRequest;

    if (!body.source || !body.projectId || !Array.isArray(body.entries)) {
      return buildErrorResponse('Required: source, projectId, entries[]', { status: 400 });
    }

    let entriesCreated = 0;
    let duplicatesSkipped = 0;

    for (const entry of body.entries) {
      if (!entry.title || !entry.description) {
        duplicatesSkipped++;
        continue;
      }

      const domain = mapDomain(entry.domain);
      const patternType: KnowledgePatternType =
        (entry.pattern_type && VALID_PATTERN_TYPES.includes(entry.pattern_type))
          ? entry.pattern_type as KnowledgePatternType
          : 'best_practice';

      const sourceType = body.source === 'cross-project-scan' ? 'cross_project' as const
        : body.source === 'identify-patterns' ? 'scan' as const
        : body.source === 'cli_session' ? 'cli_session' as const
        : 'manual' as const;

      const language: KnowledgeLanguage =
        (entry.language && KNOWLEDGE_LANGUAGES.includes(entry.language as KnowledgeLanguage))
          ? entry.language as KnowledgeLanguage
          : 'universal';

      const result = knowledgeRepository.create({
        domain,
        pattern_type: patternType,
        title: entry.title,
        pattern: entry.description,
        code_example: entry.codePattern || undefined,
        file_patterns: entry.filePaths,
        tags: entry.tags,
        language,
        confidence: entry.confidence ?? 60,
        source_project_id: body.projectId,
        source_type: sourceType,
      });

      // If create returned an existing entry (dedup), count as skipped
      if (result.created_at !== result.updated_at || result.source_project_id !== body.projectId) {
        duplicatesSkipped++;
      } else {
        entriesCreated++;
      }
    }

    // Handle improvement proposals -- create as ideas if idea repository exists
    let improvementsCreated = 0;
    if (body.improvements?.length) {
      try {
        const { ideaRepository } = await import('@/app/db/repositories/idea.repository');

        for (const improvement of body.improvements) {
          if (!improvement.title || !improvement.description) continue;

          ideaRepository.createIdea({
            id: generateId('idea'),
            scan_id: `kb-${Date.now()}`,
            project_id: body.projectId,
            scan_type: 'cross_project',
            category: mapDomain(improvement.domain || 'architecture'),
            title: improvement.title,
            description: improvement.description,
            reasoning: `Cross-project improvement from ${improvement.sourceProject} to ${improvement.targetProject}`,
            effort: improvement.effort ?? 5,
            impact: improvement.impact ?? 5,
            risk: 3,
          });
          improvementsCreated++;
        }
      } catch (err) {
        console.warn('[KB Ingest] Failed to create improvement ideas:', err);
      }
    }

    return buildSuccessResponse({
      entriesCreated,
      duplicatesSkipped,
      improvementsCreated,
      total: body.entries.length,
    });
  } catch (error) {
    console.error('[KB Ingest] Error:', error);
    return buildErrorResponse('Failed to ingest knowledge entries');
  }
}

export const POST = withObservability(handlePost, '/api/knowledge-base/ingest');
