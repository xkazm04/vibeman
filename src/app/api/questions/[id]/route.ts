/**
 * API Route: Question by ID
 *
 * GET /api/questions/[id] - Get single question
 * PUT /api/questions/[id] - Update question (answer it)
 * DELETE /api/questions/[id] - Delete question
 *
 * When a question is answered (PUT with an answer), emits a `question:answered`
 * event so the auto-deepen subscriber can trigger gap analysis asynchronously.
 */

import { questionDb } from '@/app/db';
import { createEntityHandlers } from '@/lib/api-helpers/crudRouteFactory';
import { emitQuestionAnswered } from '@/lib/events/domainEmitters';
import type { DbQuestion } from '@/app/db/models/types';

const { GET, PUT, DELETE } = createEntityHandlers<DbQuestion>({
  entityName: 'question',
  endpoint: '/api/questions/[id]',

  repo: {
    getById: (id) => questionDb.getQuestionById(id),
    update: (id, data) => questionDb.updateQuestion(id, data as Parameters<typeof questionDb.updateQuestion>[1]),
    delete: (id) => questionDb.deleteQuestion(id),
  },

  buildUpdatePayload: (body) => {
    const { answer } = body as { answer?: string };
    return {
      answer: answer ?? body.answer,
      status: answer ? 'answered' : body.status,
      question: body.question,
      context_map_title: body.context_map_title,
    };
  },

  afterUpdate: (updated, body) => {
    const answer = (body as { answer?: string }).answer;
    if (answer && updated.status === 'answered') {
      emitQuestionAnswered({
        projectId: updated.project_id,
        questionId: updated.id,
        answer,
      });
    }
  },
});

export { GET, PUT, DELETE };
