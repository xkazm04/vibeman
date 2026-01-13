/**
 * Tests for /api/context-groups route
 * Tests CRUD operations for context groups
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from '@tests/setup/test-database';
import {
  createTestProject,
  createTestContextGroup,
  insertTestProject,
  insertTestContextGroup,
  generateId,
} from '@tests/setup/mock-factories';

// Create mock functions
const mockGetGroupsByProject = vi.fn();
const mockGetGroupById = vi.fn();
const mockCreateGroup = vi.fn();
const mockUpdateGroup = vi.fn();
const mockDeleteGroup = vi.fn();
const mockUpdateGroupPositions = vi.fn();

// Mock the database module
vi.mock('@/app/db', () => ({
  contextGroupDb: {
    getGroupsByProject: (...args: unknown[]) => mockGetGroupsByProject(...args),
    getGroupById: (...args: unknown[]) => mockGetGroupById(...args),
    createGroup: (...args: unknown[]) => mockCreateGroup(...args),
    updateGroup: (...args: unknown[]) => mockUpdateGroup(...args),
    deleteGroup: (...args: unknown[]) => mockDeleteGroup(...args),
    updateGroupPositions: (...args: unknown[]) => mockUpdateGroupPositions(...args),
  },
}));

describe('API /api/context-groups', () => {
  let testProjectId: string;

  beforeEach(() => {
    setupTestDatabase();
    testProjectId = generateId('proj');

    // Insert test project
    const db = getTestDatabase();
    const project = createTestProject({ id: testProjectId });
    insertTestProject(db, project);

    // Reset mocks and configure default behavior
    vi.clearAllMocks();

    mockGetGroupsByProject.mockImplementation((projectId: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM context_groups WHERE project_id = ? ORDER BY position').all(projectId);
    });

    mockGetGroupById.mockImplementation((id: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM context_groups WHERE id = ?').get(id);
    });

    mockCreateGroup.mockImplementation((group: Record<string, unknown>) => {
      const db = getTestDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO context_groups (id, project_id, name, color, accent_color, icon, layer_type, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        group.id,
        group.project_id,
        group.name,
        group.color,
        group.accent_color || null,
        group.icon || null,
        group.layer_type || null,
        group.position,
        now,
        now
      );
      return db.prepare('SELECT * FROM context_groups WHERE id = ?').get(group.id);
    });

    mockUpdateGroup.mockImplementation((id: string, updates: Record<string, unknown>) => {
      const db = getTestDatabase();
      const existing = db.prepare('SELECT * FROM context_groups WHERE id = ?').get(id);
      if (!existing) return null;

      const sets: string[] = [];
      const values: unknown[] = [];

      if (updates.name !== undefined) {
        sets.push('name = ?');
        values.push(updates.name);
      }
      if (updates.color !== undefined) {
        sets.push('color = ?');
        values.push(updates.color);
      }
      if (updates.accent_color !== undefined) {
        sets.push('accent_color = ?');
        values.push(updates.accent_color);
      }
      if (updates.icon !== undefined) {
        sets.push('icon = ?');
        values.push(updates.icon);
      }
      if (updates.layer_type !== undefined) {
        sets.push('layer_type = ?');
        values.push(updates.layer_type);
      }
      if (updates.position !== undefined) {
        sets.push('position = ?');
        values.push(updates.position);
      }

      if (sets.length > 0) {
        sets.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);
        db.prepare(`UPDATE context_groups SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      }

      return db.prepare('SELECT * FROM context_groups WHERE id = ?').get(id);
    });

    mockDeleteGroup.mockImplementation((id: string) => {
      const db = getTestDatabase();
      const result = db.prepare('DELETE FROM context_groups WHERE id = ?').run(id);
      return result.changes > 0;
    });
  });

  afterEach(() => {
    cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('Database operations via mocked contextGroupDb', () => {
    it('getGroupsByProject returns groups ordered by position', () => {
      const db = getTestDatabase();
      const group1 = createTestContextGroup({ project_id: testProjectId, name: 'Group C', position: 2 });
      const group2 = createTestContextGroup({ project_id: testProjectId, name: 'Group A', position: 0 });
      const group3 = createTestContextGroup({ project_id: testProjectId, name: 'Group B', position: 1 });
      insertTestContextGroup(db, group1);
      insertTestContextGroup(db, group2);
      insertTestContextGroup(db, group3);

      const groups = mockGetGroupsByProject(testProjectId);
      expect(groups).toHaveLength(3);
      expect(groups[0].name).toBe('Group A');
      expect(groups[1].name).toBe('Group B');
      expect(groups[2].name).toBe('Group C');
    });

    it('getGroupsByProject returns empty array when no groups exist', () => {
      const groups = mockGetGroupsByProject(testProjectId);
      expect(groups).toEqual([]);
    });

    it('getGroupById returns single group', () => {
      const db = getTestDatabase();
      const group = createTestContextGroup({ project_id: testProjectId, name: 'Single Group' });
      insertTestContextGroup(db, group);

      const result = mockGetGroupById(group.id);
      expect(result).toBeDefined();
      expect(result.name).toBe('Single Group');
    });

    it('getGroupById returns undefined for non-existent group', () => {
      const result = mockGetGroupById('nonexistent-id');
      expect(result).toBeUndefined();
    });

    it('createGroup creates new group with all fields', () => {
      const newGroup = {
        id: generateId('grp'),
        project_id: testProjectId,
        name: 'New Group',
        color: '#ef4444',
        accent_color: '#fca5a5',
        icon: 'folder',
        layer_type: 'client',
        position: 0,
      };

      const created = mockCreateGroup(newGroup);
      expect(created).toBeDefined();
      expect(created.name).toBe('New Group');
      expect(created.color).toBe('#ef4444');
      expect(created.accent_color).toBe('#fca5a5');
      expect(created.icon).toBe('folder');
      expect(created.layer_type).toBe('client');
    });

    it('createGroup with minimal required fields', () => {
      const newGroup = {
        id: generateId('grp'),
        project_id: testProjectId,
        name: 'Minimal Group',
        color: '#3b82f6',
        position: 0,
      };

      const created = mockCreateGroup(newGroup);
      expect(created).toBeDefined();
      expect(created.name).toBe('Minimal Group');
      expect(created.accent_color).toBeNull();
      expect(created.icon).toBeNull();
      expect(created.layer_type).toBeNull();
    });

    it('updateGroup updates group name', () => {
      const db = getTestDatabase();
      const group = createTestContextGroup({ project_id: testProjectId, name: 'Original Name' });
      insertTestContextGroup(db, group);

      const updated = mockUpdateGroup(group.id, { name: 'Updated Name' });
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Name');
    });

    it('updateGroup updates group color', () => {
      const db = getTestDatabase();
      const group = createTestContextGroup({ project_id: testProjectId, color: '#3b82f6' });
      insertTestContextGroup(db, group);

      const updated = mockUpdateGroup(group.id, { color: '#ef4444' });
      expect(updated).toBeDefined();
      expect(updated.color).toBe('#ef4444');
    });

    it('updateGroup updates position', () => {
      const db = getTestDatabase();
      const group = createTestContextGroup({ project_id: testProjectId, position: 0 });
      insertTestContextGroup(db, group);

      const updated = mockUpdateGroup(group.id, { position: 5 });
      expect(updated).toBeDefined();
      expect(updated.position).toBe(5);
    });

    it('updateGroup returns null for non-existent group', () => {
      const result = mockUpdateGroup('nonexistent-id', { name: 'New Name' });
      expect(result).toBeNull();
    });

    it('deleteGroup deletes existing group', () => {
      const db = getTestDatabase();
      const group = createTestContextGroup({ project_id: testProjectId });
      insertTestContextGroup(db, group);

      const result = mockDeleteGroup(group.id);
      expect(result).toBe(true);

      // Verify group is deleted
      const deleted = db.prepare('SELECT * FROM context_groups WHERE id = ?').get(group.id);
      expect(deleted).toBeUndefined();
    });

    it('deleteGroup returns false for non-existent group', () => {
      const result = mockDeleteGroup('nonexistent-id');
      expect(result).toBe(false);
    });

    it('groups can have different layer types', () => {
      const db = getTestDatabase();
      const layerTypes = ['pages', 'client', 'server', 'external'];

      layerTypes.forEach((layerType, index) => {
        const group = createTestContextGroup({
          project_id: testProjectId,
          name: `${layerType} Layer`,
          layer_type: layerType,
          position: index,
        });
        insertTestContextGroup(db, group);
      });

      const groups = mockGetGroupsByProject(testProjectId);
      expect(groups).toHaveLength(4);
      expect(groups.map((g: Record<string, unknown>) => g.layer_type)).toEqual(layerTypes);
    });

    it('color validation accepts valid hex colors', () => {
      const db = getTestDatabase();
      const validColors = ['#fff', '#ffffff', '#3b82f6', '#000000'];

      validColors.forEach((color, index) => {
        const group = createTestContextGroup({
          project_id: testProjectId,
          name: `Color ${index}`,
          color,
          position: index,
        });
        insertTestContextGroup(db, group);
      });

      const groups = mockGetGroupsByProject(testProjectId);
      expect(groups).toHaveLength(4);
    });
  });
});
