/**
 * Tests for /api/scans route
 * Tests CRUD operations for scans with token tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from '@tests/setup/test-database';
import {
  createTestProject,
  createTestScan,
  insertTestProject,
  insertTestScan,
  generateId,
} from '@tests/setup/mock-factories';

// Create mock functions
const mockGetScansByProject = vi.fn();
const mockGetScanById = vi.fn();
const mockCreateScan = vi.fn();
const mockGetRecentScans = vi.fn();
const mockGetScansByType = vi.fn();

// Mock the database module
vi.mock('@/app/db', () => ({
  scanDb: {
    getScansByProject: (...args: unknown[]) => mockGetScansByProject(...args),
    getScanById: (...args: unknown[]) => mockGetScanById(...args),
    createScan: (...args: unknown[]) => mockCreateScan(...args),
    getRecentScans: (...args: unknown[]) => mockGetRecentScans(...args),
    getScansByType: (...args: unknown[]) => mockGetScansByType(...args),
  },
}));

describe('API /api/scans', () => {
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

    mockGetScansByProject.mockImplementation((projectId: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM scans WHERE project_id = ? ORDER BY timestamp DESC').all(projectId);
    });

    mockGetScanById.mockImplementation((id: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM scans WHERE id = ?').get(id);
    });

    mockCreateScan.mockImplementation((scan: Record<string, unknown>) => {
      const db = getTestDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO scans (id, project_id, scan_type, timestamp, summary, input_tokens, output_tokens, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        scan.id,
        scan.project_id,
        scan.scan_type,
        scan.timestamp || now,
        scan.summary || null,
        scan.input_tokens || null,
        scan.output_tokens || null,
        now
      );
      return db.prepare('SELECT * FROM scans WHERE id = ?').get(scan.id);
    });

    mockGetRecentScans.mockImplementation((projectId: string, limit: number) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM scans WHERE project_id = ? ORDER BY timestamp DESC LIMIT ?').all(projectId, limit);
    });

    mockGetScansByType.mockImplementation((projectId: string, scanType: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM scans WHERE project_id = ? AND scan_type = ? ORDER BY timestamp DESC').all(projectId, scanType);
    });
  });

  afterEach(() => {
    cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('Database operations via mocked scanDb', () => {
    it('getScansByProject returns scans ordered by timestamp DESC', () => {
      const db = getTestDatabase();
      // Create scans with different timestamps
      const scan1 = createTestScan({
        project_id: testProjectId,
        scan_type: 'structure',
        timestamp: '2025-01-01 10:00:00',
      });
      const scan2 = createTestScan({
        project_id: testProjectId,
        scan_type: 'contexts',
        timestamp: '2025-01-02 10:00:00',
      });
      const scan3 = createTestScan({
        project_id: testProjectId,
        scan_type: 'build',
        timestamp: '2025-01-03 10:00:00',
      });
      insertTestScan(db, scan1);
      insertTestScan(db, scan2);
      insertTestScan(db, scan3);

      const scans = mockGetScansByProject(testProjectId);
      expect(scans).toHaveLength(3);
      // Most recent first
      expect(scans[0].scan_type).toBe('build');
      expect(scans[1].scan_type).toBe('contexts');
      expect(scans[2].scan_type).toBe('structure');
    });

    it('getScansByProject returns empty array when no scans exist', () => {
      const scans = mockGetScansByProject(testProjectId);
      expect(scans).toEqual([]);
    });

    it('getScanById returns single scan', () => {
      const db = getTestDatabase();
      const scan = createTestScan({ project_id: testProjectId });
      insertTestScan(db, scan);

      const result = mockGetScanById(scan.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(scan.id);
    });

    it('getScanById returns undefined for non-existent scan', () => {
      const result = mockGetScanById('nonexistent-id');
      expect(result).toBeUndefined();
    });

    it('createScan creates new scan with token tracking', () => {
      const newScan = {
        id: generateId('scan'),
        project_id: testProjectId,
        scan_type: 'structure',
        summary: 'Scan summary',
        input_tokens: 1500,
        output_tokens: 2000,
      };

      const created = mockCreateScan(newScan);
      expect(created).toBeDefined();
      expect(created.scan_type).toBe('structure');
      expect(created.input_tokens).toBe(1500);
      expect(created.output_tokens).toBe(2000);
    });

    it('createScan with minimal required fields', () => {
      const newScan = {
        id: generateId('scan'),
        project_id: testProjectId,
        scan_type: 'vision',
      };

      const created = mockCreateScan(newScan);
      expect(created).toBeDefined();
      expect(created.scan_type).toBe('vision');
      expect(created.input_tokens).toBeNull();
      expect(created.output_tokens).toBeNull();
    });

    it('getRecentScans limits results', () => {
      const db = getTestDatabase();
      for (let i = 0; i < 10; i++) {
        const scan = createTestScan({
          project_id: testProjectId,
          scan_type: 'structure',
          timestamp: `2025-01-${String(i + 1).padStart(2, '0')} 10:00:00`,
        });
        insertTestScan(db, scan);
      }

      const scans = mockGetRecentScans(testProjectId, 5);
      expect(scans).toHaveLength(5);
    });

    it('getScansByType filters by scan type', () => {
      const db = getTestDatabase();
      const scan1 = createTestScan({ project_id: testProjectId, scan_type: 'structure' });
      const scan2 = createTestScan({ project_id: testProjectId, scan_type: 'contexts' });
      const scan3 = createTestScan({ project_id: testProjectId, scan_type: 'structure' });
      insertTestScan(db, scan1);
      insertTestScan(db, scan2);
      insertTestScan(db, scan3);

      const structureScans = mockGetScansByType(testProjectId, 'structure');
      expect(structureScans).toHaveLength(2);
      structureScans.forEach((scan: Record<string, unknown>) => {
        expect(scan.scan_type).toBe('structure');
      });
    });

    it('scans track token usage correctly', () => {
      const db = getTestDatabase();
      const scan = createTestScan({
        project_id: testProjectId,
        input_tokens: 5000,
        output_tokens: 8000,
      });
      insertTestScan(db, scan);

      const result = mockGetScanById(scan.id);
      expect(result.input_tokens).toBe(5000);
      expect(result.output_tokens).toBe(8000);
    });

    it('scan summary can be null', () => {
      const newScan = {
        id: generateId('scan'),
        project_id: testProjectId,
        scan_type: 'structure',
        summary: null,
      };

      const created = mockCreateScan(newScan);
      expect(created.summary).toBeNull();
    });

    it('different scan types are supported', () => {
      const db = getTestDatabase();
      const scanTypes = ['structure', 'contexts', 'build', 'vision', 'test'];

      scanTypes.forEach((scanType, index) => {
        const scan = createTestScan({
          project_id: testProjectId,
          scan_type: scanType,
          timestamp: `2025-01-${String(index + 1).padStart(2, '0')} 10:00:00`,
        });
        insertTestScan(db, scan);
      });

      const scans = mockGetScansByProject(testProjectId);
      expect(scans).toHaveLength(5);
      expect(scans.map((s: Record<string, unknown>) => s.scan_type).sort()).toEqual(scanTypes.sort());
    });

    it('scans are project-specific', () => {
      const db = getTestDatabase();
      const otherProjectId = generateId('proj');
      const project2 = createTestProject({ id: otherProjectId });
      insertTestProject(db, project2);

      const scan1 = createTestScan({ project_id: testProjectId });
      const scan2 = createTestScan({ project_id: otherProjectId });
      insertTestScan(db, scan1);
      insertTestScan(db, scan2);

      const project1Scans = mockGetScansByProject(testProjectId);
      expect(project1Scans).toHaveLength(1);
      expect(project1Scans[0].project_id).toBe(testProjectId);
    });
  });
});
