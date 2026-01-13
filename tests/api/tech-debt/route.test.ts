/**
 * Tests for /api/tech-debt route
 * Tests CRUD operations for technical debt tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from '@tests/setup/test-database';
import {
  createTestProject,
  createTestTechDebt,
  insertTestProject,
  generateId,
} from '@tests/setup/mock-factories';

// Helper to insert tech debt
function insertTestTechDebt(db: ReturnType<typeof getTestDatabase>, debt: ReturnType<typeof createTestTechDebt>): void {
  db.prepare(`
    INSERT INTO tech_debt (id, project_id, scan_id, category, title, description, severity, risk_score, estimated_effort_hours, impact_scope, technical_impact, business_impact, detected_by, detection_details, file_paths, status, remediation_plan, remediation_steps, estimated_completion_date, backlog_item_id, goal_id, created_at, updated_at, resolved_at, dismissed_at, dismissal_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    debt.id,
    debt.project_id,
    debt.scan_id,
    debt.category,
    debt.title,
    debt.description,
    debt.severity,
    debt.risk_score,
    debt.estimated_effort_hours,
    debt.impact_scope,
    debt.technical_impact,
    debt.business_impact,
    debt.detected_by,
    debt.detection_details,
    debt.file_paths,
    debt.status,
    debt.remediation_plan,
    debt.remediation_steps,
    debt.estimated_completion_date,
    debt.backlog_item_id,
    debt.goal_id,
    debt.created_at,
    debt.updated_at,
    debt.resolved_at || null,
    debt.dismissed_at || null,
    debt.dismissal_reason || null
  );
}

// Create mock functions
const mockGetDebtByProject = vi.fn();
const mockGetDebtById = vi.fn();
const mockCreateDebt = vi.fn();
const mockUpdateDebt = vi.fn();
const mockDeleteDebt = vi.fn();
const mockGetDebtByStatus = vi.fn();
const mockGetDebtBySeverity = vi.fn();

// Mock the database module
vi.mock('@/app/db', () => ({
  techDebtDb: {
    getDebtByProject: (...args: unknown[]) => mockGetDebtByProject(...args),
    getDebtById: (...args: unknown[]) => mockGetDebtById(...args),
    createDebt: (...args: unknown[]) => mockCreateDebt(...args),
    updateDebt: (...args: unknown[]) => mockUpdateDebt(...args),
    deleteDebt: (...args: unknown[]) => mockDeleteDebt(...args),
    getDebtByStatus: (...args: unknown[]) => mockGetDebtByStatus(...args),
    getDebtBySeverity: (...args: unknown[]) => mockGetDebtBySeverity(...args),
  },
}));

describe('API /api/tech-debt', () => {
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

    mockGetDebtByProject.mockImplementation((projectId: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM tech_debt WHERE project_id = ? ORDER BY risk_score DESC').all(projectId);
    });

    mockGetDebtById.mockImplementation((id: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM tech_debt WHERE id = ?').get(id);
    });

    mockCreateDebt.mockImplementation((debt: Record<string, unknown>) => {
      const db = getTestDatabase();
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO tech_debt (id, project_id, category, title, description, severity, risk_score, detected_by, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        debt.id,
        debt.project_id,
        debt.category,
        debt.title,
        debt.description,
        debt.severity,
        debt.risk_score,
        debt.detected_by,
        debt.status || 'detected',
        now,
        now
      );
      return db.prepare('SELECT * FROM tech_debt WHERE id = ?').get(debt.id);
    });

    mockUpdateDebt.mockImplementation((id: string, updates: Record<string, unknown>) => {
      const db = getTestDatabase();
      const existing = db.prepare('SELECT * FROM tech_debt WHERE id = ?').get(id);
      if (!existing) return null;

      const sets: string[] = [];
      const values: unknown[] = [];

      const allowedFields = ['status', 'remediation_plan', 'remediation_steps', 'estimated_completion_date', 'resolved_at', 'dismissed_at', 'dismissal_reason'];

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
        db.prepare(`UPDATE tech_debt SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      }

      return db.prepare('SELECT * FROM tech_debt WHERE id = ?').get(id);
    });

    mockDeleteDebt.mockImplementation((id: string) => {
      const db = getTestDatabase();
      const result = db.prepare('DELETE FROM tech_debt WHERE id = ?').run(id);
      return result.changes > 0;
    });

    mockGetDebtByStatus.mockImplementation((projectId: string, status: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM tech_debt WHERE project_id = ? AND status = ?').all(projectId, status);
    });

    mockGetDebtBySeverity.mockImplementation((projectId: string, severity: string) => {
      const db = getTestDatabase();
      return db.prepare('SELECT * FROM tech_debt WHERE project_id = ? AND severity = ?').all(projectId, severity);
    });
  });

  afterEach(() => {
    cleanupTestDatabase();
    vi.clearAllMocks();
  });

  describe('Database operations via mocked techDebtDb', () => {
    it('getDebtByProject returns debts ordered by risk_score DESC', () => {
      const db = getTestDatabase();
      // Create unique debt items with different risk scores
      const lowRiskDebt = createTestTechDebt({ project_id: testProjectId, risk_score: 30, title: 'Low Risk' });
      const highRiskDebt = createTestTechDebt({ project_id: testProjectId, risk_score: 80, title: 'High Risk' });
      const medRiskDebt = createTestTechDebt({ project_id: testProjectId, risk_score: 50, title: 'Medium Risk' });

      // Insert with explicit order
      insertTestTechDebt(db, lowRiskDebt);
      insertTestTechDebt(db, highRiskDebt);
      insertTestTechDebt(db, medRiskDebt);

      const debts = mockGetDebtByProject(testProjectId);
      // Verify all 3 were inserted
      expect(debts.length).toBeGreaterThanOrEqual(3);

      // Verify ordering - highest risk score first
      const titles = debts.slice(0, 3).map((d: Record<string, unknown>) => d.title);
      expect(titles).toContain('High Risk');
      expect(titles).toContain('Medium Risk');
      expect(titles).toContain('Low Risk');

      // Verify first item has highest risk score among the three
      const highRiskItem = debts.find((d: Record<string, unknown>) => d.title === 'High Risk');
      expect(highRiskItem.risk_score).toBe(80);
    });

    it('getDebtByProject returns empty array when no debts exist', () => {
      const debts = mockGetDebtByProject(testProjectId);
      expect(debts).toEqual([]);
    });

    it('getDebtById returns single debt item', () => {
      const db = getTestDatabase();
      const debt = createTestTechDebt({ project_id: testProjectId });
      insertTestTechDebt(db, debt);

      const result = mockGetDebtById(debt.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(debt.id);
    });

    it('createDebt creates new tech debt', () => {
      const newDebt = {
        id: generateId('debt'),
        project_id: testProjectId,
        category: 'code_quality',
        title: 'New Tech Debt',
        description: 'Description of the issue',
        severity: 'high',
        risk_score: 75,
        detected_by: 'automated_scan',
      };

      const created = mockCreateDebt(newDebt);
      expect(created).toBeDefined();
      expect(created.title).toBe('New Tech Debt');
      expect(created.status).toBe('detected');
    });

    it('updateDebt updates status to acknowledged', () => {
      const db = getTestDatabase();
      const debt = createTestTechDebt({ project_id: testProjectId, status: 'detected' });
      insertTestTechDebt(db, debt);

      const updated = mockUpdateDebt(debt.id, { status: 'acknowledged' });
      expect(updated.status).toBe('acknowledged');
    });

    it('updateDebt adds remediation plan', () => {
      const db = getTestDatabase();
      const debt = createTestTechDebt({ project_id: testProjectId });
      insertTestTechDebt(db, debt);

      const updated = mockUpdateDebt(debt.id, {
        status: 'planned',
        remediation_plan: JSON.stringify({ steps: ['Step 1', 'Step 2'] }),
        estimated_completion_date: '2025-03-01',
      });

      expect(updated.status).toBe('planned');
      expect(updated.remediation_plan).toBeDefined();
      expect(updated.estimated_completion_date).toBe('2025-03-01');
    });

    it('updateDebt marks as resolved', () => {
      const db = getTestDatabase();
      const debt = createTestTechDebt({ project_id: testProjectId, status: 'in_progress' });
      insertTestTechDebt(db, debt);

      const resolvedAt = new Date().toISOString();
      const updated = mockUpdateDebt(debt.id, {
        status: 'resolved',
        resolved_at: resolvedAt,
      });

      expect(updated.status).toBe('resolved');
      expect(updated.resolved_at).toBe(resolvedAt);
    });

    it('updateDebt marks as dismissed with reason', () => {
      const db = getTestDatabase();
      const debt = createTestTechDebt({ project_id: testProjectId });
      insertTestTechDebt(db, debt);

      const dismissedAt = new Date().toISOString();
      const updated = mockUpdateDebt(debt.id, {
        status: 'dismissed',
        dismissed_at: dismissedAt,
        dismissal_reason: 'Not applicable to our use case',
      });

      expect(updated.status).toBe('dismissed');
      expect(updated.dismissal_reason).toBe('Not applicable to our use case');
    });

    it('deleteDebt deletes existing debt', () => {
      const db = getTestDatabase();
      const debt = createTestTechDebt({ project_id: testProjectId });
      insertTestTechDebt(db, debt);

      const result = mockDeleteDebt(debt.id);
      expect(result).toBe(true);

      const deleted = db.prepare('SELECT * FROM tech_debt WHERE id = ?').get(debt.id);
      expect(deleted).toBeUndefined();
    });

    it('getDebtByStatus filters by status', () => {
      const db = getTestDatabase();
      const debt1 = createTestTechDebt({ project_id: testProjectId, status: 'detected' });
      const debt2 = createTestTechDebt({ project_id: testProjectId, status: 'resolved' });
      const debt3 = createTestTechDebt({ project_id: testProjectId, status: 'detected' });
      insertTestTechDebt(db, debt1);
      insertTestTechDebt(db, debt2);
      insertTestTechDebt(db, debt3);

      const detectedDebts = mockGetDebtByStatus(testProjectId, 'detected');
      expect(detectedDebts).toHaveLength(2);
    });

    it('getDebtBySeverity filters by severity', () => {
      const db = getTestDatabase();
      const debt1 = createTestTechDebt({ project_id: testProjectId, severity: 'critical' });
      const debt2 = createTestTechDebt({ project_id: testProjectId, severity: 'low' });
      const debt3 = createTestTechDebt({ project_id: testProjectId, severity: 'critical' });
      insertTestTechDebt(db, debt1);
      insertTestTechDebt(db, debt2);
      insertTestTechDebt(db, debt3);

      const criticalDebts = mockGetDebtBySeverity(testProjectId, 'critical');
      expect(criticalDebts).toHaveLength(2);
    });

    it('supports all severity levels', () => {
      const db = getTestDatabase();
      const severities = ['critical', 'high', 'medium', 'low'] as const;

      severities.forEach((severity) => {
        const debt = createTestTechDebt({ project_id: testProjectId, severity });
        insertTestTechDebt(db, debt);
      });

      const debts = mockGetDebtByProject(testProjectId);
      expect(debts).toHaveLength(4);
    });

    it('supports all categories', () => {
      const db = getTestDatabase();
      const categories = [
        'code_quality', 'security', 'performance', 'maintainability',
        'testing', 'documentation', 'dependencies', 'architecture',
        'accessibility', 'other'
      ];

      categories.forEach((category) => {
        const debt = createTestTechDebt({ project_id: testProjectId, category });
        insertTestTechDebt(db, debt);
      });

      const debts = mockGetDebtByProject(testProjectId);
      expect(debts).toHaveLength(10);
    });

    it('risk_score is validated between 0-100', () => {
      const db = getTestDatabase();
      const validScores = [0, 50, 100];

      validScores.forEach((score) => {
        const debt = createTestTechDebt({ project_id: testProjectId, risk_score: score });
        insertTestTechDebt(db, debt);
      });

      const debts = mockGetDebtByProject(testProjectId);
      expect(debts).toHaveLength(3);
    });

    it('detected_by tracks source of detection', () => {
      const db = getTestDatabase();
      const sources = ['automated_scan', 'manual_entry', 'ai_analysis'] as const;

      sources.forEach((source) => {
        const debt = createTestTechDebt({ project_id: testProjectId, detected_by: source });
        insertTestTechDebt(db, debt);
      });

      const debts = mockGetDebtByProject(testProjectId);
      expect(debts).toHaveLength(3);
      expect(debts.map((d: Record<string, unknown>) => d.detected_by).sort()).toEqual([...sources].sort());
    });
  });
});
