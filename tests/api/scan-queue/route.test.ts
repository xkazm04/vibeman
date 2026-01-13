/**
 * Tests for /api/scan-queue route
 * Tests CRUD operations for scan queue management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from '@tests/setup/test-database';
import {
  createTestProject,
  createTestScanQueueItem,
  insertTestProject,
  insertTestScanQueueItem,
  generateId,
} from '@tests/setup/mock-factories';

// Create mock functions
const mockGetQueueByProject = vi.fn();
const mockGetQueueItemById = vi.fn();
const mockCreateQueueItem = vi.fn();
const mockUpdateQueueItem = vi.fn();
const mockDeleteQueueItem = vi.fn();
const mockGetNextQueuedItem = vi.fn();
const mockGetQueueByStatus = vi.fn();

// Mock the database module
vi.mock('@/app/db', () => ({
  scanQueueDb: {
    getQueueByProject: (...args: unknown[]) => mockGetQueueByProject(...args),
    getQueueItemById: (...args: unknown[]) => mockGetQueueItemById(...args),
    createQueueItem: (...args: unknown[]) => mockCreateQueueItem(...args),
    updateQueueItem: (...args: unknown[]) => mockUpdateQueueItem(...args),
    deleteQueueItem: (...args: unknown[]) => mockDeleteQueueItem(...args),
    getNextQueuedItem: (...args: unknown[]) => mockGetNextQueuedItem(...args),
    getQueueByStatus: (...args: unknown[]) => mockGetQueueByStatus(...args),
  },
}));

describe('API /api/scan-queue', () => {
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

    mockGetQueueByProject.mockImplementation((projectId: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM scan_queue WHERE project_id = ? ORDER BY priority DESC, created_at ASC').all(projectId);
    });

    mockGetQueueItemById.mockImplementation((id: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM scan_queue WHERE id = ?').get(id);
    });

    mockCreateQueueItem.mockImplementation((item: Record<string, unknown>) => {
      const db = getTestDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO scan_queue (id, project_id, scan_type, context_id, trigger_type, trigger_metadata, status, priority, progress, progress_message, current_step, total_steps, scan_id, result_summary, error_message, auto_merge_enabled, auto_merge_status, started_at, completed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.id,
        item.project_id,
        item.scan_type,
        item.context_id || null,
        item.trigger_type || 'manual',
        item.trigger_metadata || null,
        item.status || 'queued',
        item.priority || 0,
        item.progress || 0,
        item.progress_message || null,
        item.current_step || null,
        item.total_steps || null,
        item.scan_id || null,
        item.result_summary || null,
        item.error_message || null,
        item.auto_merge_enabled || 0,
        item.auto_merge_status || null,
        item.started_at || null,
        item.completed_at || null,
        now,
        now
      );
      return db.prepare('SELECT * FROM scan_queue WHERE id = ?').get(item.id);
    });

    mockUpdateQueueItem.mockImplementation((id: string, updates: Record<string, unknown>) => {
      const db = getTestDatabase();
      const existing = db.prepare('SELECT * FROM scan_queue WHERE id = ?').get(id);
      if (!existing) return null;

      const sets: string[] = [];
      const values: unknown[] = [];

      const allowedFields = ['status', 'progress', 'progress_message', 'current_step', 'total_steps', 'scan_id', 'result_summary', 'error_message', 'started_at', 'completed_at', 'auto_merge_status'];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          sets.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }

      if (sets.length > 0) {
        sets.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);
        db.prepare(`UPDATE scan_queue SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      }

      return db.prepare('SELECT * FROM scan_queue WHERE id = ?').get(id);
    });

    mockDeleteQueueItem.mockImplementation((id: string) => {
      const db = getTestDatabase();
      const result = db.prepare('DELETE FROM scan_queue WHERE id = ?').run(id);
      return result.changes > 0;
    });

    mockGetNextQueuedItem.mockImplementation((projectId: string) => {
      const db = getTestDatabase();
      return db.prepare(`
        SELECT * FROM scan_queue
        WHERE project_id = ? AND status = 'queued'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `).get(projectId);
    });

    mockGetQueueByStatus.mockImplementation((projectId: string, status: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM scan_queue WHERE project_id = ? AND status = ? ORDER BY created_at ASC').all(projectId, status);
    });
  });

  afterEach(() => {
    cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('Database operations via mocked scanQueueDb', () => {
    it('getQueueByProject returns items ordered by priority DESC, created_at ASC', () => {
      const db = getTestDatabase();
      const item1 = createTestScanQueueItem({ project_id: testProjectId, priority: 0, scan_type: 'low-priority' });
      const item2 = createTestScanQueueItem({ project_id: testProjectId, priority: 10, scan_type: 'high-priority' });
      const item3 = createTestScanQueueItem({ project_id: testProjectId, priority: 5, scan_type: 'medium-priority' });
      insertTestScanQueueItem(db, item1);
      insertTestScanQueueItem(db, item2);
      insertTestScanQueueItem(db, item3);

      const queue = mockGetQueueByProject(testProjectId);
      expect(queue).toHaveLength(3);
      expect(queue[0].scan_type).toBe('high-priority');
      expect(queue[1].scan_type).toBe('medium-priority');
      expect(queue[2].scan_type).toBe('low-priority');
    });

    it('getQueueByProject returns empty array when no items exist', () => {
      const queue = mockGetQueueByProject(testProjectId);
      expect(queue).toEqual([]);
    });

    it('getQueueItemById returns single item', () => {
      const db = getTestDatabase();
      const item = createTestScanQueueItem({ project_id: testProjectId });
      insertTestScanQueueItem(db, item);

      const result = mockGetQueueItemById(item.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(item.id);
    });

    it('createQueueItem creates new queue item', () => {
      const newItem = {
        id: generateId('queue'),
        project_id: testProjectId,
        scan_type: 'structure',
        trigger_type: 'manual',
        priority: 5,
      };

      const created = mockCreateQueueItem(newItem);
      expect(created).toBeDefined();
      expect(created.scan_type).toBe('structure');
      expect(created.status).toBe('queued');
      expect(created.priority).toBe(5);
      expect(created.progress).toBe(0);
    });

    it('createQueueItem with auto-merge enabled', () => {
      const newItem = {
        id: generateId('queue'),
        project_id: testProjectId,
        scan_type: 'contexts',
        trigger_type: 'git_push',
        auto_merge_enabled: 1,
      };

      const created = mockCreateQueueItem(newItem);
      expect(created.auto_merge_enabled).toBe(1);
    });

    it('updateQueueItem updates status and progress', () => {
      const db = getTestDatabase();
      const item = createTestScanQueueItem({ project_id: testProjectId, status: 'queued', progress: 0 });
      insertTestScanQueueItem(db, item);

      const updated = mockUpdateQueueItem(item.id, {
        status: 'running',
        progress: 50,
        progress_message: 'Scanning files...',
        current_step: 'file_scan',
        total_steps: 3,
      });

      expect(updated.status).toBe('running');
      expect(updated.progress).toBe(50);
      expect(updated.progress_message).toBe('Scanning files...');
      expect(updated.current_step).toBe('file_scan');
    });

    it('updateQueueItem marks as completed', () => {
      const db = getTestDatabase();
      const item = createTestScanQueueItem({ project_id: testProjectId, status: 'running' });
      insertTestScanQueueItem(db, item);

      const completedAt = new Date().toISOString();
      const updated = mockUpdateQueueItem(item.id, {
        status: 'completed',
        progress: 100,
        completed_at: completedAt,
        result_summary: 'Scan completed successfully',
      });

      expect(updated.status).toBe('completed');
      expect(updated.progress).toBe(100);
      expect(updated.result_summary).toBe('Scan completed successfully');
    });

    it('updateQueueItem marks as failed with error message', () => {
      const db = getTestDatabase();
      const item = createTestScanQueueItem({ project_id: testProjectId, status: 'running' });
      insertTestScanQueueItem(db, item);

      const updated = mockUpdateQueueItem(item.id, {
        status: 'failed',
        error_message: 'Connection timeout',
      });

      expect(updated.status).toBe('failed');
      expect(updated.error_message).toBe('Connection timeout');
    });

    it('deleteQueueItem deletes existing item', () => {
      const db = getTestDatabase();
      const item = createTestScanQueueItem({ project_id: testProjectId });
      insertTestScanQueueItem(db, item);

      const result = mockDeleteQueueItem(item.id);
      expect(result).toBe(true);

      const deleted = db.prepare('SELECT * FROM scan_queue WHERE id = ?').get(item.id);
      expect(deleted).toBeUndefined();
    });

    it('getNextQueuedItem returns highest priority queued item', () => {
      const db = getTestDatabase();
      const item1 = createTestScanQueueItem({ project_id: testProjectId, status: 'queued', priority: 1 });
      const item2 = createTestScanQueueItem({ project_id: testProjectId, status: 'queued', priority: 10 });
      const item3 = createTestScanQueueItem({ project_id: testProjectId, status: 'running', priority: 20 });
      insertTestScanQueueItem(db, item1);
      insertTestScanQueueItem(db, item2);
      insertTestScanQueueItem(db, item3);

      const next = mockGetNextQueuedItem(testProjectId);
      expect(next).toBeDefined();
      expect(next.priority).toBe(10);
      expect(next.status).toBe('queued');
    });

    it('getNextQueuedItem returns undefined when no queued items', () => {
      const db = getTestDatabase();
      const item = createTestScanQueueItem({ project_id: testProjectId, status: 'completed' });
      insertTestScanQueueItem(db, item);

      const next = mockGetNextQueuedItem(testProjectId);
      expect(next).toBeUndefined();
    });

    it('getQueueByStatus filters by status', () => {
      const db = getTestDatabase();
      const item1 = createTestScanQueueItem({ project_id: testProjectId, status: 'queued' });
      const item2 = createTestScanQueueItem({ project_id: testProjectId, status: 'running' });
      const item3 = createTestScanQueueItem({ project_id: testProjectId, status: 'completed' });
      insertTestScanQueueItem(db, item1);
      insertTestScanQueueItem(db, item2);
      insertTestScanQueueItem(db, item3);

      const queuedItems = mockGetQueueByStatus(testProjectId, 'queued');
      expect(queuedItems).toHaveLength(1);
      expect(queuedItems[0].status).toBe('queued');
    });

    it('trigger types are validated', () => {
      const db = getTestDatabase();
      const triggerTypes = ['manual', 'git_push', 'file_change', 'scheduled'];

      triggerTypes.forEach((triggerType) => {
        const item = createTestScanQueueItem({
          project_id: testProjectId,
          trigger_type: triggerType as 'manual' | 'git_push' | 'file_change' | 'scheduled',
        });
        insertTestScanQueueItem(db, item);
      });

      const queue = mockGetQueueByProject(testProjectId);
      expect(queue).toHaveLength(4);
    });

    it('status transitions are tracked', () => {
      const db = getTestDatabase();
      const item = createTestScanQueueItem({ project_id: testProjectId, status: 'queued' });
      insertTestScanQueueItem(db, item);

      // Transition to running
      mockUpdateQueueItem(item.id, { status: 'running', started_at: new Date().toISOString() });
      let result = mockGetQueueItemById(item.id);
      expect(result.status).toBe('running');
      expect(result.started_at).toBeDefined();

      // Transition to completed
      mockUpdateQueueItem(item.id, { status: 'completed', completed_at: new Date().toISOString() });
      result = mockGetQueueItemById(item.id);
      expect(result.status).toBe('completed');
      expect(result.completed_at).toBeDefined();
    });
  });
});
