/**
 * API Route: Questions
 *
 * GET /api/questions?projectId=xxx
 * POST /api/questions (create question - called by Claude Code)
 */

import { questionRepository } from '@/app/db/repositories/question.repository';
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
    getById: (id) => questionRepository.getQuestionById(id),
    create: (data) => questionRepository.createQuestion(data as Parameters<typeof questionRepository.createQuestion>[0]),
  },

  fetchItems: (projectId, { status, contextMapId }) => {
    if (contextMapId) return questionRepository.getQuestionsByContextMapId(projectId, contextMapId);
    if (status === 'pending') return questionRepository.getPendingQuestions(projectId);
    if (status === 'answered') return questionRepository.getAnsweredQuestions(projectId);
    return questionRepository.getQuestionsByProject(projectId);
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
    return questionRepository.getQuestionCounts(projectId);
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
      const parent = questionRepository.getQuestionById(body.parent_id as string);
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
