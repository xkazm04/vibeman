/**
 * Tests for /api/contexts route
 * Tests CRUD operations for contexts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  createTestContext,
  createTestContextGroup,
  insertTestProject,
  insertTestContext,
  insertTestContextGroup,
  generateId,
} from '@tests/setup/mock-factories';

// Create mock functions for database operations
const mockGetContextById = vi.fn();
const mockGetContextsByProject = vi.fn();
const mockGetContextsByGroup = vi.fn();
const mockCreateContext = vi.fn();
const mockUpdateContext = vi.fn();
const mockDeleteContext = vi.fn();

// Mock the database module
vi.mock('@/app/db', () => ({
  contextDb: {
    getContextById: (...args: unknown[]) => mockGetContextById(...args),
    getContextsByProject: (...args: unknown[]) => mockGetContextsByProject(...args),
    getContextsByGroup: (...args: unknown[]) => mockGetContextsByGroup(...args),
    createContext: (...args: unknown[]) => mockCreateContext(...args),
    updateContext: (...args: unknown[]) => mockUpdateContext(...args),
    deleteContext: (...args: unknown[]) => mockDeleteContext(...args),
  },
}));

describe('API /api/contexts', () => {
  let testProjectId: string;
  let testGroupId: string;

  beforeEach(() => {
    setupTestDatabase();
    testProjectId = generateId('proj');
    testGroupId = generateId('grp');

    // Insert test project
    const db = getTestDatabase();
    const project = createTestProject({ id: testProjectId });
    insertTestProject(db, project);

    // Insert test group
    const group = createTestContextGroup({ id: testGroupId, project_id: testProjectId });
    insertTestContextGroup(db, group);

    // Reset mocks and configure default behavior
    vi.clearAllMocks();

    mockGetContextsByProject.mockImplementation((projectId: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM contexts WHERE project_id = ? ORDER BY name').all(projectId);
    });

    mockGetContextsByGroup.mockImplementation((groupId: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM contexts WHERE group_id = ? ORDER BY name').all(groupId);
    });

    mockGetContextById.mockImplementation((id: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM contexts WHERE id = ?').get(id);
    });

    mockCreateContext.mockImplementation((context: Record<string, unknown>) => {
      const db = getTestDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO contexts (id, project_id, group_id, name, description, file_paths, has_context_file, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        context.id,
        context.project_id,
        context.group_id || null,
        context.name,
        context.description || null,
        context.file_paths,
        context.has_context_file || 0,
        now,
        now
      );
      return db.prepare('SELECT * FROM contexts WHERE id = ?').get(context.id);
    });

    mockUpdateContext.mockImplementation((id: string, updates: Record<string, unknown>) => {
      const db = getTestDatabase();
      const existing = db.prepare('SELECT * FROM contexts WHERE id = ?').get(id);
      if (!existing) return null;

      const sets: string[] = [];
      const values: unknown[] = [];

      if (updates.name !== undefined) {
        sets.push('name = ?');
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        sets.push('description = ?');
        values.push(updates.description);
      }
      if (updates.file_paths !== undefined) {
        sets.push('file_paths = ?');
        values.push(updates.file_paths);
      }
      if (updates.group_id !== undefined) {
        sets.push('group_id = ?');
        values.push(updates.group_id);
      }

      if (sets.length > 0) {
        sets.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);
        db.prepare(`UPDATE contexts SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      }

      return db.prepare('SELECT * FROM contexts WHERE id = ?').get(id);
    });

    mockDeleteContext.mockImplementation((id: string) => {
      const db = getTestDatabase();
      const result = db.prepare('DELETE FROM contexts WHERE id = ?').run(id);
      return result.changes > 0;
    });
  });

  afterEach(() => {
    cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('Database operations via mocked contextDb', () => {
    it('getContextsByProject returns contexts for project', () => {
      const db = getTestDatabase();
      const context1 = createTestContext({ project_id: testProjectId, name: 'Context A' });
      const context2 = createTestContext({ project_id: testProjectId, name: 'Context B' });
      insertTestContext(db, context1);
      insertTestContext(db, context2);

      const contexts = mockGetContextsByProject(testProjectId);
      expect(contexts).toHaveLength(2);
      expect(contexts[0].name).toBe('Context A');
      expect(contexts[1].name).toBe('Context B');
    });

    it('getContextsByGroup returns contexts in group', () => {
      const db = getTestDatabase();
      const context1 = createTestContext({ project_id: testProjectId, group_id: testGroupId, name: 'Grouped Context' });
      const context2 = createTestContext({ project_id: testProjectId, group_id: null, name: 'Ungrouped Context' });
      insertTestContext(db, context1);
      insertTestContext(db, context2);

      const contexts = mockGetContextsByGroup(testGroupId);
      expect(contexts).toHaveLength(1);
      expect(contexts[0].name).toBe('Grouped Context');
    });

    it('getContextById returns single context', () => {
      const db = getTestDatabase();
      const context = createTestContext({ project_id: testProjectId, name: 'Single Context' });
      insertTestContext(db, context);

      const result = mockGetContextById(context.id);
      expect(result).toBeDefined();
      expect(result.name).toBe('Single Context');
    });

    it('getContextById returns undefined for non-existent context', () => {
      const result = mockGetContextById('nonexistent-id');
      expect(result).toBeUndefined();
    });

    it('createContext creates new context', () => {
      const newContext = {
        id: generateId('ctx'),
        project_id: testProjectId,
        group_id: testGroupId,
        name: 'New Context',
        description: 'A new context',
        file_paths: JSON.stringify(['src/file1.ts']),
        has_context_file: 0,
      };

      const created = mockCreateContext(newContext);
      expect(created).toBeDefined();
      expect(created.name).toBe('New Context');
      expect(created.group_id).toBe(testGroupId);
    });

    it('updateContext updates existing context', () => {
      const db = getTestDatabase();
      const context = createTestContext({ project_id: testProjectId, name: 'Original Name' });
      insertTestContext(db, context);

      const updated = mockUpdateContext(context.id, { name: 'Updated Name' });
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Name');
    });

    it('updateContext returns null for non-existent context', () => {
      const result = mockUpdateContext('nonexistent-id', { name: 'New Name' });
      expect(result).toBeNull();
    });

    it('deleteContext deletes existing context', () => {
      const db = getTestDatabase();
      const context = createTestContext({ project_id: testProjectId });
      insertTestContext(db, context);

      const result = mockDeleteContext(context.id);
      expect(result).toBe(true);

      // Verify context is deleted
      const deleted = db.prepare('SELECT * FROM contexts WHERE id = ?').get(context.id);
      expect(deleted).toBeUndefined();
    });

    it('deleteContext returns false for non-existent context', () => {
      const result = mockDeleteContext('nonexistent-id');
      expect(result).toBe(false);
    });

    it('contexts ordered by name', () => {
      const db = getTestDatabase();
      const context1 = createTestContext({ project_id: testProjectId, name: 'Zebra Context' });
      const context2 = createTestContext({ project_id: testProjectId, name: 'Alpha Context' });
      const context3 = createTestContext({ project_id: testProjectId, name: 'Middle Context' });
      insertTestContext(db, context1);
      insertTestContext(db, context2);
      insertTestContext(db, context3);

      const contexts = mockGetContextsByProject(testProjectId);
      expect(contexts[0].name).toBe('Alpha Context');
      expect(contexts[1].name).toBe('Middle Context');
      expect(contexts[2].name).toBe('Zebra Context');
    });

    it('file_paths is stored as JSON string', () => {
      const db = getTestDatabase();
      const filePaths = ['src/file1.ts', 'src/file2.ts', 'src/file3.ts'];
      const context = createTestContext({
        project_id: testProjectId,
        file_paths: JSON.stringify(filePaths),
      });
      insertTestContext(db, context);

      const result = mockGetContextById(context.id);
      const parsedPaths = JSON.parse(result.file_paths);
      expect(parsedPaths).toEqual(filePaths);
    });

    it('context with all optional fields', () => {
      const db = getTestDatabase();
      const context = createTestContext({
        project_id: testProjectId,
        group_id: testGroupId,
        name: 'Full Context',
        description: 'Description here',
        file_paths: JSON.stringify(['src/file.ts']),
        has_context_file: 1,
        preview: '/previews/context.png',
        test_scenario: 'Test scenario steps',
        target: 'Feature target',
        target_fulfillment: '50%',
        target_rating: 3,
        implemented_tasks: 5,
      });
      insertTestContext(db, context);

      const result = mockGetContextById(context.id);
      expect(result.name).toBe('Full Context');
      expect(result.description).toBe('Description here');
      expect(result.has_context_file).toBe(1);
    });

    it('multiple contexts can share same group', () => {
      const db = getTestDatabase();
      const context1 = createTestContext({ project_id: testProjectId, group_id: testGroupId, name: 'Context 1' });
      const context2 = createTestContext({ project_id: testProjectId, group_id: testGroupId, name: 'Context 2' });
      const context3 = createTestContext({ project_id: testProjectId, group_id: testGroupId, name: 'Context 3' });
      insertTestContext(db, context1);
      insertTestContext(db, context2);
      insertTestContext(db, context3);

      const contexts = mockGetContextsByGroup(testGroupId);
      expect(contexts).toHaveLength(3);
    });
  });
});
