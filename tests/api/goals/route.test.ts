/**
 * Tests for /api/goals route
 * Tests CRUD operations for goals
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST, PUT, DELETE } from '@/app/api/goals/route';
import {
  getTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from '@tests/setup/test-database';
import {
  createGetRequest,
  createPostRequest,
  createPutRequest,
  createDeleteRequest,
  parseJsonResponse,
} from '@tests/setup/api-test-utils';
import {
  createTestProject,
  createTestGoal,
  createTestContext,
  insertTestProject,
  insertTestGoal,
  insertTestContext,
  generateId,
} from '@tests/setup/mock-factories';

// Mock external integrations
vi.mock('@/lib/supabase/goalSync', () => ({
  fireAndForgetSync: vi.fn(),
  syncGoalToSupabase: vi.fn(),
  deleteGoalFromSupabase: vi.fn(),
}));

vi.mock('@/lib/github', () => ({
  fireAndForgetGitHubSync: vi.fn(),
  syncGoalToGitHub: vi.fn(),
  deleteGoalFromGitHub: vi.fn(),
}));

vi.mock('@/lib/goals', () => ({
  fireAndForgetGoalAnalysis: vi.fn(),
}));

vi.mock('@/lib/project_database', () => ({
  projectDb: {
    getProject: vi.fn().mockReturnValue({ path: '/test/path' }),
  },
}));

// Mock the database module to use test database
vi.mock('@/app/db', async () => {
  const { getTestDatabase } = await import('@tests/setup/test-database');

  return {
    goalDb: {
      getGoalById: (id: string) => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
      },
      getGoalsByProject: (projectId: string) => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM goals WHERE project_id = ? ORDER BY order_index').all(projectId);
      },
      getMaxOrderIndex: (projectId: string) => {
        const db = getTestDatabase();
        const result = db.prepare('SELECT MAX(order_index) as max FROM goals WHERE project_id = ?').get(projectId) as { max: number | null };
        return result?.max ?? -1;
      },
      createGoal: (goal: Record<string, unknown>) => {
        const db = getTestDatabase();
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO goals (id, project_id, context_id, order_index, title, description, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          goal.id,
          goal.project_id,
          goal.context_id || null,
          goal.order_index,
          goal.title,
          goal.description || null,
          goal.status,
          now,
          now
        );
        return db.prepare('SELECT * FROM goals WHERE id = ?').get(goal.id);
      },
      updateGoal: (id: string, updates: Record<string, unknown>) => {
        const db = getTestDatabase();
        const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
        if (!existing) return null;

        const sets: string[] = [];
        const values: unknown[] = [];

        if (updates.title !== undefined) {
          sets.push('title = ?');
          values.push(updates.title);
        }
        if (updates.description !== undefined) {
          sets.push('description = ?');
          values.push(updates.description);
        }
        if (updates.status !== undefined) {
          sets.push('status = ?');
          values.push(updates.status);
        }
        if (updates.order_index !== undefined) {
          sets.push('order_index = ?');
          values.push(updates.order_index);
        }
        if (updates.context_id !== undefined) {
          sets.push('context_id = ?');
          values.push(updates.context_id);
        }

        if (sets.length > 0) {
          sets.push('updated_at = ?');
          values.push(new Date().toISOString());
          values.push(id);
          db.prepare(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        }

        return db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
      },
      deleteGoal: (id: string) => {
        const db = getTestDatabase();
        const result = db.prepare('DELETE FROM goals WHERE id = ?').run(id);
        return result.changes > 0;
      },
    },
    contextDb: {
      getContextById: (id: string) => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM contexts WHERE id = ?').get(id);
      },
    },
  };
});

describe('API /api/goals', () => {
  let testProjectId: string;
  let testContextId: string;

  beforeEach(() => {
    setupTestDatabase();
    testProjectId = generateId('proj');
    testContextId = generateId('ctx');

    // Insert test project
    const db = getTestDatabase();
    const project = createTestProject({ id: testProjectId });
    insertTestProject(db, project);

    // Insert test context
    const context = createTestContext({ id: testContextId, project_id: testProjectId });
    insertTestContext(db, context);
  });

  afterEach(() => {
    cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns empty array when no goals exist for project', async () => {
      const request = createGetRequest('/api/goals', { projectId: testProjectId });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goals: unknown[] }>(response);
      expect(body.goals).toEqual([]);
    });

    it('returns all goals for project', async () => {
      const db = getTestDatabase();
      const goal1 = createTestGoal({ project_id: testProjectId, order_index: 0, title: 'Goal 1' });
      const goal2 = createTestGoal({ project_id: testProjectId, order_index: 1, title: 'Goal 2' });
      insertTestGoal(db, goal1);
      insertTestGoal(db, goal2);

      const request = createGetRequest('/api/goals', { projectId: testProjectId });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goals: unknown[] }>(response);
      expect(body.goals).toHaveLength(2);
    });

    it('returns single goal by id', async () => {
      const db = getTestDatabase();
      const goal = createTestGoal({ project_id: testProjectId, title: 'Test Goal' });
      insertTestGoal(db, goal);

      const request = createGetRequest('/api/goals', { id: goal.id });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goal: { id: string; title: string } }>(response);
      expect(body.goal.id).toBe(goal.id);
      expect(body.goal.title).toBe('Test Goal');
    });

    it('returns 400 when neither projectId nor id is provided', async () => {
      const request = createGetRequest('/api/goals');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('returns 404 when goal not found by id', async () => {
      const request = createGetRequest('/api/goals', { id: 'nonexistent-id' });
      const response = await GET(request);

      expect(response.status).toBe(404);
    });

    it('returns goals ordered by order_index', async () => {
      const db = getTestDatabase();
      const goal1 = createTestGoal({ project_id: testProjectId, order_index: 2, title: 'Goal C' });
      const goal2 = createTestGoal({ project_id: testProjectId, order_index: 0, title: 'Goal A' });
      const goal3 = createTestGoal({ project_id: testProjectId, order_index: 1, title: 'Goal B' });
      insertTestGoal(db, goal1);
      insertTestGoal(db, goal2);
      insertTestGoal(db, goal3);

      const request = createGetRequest('/api/goals', { projectId: testProjectId });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goals: Array<{ title: string }> }>(response);
      expect(body.goals[0].title).toBe('Goal A');
      expect(body.goals[1].title).toBe('Goal B');
      expect(body.goals[2].title).toBe('Goal C');
    });
  });

  describe('POST', () => {
    it('creates goal with valid data', async () => {
      const request = createPostRequest('/api/goals', {
        projectId: testProjectId,
        title: 'New Goal',
        description: 'Goal description',
        status: 'open',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goal: { id: string; title: string; status: string } }>(response);
      expect(body.goal.title).toBe('New Goal');
      expect(body.goal.status).toBe('open');
    });

    it('creates goal with context', async () => {
      const request = createPostRequest('/api/goals', {
        projectId: testProjectId,
        contextId: testContextId,
        title: 'Goal with Context',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goal: { context_id: string } }>(response);
      expect(body.goal.context_id).toBe(testContextId);
    });

    it('auto-increments order_index', async () => {
      // Create first goal
      const request1 = createPostRequest('/api/goals', {
        projectId: testProjectId,
        title: 'First Goal',
      });
      await POST(request1);

      // Create second goal
      const request2 = createPostRequest('/api/goals', {
        projectId: testProjectId,
        title: 'Second Goal',
      });
      const response2 = await POST(request2);

      const body = await parseJsonResponse<{ goal: { order_index: number } }>(response2);
      expect(body.goal.order_index).toBe(1);
    });

    it('returns 400 when projectId is missing', async () => {
      const request = createPostRequest('/api/goals', {
        title: 'Goal without project',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 when title is missing', async () => {
      const request = createPostRequest('/api/goals', {
        projectId: testProjectId,
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('uses provided orderIndex when given', async () => {
      const request = createPostRequest('/api/goals', {
        projectId: testProjectId,
        title: 'Goal with specific order',
        orderIndex: 5,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goal: { order_index: number } }>(response);
      expect(body.goal.order_index).toBe(5);
    });

    it('defaults status to open', async () => {
      const request = createPostRequest('/api/goals', {
        projectId: testProjectId,
        title: 'Goal without status',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goal: { status: string } }>(response);
      expect(body.goal.status).toBe('open');
    });
  });

  describe('PUT', () => {
    it('updates existing goal', async () => {
      const db = getTestDatabase();
      const goal = createTestGoal({ project_id: testProjectId, title: 'Original Title' });
      insertTestGoal(db, goal);

      const request = createPutRequest('/api/goals', {
        id: goal.id,
        title: 'Updated Title',
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goal: { title: string } }>(response);
      expect(body.goal.title).toBe('Updated Title');
    });

    it('updates goal status', async () => {
      const db = getTestDatabase();
      const goal = createTestGoal({ project_id: testProjectId, status: 'open' });
      insertTestGoal(db, goal);

      const request = createPutRequest('/api/goals', {
        id: goal.id,
        status: 'in_progress',
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goal: { status: string } }>(response);
      expect(body.goal.status).toBe('in_progress');
    });

    it('updates goal context', async () => {
      const db = getTestDatabase();
      const goal = createTestGoal({ project_id: testProjectId, context_id: null });
      insertTestGoal(db, goal);

      const request = createPutRequest('/api/goals', {
        id: goal.id,
        contextId: testContextId,
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goal: { context_id: string } }>(response);
      expect(body.goal.context_id).toBe(testContextId);
    });

    it('returns 400 when id is missing', async () => {
      const request = createPutRequest('/api/goals', {
        title: 'Update without ID',
      });
      const response = await PUT(request);

      expect(response.status).toBe(400);
    });

    it('returns 404 when goal not found', async () => {
      const request = createPutRequest('/api/goals', {
        id: 'nonexistent-id',
        title: 'Updated Title',
      });
      const response = await PUT(request);

      expect(response.status).toBe(404);
    });

    it('updates order_index', async () => {
      const db = getTestDatabase();
      const goal = createTestGoal({ project_id: testProjectId, order_index: 0 });
      insertTestGoal(db, goal);

      const request = createPutRequest('/api/goals', {
        id: goal.id,
        orderIndex: 10,
      });
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ goal: { order_index: number } }>(response);
      expect(body.goal.order_index).toBe(10);
    });
  });

  describe('DELETE', () => {
    it('deletes existing goal', async () => {
      const db = getTestDatabase();
      const goal = createTestGoal({ project_id: testProjectId });
      insertTestGoal(db, goal);

      const request = createDeleteRequest('/api/goals', { id: goal.id });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ success: boolean }>(response);
      expect(body.success).toBe(true);

      // Verify goal is deleted
      const deletedGoal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goal.id);
      expect(deletedGoal).toBeUndefined();
    });

    it('returns 400 when id is missing', async () => {
      const request = createDeleteRequest('/api/goals');
      const response = await DELETE(request);

      expect(response.status).toBe(400);
    });

    it('returns 404 when goal not found', async () => {
      const request = createDeleteRequest('/api/goals', { id: 'nonexistent-id' });
      const response = await DELETE(request);

      expect(response.status).toBe(404);
    });
  });
});
