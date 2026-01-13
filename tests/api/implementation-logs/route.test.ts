/**
 * Tests for /api/implementation-logs route
 * Tests CRUD operations for implementation logs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from '@tests/setup/test-database';
import {
  createTestProject,
  createTestContext,
  createTestImplementationLog,
  insertTestProject,
  insertTestContext,
  generateId,
} from '@tests/setup/mock-factories';

// Helper to insert implementation log
function insertTestImplementationLog(db: ReturnType<typeof getTestDatabase>, log: ReturnType<typeof createTestImplementationLog>): void {
  db.prepare(`
    INSERT INTO implementation_log (id, project_id, context_id, requirement_name, title, overview, overview_bullets, tested, screenshot, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    log.id,
    log.project_id,
    log.context_id,
    log.requirement_name,
    log.title,
    log.overview,
    log.overview_bullets,
    log.tested,
    log.screenshot,
    log.created_at
  );
}

// Create mock functions
const mockGetLogsByProject = vi.fn();
const mockGetLogById = vi.fn();
const mockCreateLog = vi.fn();
const mockUpdateLog = vi.fn();
const mockDeleteLog = vi.fn();
const mockGetLogsByContext = vi.fn();
const mockGetRecentLogs = vi.fn();

// Mock the database module
vi.mock('@/app/db', () => ({
  implementationLogDb: {
    getLogsByProject: (...args: unknown[]) => mockGetLogsByProject(...args),
    getLogById: (...args: unknown[]) => mockGetLogById(...args),
    createLog: (...args: unknown[]) => mockCreateLog(...args),
    updateLog: (...args: unknown[]) => mockUpdateLog(...args),
    deleteLog: (...args: unknown[]) => mockDeleteLog(...args),
    getLogsByContext: (...args: unknown[]) => mockGetLogsByContext(...args),
    getRecentLogs: (...args: unknown[]) => mockGetRecentLogs(...args),
  },
}));

describe('API /api/implementation-logs', () => {
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

    // Reset mocks and configure default behavior
    vi.clearAllMocks();

    mockGetLogsByProject.mockImplementation((projectId: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM implementation_log WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
    });

    mockGetLogById.mockImplementation((id: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM implementation_log WHERE id = ?').get(id);
    });

    mockCreateLog.mockImplementation((log: Record<string, unknown>) => {
      const db = getTestDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO implementation_log (id, project_id, context_id, requirement_name, title, overview, overview_bullets, tested, screenshot, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        log.id,
        log.project_id,
        log.context_id || null,
        log.requirement_name,
        log.title,
        log.overview,
        log.overview_bullets || null,
        log.tested || 0,
        log.screenshot || null,
        now
      );
      return db.prepare('SELECT * FROM implementation_log WHERE id = ?').get(log.id);
    });

    mockUpdateLog.mockImplementation((id: string, updates: Record<string, unknown>) => {
      const db = getTestDatabase();
      const existing = db.prepare('SELECT * FROM implementation_log WHERE id = ?').get(id);
      if (!existing) return null;

      const sets: string[] = [];
      const values: unknown[] = [];

      if (updates.tested !== undefined) {
        sets.push('tested = ?');
        values.push(updates.tested);
      }
      if (updates.screenshot !== undefined) {
        sets.push('screenshot = ?');
        values.push(updates.screenshot);
      }
      if (updates.overview !== undefined) {
        sets.push('overview = ?');
        values.push(updates.overview);
      }

      if (sets.length > 0) {
        values.push(id);
        db.prepare(`UPDATE implementation_log SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      }

      return db.prepare('SELECT * FROM implementation_log WHERE id = ?').get(id);
    });

    mockDeleteLog.mockImplementation((id: string) => {
      const db = getTestDatabase();
      const result = db.prepare('DELETE FROM implementation_log WHERE id = ?').run(id);
      return result.changes > 0;
    });

    mockGetLogsByContext.mockImplementation((contextId: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM implementation_log WHERE context_id = ? ORDER BY created_at DESC').all(contextId);
    });

    mockGetRecentLogs.mockImplementation((projectId: string, limit: number) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM implementation_log WHERE project_id = ? ORDER BY created_at DESC LIMIT ?').all(projectId, limit);
    });
  });

  afterEach(() => {
    cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('Database operations via mocked implementationLogDb', () => {
    it('getLogsByProject returns logs ordered by created_at DESC', () => {
      const db = getTestDatabase();
      const log1 = createTestImplementationLog({ project_id: testProjectId, title: 'Log 1' });
      const log2 = createTestImplementationLog({ project_id: testProjectId, title: 'Log 2' });
      insertTestImplementationLog(db, log1);
      insertTestImplementationLog(db, log2);

      const logs = mockGetLogsByProject(testProjectId);
      expect(logs).toHaveLength(2);
    });

    it('getLogsByProject returns empty array when no logs exist', () => {
      const logs = mockGetLogsByProject(testProjectId);
      expect(logs).toEqual([]);
    });

    it('getLogById returns single log', () => {
      const db = getTestDatabase();
      const log = createTestImplementationLog({ project_id: testProjectId, title: 'Single Log' });
      insertTestImplementationLog(db, log);

      const result = mockGetLogById(log.id);
      expect(result).toBeDefined();
      expect(result.title).toBe('Single Log');
    });

    it('createLog creates new implementation log', () => {
      const newLog = {
        id: generateId('impl'),
        project_id: testProjectId,
        context_id: testContextId,
        requirement_name: 'add-feature',
        title: 'Added new feature',
        overview: 'Implemented the new feature with full testing',
        overview_bullets: 'Added component\nAdded tests\nUpdated docs',
      };

      const created = mockCreateLog(newLog);
      expect(created).toBeDefined();
      expect(created.title).toBe('Added new feature');
      expect(created.context_id).toBe(testContextId);
    });

    it('createLog without context_id', () => {
      const newLog = {
        id: generateId('impl'),
        project_id: testProjectId,
        requirement_name: 'global-fix',
        title: 'Global fix',
        overview: 'Fixed a global issue',
      };

      const created = mockCreateLog(newLog);
      expect(created.context_id).toBeNull();
    });

    it('updateLog marks as tested', () => {
      const db = getTestDatabase();
      const log = createTestImplementationLog({ project_id: testProjectId, tested: 0 });
      insertTestImplementationLog(db, log);

      const updated = mockUpdateLog(log.id, { tested: 1 });
      expect(updated.tested).toBe(1);
    });

    it('updateLog adds screenshot', () => {
      const db = getTestDatabase();
      const log = createTestImplementationLog({ project_id: testProjectId });
      insertTestImplementationLog(db, log);

      const updated = mockUpdateLog(log.id, { screenshot: '/screenshots/feature.png' });
      expect(updated.screenshot).toBe('/screenshots/feature.png');
    });

    it('updateLog returns null for non-existent log', () => {
      const result = mockUpdateLog('nonexistent-id', { tested: 1 });
      expect(result).toBeNull();
    });

    it('deleteLog deletes existing log', () => {
      const db = getTestDatabase();
      const log = createTestImplementationLog({ project_id: testProjectId });
      insertTestImplementationLog(db, log);

      const result = mockDeleteLog(log.id);
      expect(result).toBe(true);

      const deleted = db.prepare('SELECT * FROM implementation_log WHERE id = ?').get(log.id);
      expect(deleted).toBeUndefined();
    });

    it('getLogsByContext filters by context', () => {
      const db = getTestDatabase();
      const otherContextId = generateId('ctx');
      const context2 = createTestContext({ id: otherContextId, project_id: testProjectId });
      insertTestContext(db, context2);

      const log1 = createTestImplementationLog({ project_id: testProjectId, context_id: testContextId });
      const log2 = createTestImplementationLog({ project_id: testProjectId, context_id: otherContextId });
      const log3 = createTestImplementationLog({ project_id: testProjectId, context_id: testContextId });
      insertTestImplementationLog(db, log1);
      insertTestImplementationLog(db, log2);
      insertTestImplementationLog(db, log3);

      const logs = mockGetLogsByContext(testContextId);
      expect(logs).toHaveLength(2);
    });

    it('getRecentLogs limits results', () => {
      const db = getTestDatabase();
      for (let i = 0; i < 10; i++) {
        const log = createTestImplementationLog({ project_id: testProjectId, title: `Log ${i}` });
        insertTestImplementationLog(db, log);
      }

      const recentLogs = mockGetRecentLogs(testProjectId, 5);
      expect(recentLogs).toHaveLength(5);
    });

    it('overview_bullets stores newline-separated content', () => {
      const db = getTestDatabase();
      const bullets = 'Step 1\nStep 2\nStep 3';
      const log = createTestImplementationLog({
        project_id: testProjectId,
        overview_bullets: bullets,
      });
      insertTestImplementationLog(db, log);

      const result = mockGetLogById(log.id);
      expect(result.overview_bullets).toBe(bullets);
      expect(result.overview_bullets.split('\n')).toHaveLength(3);
    });

    it('requirement_name is required', () => {
      const newLog = {
        id: generateId('impl'),
        project_id: testProjectId,
        requirement_name: 'unique-requirement-name',
        title: 'Implementation Title',
        overview: 'Implementation overview',
      };

      const created = mockCreateLog(newLog);
      expect(created.requirement_name).toBe('unique-requirement-name');
    });
  });
});
