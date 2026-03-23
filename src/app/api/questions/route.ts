/**
 * API Route: Questions
 *
 * GET /api/questions?projectId=xxx
 * POST /api/questions (create question - called by Claude Code)
 */

import { questionDb } from '@/app/db';
import { isValidQuestionStatus } from '@/lib/stateMachine';
import { createListHandlers } from '@/lib/api-helpers/crudRouteFactory';
import type { DbQuestion } from '@/app/db/models/types';

const { GET, POST } = createListHandlers<DbQuestion>({
  entityName: 'question',
  endpoint: '/api/questions',
  statusValues: ['pending', 'answered'],
  validateStatus: isValidQuestionStatus,
  idPrefix: 'question',

  repo: {
    getById: (id) => questionDb.getQuestionById(id),
    create: (data) => questionDb.createQuestion(data as Parameters<typeof questionDb.createQuestion>[0]),
  },

  fetchItems: (projectId, { status, contextMapId }) => {
    if (contextMapId) return questionDb.getQuestionsByContextMapId(projectId, contextMapId);
    if (status === 'pending') return questionDb.getPendingQuestions(projectId);
    if (status === 'answered') return questionDb.getAnsweredQuestions(projectId);
    return questionDb.getQuestionsByProject(projectId);
  },

  fetchCounts: (projectId, items, { status, contextMapId }) => {
    // When all questions are fetched, derive counts from JS array to avoid extra DB roundtrips
    if (!status && !contextMapId) {
      let pending = 0, answered = 0;
      for (const q of items) {
        if (q.status === 'pending') pending++;
        else if (q.status === 'answered') answered++;
      }
      return { total: items.length, pending, answered };
    }
    return questionDb.getQuestionCounts(projectId);
  },

  extraListFields: (_projectId, items) => {
    let maxDepth = 0;
    for (const q of items) {
      if ((q.tree_depth ?? 0) > maxDepth) maxDepth = q.tree_depth ?? 0;
    }
    return { maxTreeDepth: maxDepth };
  },

  validateCreate: (body) => {
    const { project_id, context_map_id, context_map_title, question } = body as Record<string, unknown>;
    if (!project_id || !context_map_id || !context_map_title || !question) {
      return 'project_id, context_map_id, context_map_title, and question are required';
    }
    return null;
  },

  buildCreatePayload: (id, body) => {
    // Resolve tree depth from parent if parent_id is provided
    let treeDepth = (body.tree_depth as number) ?? 0;
    if (body.parent_id && !body.tree_depth) {
      const parent = questionDb.getQuestionById(body.parent_id as string);
      if (parent) {
        treeDepth = (parent.tree_depth ?? 0) + 1;
      }
    }

    return {
      id,
      project_id: body.project_id,
      context_map_id: body.context_map_id,
      context_map_title: body.context_map_title,
      question: body.question,
      answer: body.answer || null,
      status: body.status || 'pending',
      goal_id: body.goal_id || null,
      parent_id: body.parent_id || null,
      tree_depth: treeDepth,
    };
  },
});

export { GET, POST };
