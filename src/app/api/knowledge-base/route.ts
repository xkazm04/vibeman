/**
 * Knowledge Base API
 * GET: Query/list/stats for knowledge entries
 * POST: Create entry, export to files, or graduate insights
 * DELETE: Remove a knowledge entry
 */

import { NextRequest } from 'next/server';
import { knowledgeRepository } from '@/app/db/repositories/knowledge.repository';
import type { KnowledgeDomain, KnowledgeQuery } from '@/app/db/models/knowledge.types';
import { KNOWLEDGE_DOMAINS } from '@/app/db/models/knowledge.types';
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
import { withObservability } from '@/lib/observability/middleware';

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'query';

    if (action === 'stats') {
      const stats = knowledgeRepository.getStats();
      return buildSuccessResponse(stats);
    }

    if (action === 'list') {
      const domain = searchParams.get('domain') as KnowledgeDomain | null;
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      if (domain && !KNOWLEDGE_DOMAINS.includes(domain)) {
        return buildErrorResponse('Invalid domain', { status: 400 });
      }
      const entries = domain
        ? knowledgeRepository.getByDomain(domain, limit)
        : knowledgeRepository.query({ limit });
      return buildSuccessResponse(entries);
    }

    // Default: query
    const query: KnowledgeQuery = {};
    const domain = searchParams.get('domain');
    if (domain && KNOWLEDGE_DOMAINS.includes(domain as KnowledgeDomain)) {
      query.domain = domain as KnowledgeDomain;
    }
    const search = searchParams.get('search');
    if (search) query.search = search;
    const minConfidence = searchParams.get('minConfidence');
    if (minConfidence) query.min_confidence = parseInt(minConfidence, 10);
    const projectId = searchParams.get('projectId');
    if (projectId) query.project_id = projectId;
    const limit = searchParams.get('limit');
    if (limit) query.limit = parseInt(limit, 10);
    const tags = searchParams.get('tags');
    if (tags) query.tags = tags.split(',');

    const entries = knowledgeRepository.query(query);
    return buildSuccessResponse(entries);
  } catch (error) {
    console.error('[KB API] GET error:', error);
    return buildErrorResponse('Failed to query knowledge base');
  }
}

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'create';

    if (action === 'create') {
      if (!body.domain || !body.title || !body.pattern || !body.pattern_type) {
        return buildErrorResponse(
          'Missing required fields: domain, pattern_type, title, pattern',
          { status: 400 }
        );
      }
      if (!KNOWLEDGE_DOMAINS.includes(body.domain)) {
        return buildErrorResponse('Invalid domain', { status: 400 });
      }
      const entry = knowledgeRepository.create({
        domain: body.domain,
        pattern_type: body.pattern_type,
        title: body.title,
        pattern: body.pattern,
        rationale: body.rationale,
        code_example: body.code_example,
        anti_pattern: body.anti_pattern,
        applies_to: body.applies_to,
        file_patterns: body.file_patterns,
        tags: body.tags,
        confidence: body.confidence,
        source_project_id: body.source_project_id,
        source_type: body.source_type,
        source_insight_id: body.source_insight_id,
      });
      return buildSuccessResponse(entry);
    }

    if (action === 'export') {
      if (!body.projectPath) {
        return buildErrorResponse('projectPath required', { status: 400 });
      }
      const { exportToFiles } = await import('@/lib/knowledge-base/knowledgeExporter');
      const result = exportToFiles(body.projectPath);
      return buildSuccessResponse(result);
    }

    if (action === 'graduate') {
      if (!body.projectId) {
        return buildErrorResponse('projectId required', { status: 400 });
      }
      const { knowledgeBaseService } = await import('@/lib/knowledge-base/knowledgeBaseService');
      const result = knowledgeBaseService.autoGraduateInsights(body.projectId);
      return buildSuccessResponse(result);
    }

    if (action === 'feedback') {
      if (!body.entryId || body.helpful === undefined) {
        return buildErrorResponse('entryId and helpful required', { status: 400 });
      }
      knowledgeRepository.recordApplication(body.entryId, body.helpful);
      return buildSuccessResponse({ recorded: true });
    }

    return buildErrorResponse(`Unknown action: ${action}`, { status: 400 });
  } catch (error) {
    console.error('[KB API] POST error:', error);
    return buildErrorResponse('Failed to process knowledge base request');
  }
}

async function handleDelete(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return buildErrorResponse('id required', { status: 400 });
    }
    const deleted = knowledgeRepository.delete(id);
    return buildSuccessResponse({ deleted });
  } catch (error) {
    console.error('[KB API] DELETE error:', error);
    return buildErrorResponse('Failed to delete knowledge entry');
  }
}

export const GET = withObservability(handleGet, '/api/knowledge-base');
export const POST = withObservability(handlePost, '/api/knowledge-base');
export const DELETE = withObservability(handleDelete, '/api/knowledge-base');
