/**
 * Tests for /api/ideas route
 * Tests CRUD operations for ideas with filtering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST, PATCH, DELETE } from '@/app/api/ideas/route';
import {
  getTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from '@tests/setup/test-database';
import {
  createGetRequest,
  createPostRequest,
  createPatchRequest,
  createDeleteRequest,
  parseJsonResponse,
} from '@tests/setup/api-test-utils';
import {
  createTestProject,
  createTestScan,
  createTestIdea,
  createTestContext,
  insertTestProject,
  insertTestScan,
  insertTestIdea,
  insertTestContext,
  generateId,
} from '@tests/setup/mock-factories';

// Mock analytics service
vi.mock('@/lib/services/analyticsAggregation', () => ({
  analyticsAggregationService: {
    invalidateCacheForProject: vi.fn(),
    invalidateCache: vi.fn(),
  },
}));

// Mock the database module to use test database
vi.mock('@/app/db', async () => {
  const { getTestDatabase } = await import('@tests/setup/test-database');

  return {
    ideaDb: {
      getAllIdeas: () => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM ideas ORDER BY created_at DESC').all();
      },
      getAllIdeasWithColors: () => {
        const db = getTestDatabase();
        return db.prepare(`
          SELECT i.*, cg.color as context_color
          FROM ideas i
          LEFT JOIN contexts c ON i.context_id = c.id
          LEFT JOIN context_groups cg ON c.group_id = cg.id
          ORDER BY i.created_at DESC
        `).all();
      },
      getIdeasByProject: (projectId: string) => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM ideas WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
      },
      getIdeasByProjectWithColors: (projectId: string) => {
        const db = getTestDatabase();
        return db.prepare(`
          SELECT i.*, cg.color as context_color
          FROM ideas i
          LEFT JOIN contexts c ON i.context_id = c.id
          LEFT JOIN context_groups cg ON c.group_id = cg.id
          WHERE i.project_id = ?
          ORDER BY i.created_at DESC
        `).all(projectId);
      },
      getIdeasByContext: (contextId: string) => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM ideas WHERE context_id = ? ORDER BY created_at DESC').all(contextId);
      },
      getIdeasByStatus: (status: string) => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM ideas WHERE status = ? ORDER BY created_at DESC').all(status);
      },
      getIdeasByStatusWithColors: (status: string) => {
        const db = getTestDatabase();
        return db.prepare(`
          SELECT i.*, cg.color as context_color
          FROM ideas i
          LEFT JOIN contexts c ON i.context_id = c.id
          LEFT JOIN context_groups cg ON c.group_id = cg.id
          WHERE i.status = ?
          ORDER BY i.created_at DESC
        `).all(status);
      },
      getIdeasByGoal: (goalId: string) => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM ideas WHERE goal_id = ? ORDER BY created_at DESC').all(goalId);
      },
      getRecentIdeas: (limit: number) => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM ideas ORDER BY created_at DESC LIMIT ?').all(limit);
      },
      getIdeaById: (id: string) => {
        const db = getTestDatabase();
        return db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
      },
      createIdea: (idea: Record<string, unknown>) => {
        const db = getTestDatabase();
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO ideas (id, scan_id, project_id, context_id, scan_type, category, title, description, reasoning, status, user_feedback, user_pattern, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          idea.id,
          idea.scan_id,
          idea.project_id,
          idea.context_id || null,
          idea.scan_type || 'overall',
          idea.category,
          idea.title,
          idea.description || null,
          idea.reasoning || null,
          idea.status || 'pending',
          idea.user_feedback || null,
          idea.user_pattern || 0,
          now,
          now
        );
        return db.prepare('SELECT * FROM ideas WHERE id = ?').get(idea.id);
      },
      updateIdea: (id: string, updates: Record<string, unknown>) => {
        const db = getTestDatabase();
        const existing = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
        if (!existing) return null;

        const sets: string[] = [];
        const values: unknown[] = [];

        if (updates.status !== undefined) {
          sets.push('status = ?');
          values.push(updates.status);
        }
        if (updates.user_feedback !== undefined) {
          sets.push('user_feedback = ?');
          values.push(updates.user_feedback);
        }
        if (updates.user_pattern !== undefined) {
          sets.push('user_pattern = ?');
          values.push(updates.user_pattern);
        }
        if (updates.title !== undefined) {
          sets.push('title = ?');
          values.push(updates.title);
        }
        if (updates.description !== undefined) {
          sets.push('description = ?');
          values.push(updates.description);
        }
        if (updates.reasoning !== undefined) {
          sets.push('reasoning = ?');
          values.push(updates.reasoning);
        }

        if (sets.length > 0) {
          sets.push('updated_at = ?');
          values.push(new Date().toISOString());
          values.push(id);
          db.prepare(`UPDATE ideas SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        }

        return db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
      },
      deleteIdea: (id: string) => {
        const db = getTestDatabase();
        const result = db.prepare('DELETE FROM ideas WHERE id = ?').run(id);
        return result.changes > 0;
      },
      deleteAllIdeas: () => {
        const db = getTestDatabase();
        const result = db.prepare('DELETE FROM ideas').run();
        return result.changes;
      },
    },
    DbIdea: {},
    DbIdeaWithColor: {},
  };
});

describe('API /api/ideas', () => {
  let testProjectId: string;
  let testScanId: string;
  let testContextId: string;

  beforeEach(() => {
    setupTestDatabase();
    testProjectId = generateId('proj');
    testScanId = generateId('scan');
    testContextId = generateId('ctx');

    // Insert test project
    const db = getTestDatabase();
    const project = createTestProject({ id: testProjectId });
    insertTestProject(db, project);

    // Insert test context
    const context = createTestContext({ id: testContextId, project_id: testProjectId });
    insertTestContext(db, context);

    // Insert test scan
    const scan = createTestScan({ id: testScanId, project_id: testProjectId });
    insertTestScan(db, scan);
  });

  afterEach(() => {
    cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns all ideas when no filters provided', async () => {
      const db = getTestDatabase();
      const idea1 = createTestIdea({ project_id: testProjectId, scan_id: testScanId, title: 'Idea 1' });
      const idea2 = createTestIdea({ project_id: testProjectId, scan_id: testScanId, title: 'Idea 2' });
      insertTestIdea(db, idea1);
      insertTestIdea(db, idea2);

      const request = createGetRequest('/api/ideas');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ ideas: unknown[] }>(response);
      expect(body.ideas).toHaveLength(2);
    });

    it('filters ideas by projectId', async () => {
      const db = getTestDatabase();
      const otherProjectId = generateId('proj');
      const project2 = createTestProject({ id: otherProjectId });
      insertTestProject(db, project2);

      const scan2 = createTestScan({ id: generateId('scan'), project_id: otherProjectId });
      insertTestScan(db, scan2);

      const idea1 = createTestIdea({ project_id: testProjectId, scan_id: testScanId, title: 'Idea for project 1' });
      const idea2 = createTestIdea({ project_id: otherProjectId, scan_id: scan2.id, title: 'Idea for project 2' });
      insertTestIdea(db, idea1);
      insertTestIdea(db, idea2);

      const request = createGetRequest('/api/ideas', { projectId: testProjectId });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ ideas: Array<{ title: string }> }>(response);
      expect(body.ideas).toHaveLength(1);
      expect(body.ideas[0].title).toBe('Idea for project 1');
    });

    it('filters ideas by contextId', async () => {
      const db = getTestDatabase();
      const idea1 = createTestIdea({ project_id: testProjectId, scan_id: testScanId, context_id: testContextId, title: 'Idea with context' });
      const idea2 = createTestIdea({ project_id: testProjectId, scan_id: testScanId, context_id: null, title: 'Idea without context' });
      insertTestIdea(db, idea1);
      insertTestIdea(db, idea2);

      const request = createGetRequest('/api/ideas', { contextId: testContextId });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ ideas: Array<{ title: string }> }>(response);
      expect(body.ideas).toHaveLength(1);
      expect(body.ideas[0].title).toBe('Idea with context');
    });

    it('filters ideas by status', async () => {
      const db = getTestDatabase();
      const idea1 = createTestIdea({ project_id: testProjectId, scan_id: testScanId, status: 'pending', title: 'Pending idea' });
      const idea2 = createTestIdea({ project_id: testProjectId, scan_id: testScanId, status: 'accepted', title: 'Accepted idea' });
      insertTestIdea(db, idea1);
      insertTestIdea(db, idea2);

      const request = createGetRequest('/api/ideas', { status: 'accepted' });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ ideas: Array<{ title: string }> }>(response);
      expect(body.ideas).toHaveLength(1);
      expect(body.ideas[0].title).toBe('Accepted idea');
    });

    it('limits results when limit is provided', async () => {
      const db = getTestDatabase();
      for (let i = 0; i < 5; i++) {
        const idea = createTestIdea({ project_id: testProjectId, scan_id: testScanId, title: `Idea ${i}` });
        insertTestIdea(db, idea);
      }

      const request = createGetRequest('/api/ideas', { limit: 3 });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ ideas: unknown[] }>(response);
      expect(body.ideas).toHaveLength(3);
    });

    it('returns empty array when no ideas exist', async () => {
      const request = createGetRequest('/api/ideas', { projectId: testProjectId });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ ideas: unknown[] }>(response);
      expect(body.ideas).toEqual([]);
    });
  });

  describe('POST', () => {
    it('creates idea with valid data', async () => {
      const request = createPostRequest('/api/ideas', {
        scan_id: testScanId,
        project_id: testProjectId,
        category: 'enhancement',
        title: 'New Idea',
        description: 'Idea description',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const body = await parseJsonResponse<{ idea: { id: string; title: string; status: string } }>(response);
      expect(body.idea.title).toBe('New Idea');
      expect(body.idea.status).toBe('pending');
    });

    it('creates idea with context', async () => {
      const request = createPostRequest('/api/ideas', {
        scan_id: testScanId,
        project_id: testProjectId,
        context_id: testContextId,
        category: 'enhancement',
        title: 'Idea with Context',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const body = await parseJsonResponse<{ idea: { context_id: string } }>(response);
      expect(body.idea.context_id).toBe(testContextId);
    });

    it('returns 400 when scan_id is missing', async () => {
      const request = createPostRequest('/api/ideas', {
        project_id: testProjectId,
        category: 'enhancement',
        title: 'Idea without scan',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 when project_id is missing', async () => {
      const request = createPostRequest('/api/ideas', {
        scan_id: testScanId,
        category: 'enhancement',
        title: 'Idea without project',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 when category is missing', async () => {
      const request = createPostRequest('/api/ideas', {
        scan_id: testScanId,
        project_id: testProjectId,
        title: 'Idea without category',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('returns 400 when title is missing', async () => {
      const request = createPostRequest('/api/ideas', {
        scan_id: testScanId,
        project_id: testProjectId,
        category: 'enhancement',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('defaults scan_type to manual', async () => {
      const request = createPostRequest('/api/ideas', {
        scan_id: testScanId,
        project_id: testProjectId,
        category: 'enhancement',
        title: 'Idea without scan_type',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const body = await parseJsonResponse<{ idea: { scan_type: string } }>(response);
      expect(body.idea.scan_type).toBe('manual');
    });
  });

  describe('PATCH', () => {
    it('updates idea status', async () => {
      const db = getTestDatabase();
      const idea = createTestIdea({ project_id: testProjectId, scan_id: testScanId, status: 'pending' });
      insertTestIdea(db, idea);

      const request = createPatchRequest('/api/ideas', {
        id: idea.id,
        status: 'accepted',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ idea: { status: string } }>(response);
      expect(body.idea.status).toBe('accepted');
    });

    it('updates idea title and description', async () => {
      const db = getTestDatabase();
      const idea = createTestIdea({ project_id: testProjectId, scan_id: testScanId });
      insertTestIdea(db, idea);

      const request = createPatchRequest('/api/ideas', {
        id: idea.id,
        title: 'Updated Title',
        description: 'Updated Description',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ idea: { title: string; description: string } }>(response);
      expect(body.idea.title).toBe('Updated Title');
      expect(body.idea.description).toBe('Updated Description');
    });

    it('returns 400 when id is missing', async () => {
      const request = createPatchRequest('/api/ideas', {
        status: 'accepted',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('returns 404 when idea not found', async () => {
      const request = createPatchRequest('/api/ideas', {
        id: 'nonexistent-id',
        status: 'accepted',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid status', async () => {
      const db = getTestDatabase();
      const idea = createTestIdea({ project_id: testProjectId, scan_id: testScanId });
      insertTestIdea(db, idea);

      const request = createPatchRequest('/api/ideas', {
        id: idea.id,
        status: 'invalid_status',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });

    it('updates user feedback', async () => {
      const db = getTestDatabase();
      const idea = createTestIdea({ project_id: testProjectId, scan_id: testScanId });
      insertTestIdea(db, idea);

      const request = createPatchRequest('/api/ideas', {
        id: idea.id,
        user_feedback: 'Great idea!',
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ idea: { user_feedback: string } }>(response);
      expect(body.idea.user_feedback).toBe('Great idea!');
    });
  });

  describe('DELETE', () => {
    it('deletes single idea', async () => {
      const db = getTestDatabase();
      const idea = createTestIdea({ project_id: testProjectId, scan_id: testScanId });
      insertTestIdea(db, idea);

      const request = createDeleteRequest('/api/ideas', { id: idea.id });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ success: boolean }>(response);
      expect(body.success).toBe(true);

      // Verify idea is deleted
      const deletedIdea = db.prepare('SELECT * FROM ideas WHERE id = ?').get(idea.id);
      expect(deletedIdea).toBeUndefined();
    });

    it('deletes all ideas when all=true', async () => {
      const db = getTestDatabase();
      const idea1 = createTestIdea({ project_id: testProjectId, scan_id: testScanId });
      const idea2 = createTestIdea({ project_id: testProjectId, scan_id: testScanId });
      insertTestIdea(db, idea1);
      insertTestIdea(db, idea2);

      const request = createDeleteRequest('/api/ideas', { all: 'true' });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const body = await parseJsonResponse<{ success: boolean; deletedCount: number }>(response);
      expect(body.success).toBe(true);
      expect(body.deletedCount).toBe(2);

      // Verify all ideas are deleted
      const remainingIdeas = db.prepare('SELECT * FROM ideas').all();
      expect(remainingIdeas).toHaveLength(0);
    });

    it('returns 400 when id is missing and all is not true', async () => {
      const request = createDeleteRequest('/api/ideas');
      const response = await DELETE(request);

      expect(response.status).toBe(400);
    });

    it('returns 404 when idea not found', async () => {
      const request = createDeleteRequest('/api/ideas', { id: 'nonexistent-id' });
      const response = await DELETE(request);

      expect(response.status).toBe(404);
    });
  });
});
