/**
 * Hypothesis-Driven Testing Repository
 * Handles CRUD operations for hypotheses, invariants, fuzz sessions, property tests, and test knowledge
 */

import { getConnection } from '../drivers';
import { v4 as uuidv4 } from 'uuid';
import type {
  DbHypothesis,
  Hypothesis,
  CreateHypothesisInput,
  UpdateHypothesisInput,
  HypothesisEvidence,
  HypothesisStatus,
  HypothesisType,
  DbInvariant,
  Invariant,
  CreateInvariantInput,
  InvariantViolation,
  DbFuzzSession,
  FuzzSession,
  CreateFuzzSessionInput,
  FuzzFinding,
  VulnerabilityClass,
  DbPropertyTest,
  PropertyTest,
  CreatePropertyTestInput,
  DbTestKnowledge,
  TestKnowledge,
  CreateTestKnowledgeInput,
  HypothesisTestingSummary,
} from '../models/hypothesis-testing.types';

// ============== Parsing Functions ==============

function parseHypothesis(db: DbHypothesis): Hypothesis {
  return {
    ...db,
    target_lines: db.target_lines ? JSON.parse(db.target_lines) : null,
    evidence: db.evidence ? JSON.parse(db.evidence) : [],
  };
}

function parseInvariant(db: DbInvariant): Invariant {
  return {
    ...db,
    validated: Boolean(db.validated),
    auto_generated: Boolean(db.auto_generated),
    last_violation: db.last_violation ? JSON.parse(db.last_violation) : null,
  };
}

function parseFuzzSession(db: DbFuzzSession): FuzzSession {
  return {
    ...db,
    vulnerability_targets: db.vulnerability_targets ? JSON.parse(db.vulnerability_targets) : [],
    findings: db.findings ? JSON.parse(db.findings) : [],
    best_inputs: db.best_inputs ? JSON.parse(db.best_inputs) : [],
  };
}

function parsePropertyTest(db: DbPropertyTest): PropertyTest {
  return {
    ...db,
    counterexamples: db.counterexamples ? JSON.parse(db.counterexamples) : [],
    shrunk_example: db.shrunk_example ? JSON.parse(db.shrunk_example) : null,
  };
}

function parseTestKnowledge(db: DbTestKnowledge): TestKnowledge {
  return {
    ...db,
    related_files: db.related_files ? JSON.parse(db.related_files) : [],
    related_functions: db.related_functions ? JSON.parse(db.related_functions) : null,
    recommendations: db.recommendations ? JSON.parse(db.recommendations) : null,
    acknowledged: Boolean(db.acknowledged),
    resolved: Boolean(db.resolved),
  };
}

// ============== Hypothesis Repository ==============

export const hypothesisRepository = {
  /**
   * Get all hypotheses for a project
   */
  getAllByProject(projectId: string): Hypothesis[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM hypotheses
      WHERE project_id = ?
      ORDER BY priority DESC, created_at DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbHypothesis[];
    return rows.map(parseHypothesis);
  },

  /**
   * Get hypotheses by context
   */
  getAllByContext(contextId: string): Hypothesis[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM hypotheses
      WHERE context_id = ?
      ORDER BY priority DESC, created_at DESC
    `);
    const rows = stmt.all(contextId) as unknown as DbHypothesis[];
    return rows.map(parseHypothesis);
  },

  /**
   * Get hypothesis by ID
   */
  getById(id: string): Hypothesis | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM hypotheses WHERE id = ?');
    const row = stmt.get(id) as DbHypothesis | undefined;
    return row ? parseHypothesis(row) : null;
  },

  /**
   * Get hypotheses by status
   */
  getByStatus(projectId: string, status: HypothesisStatus): Hypothesis[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM hypotheses
      WHERE project_id = ? AND status = ?
      ORDER BY priority DESC, created_at DESC
    `);
    const rows = stmt.all(projectId, status) as unknown as DbHypothesis[];
    return rows.map(parseHypothesis);
  },

  /**
   * Get hypotheses by type
   */
  getByType(projectId: string, type: HypothesisType): Hypothesis[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM hypotheses
      WHERE project_id = ? AND hypothesis_type = ?
      ORDER BY priority DESC, created_at DESC
    `);
    const rows = stmt.all(projectId, type) as unknown as DbHypothesis[];
    return rows.map(parseHypothesis);
  },

  /**
   * Get hypotheses targeting a specific file
   */
  getByTargetFile(projectId: string, filePath: string): Hypothesis[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM hypotheses
      WHERE project_id = ? AND target_code LIKE ?
      ORDER BY priority DESC, created_at DESC
    `);
    const rows = stmt.all(projectId, `%${filePath}%`) as unknown as DbHypothesis[];
    return rows.map(parseHypothesis);
  },

  /**
   * Create a new hypothesis
   */
  create(input: CreateHypothesisInput): Hypothesis {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO hypotheses (
        id, project_id, context_id, title, statement, hypothesis_type,
        target_code, target_lines, reasoning, confidence, discovery_source,
        verification_method, priority, risk_level, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.project_id,
      input.context_id || null,
      input.title,
      input.statement,
      input.hypothesis_type,
      input.target_code,
      input.target_lines ? JSON.stringify(input.target_lines) : null,
      input.reasoning || null,
      input.confidence,
      input.discovery_source,
      input.verification_method,
      input.priority || 5,
      input.risk_level || 'medium',
      now,
      now
    );

    const created = this.getById(id);
    if (!created) {
      throw new Error('Failed to create hypothesis');
    }
    return created;
  },

  /**
   * Update a hypothesis
   */
  update(id: string, input: UpdateHypothesisInput): Hypothesis | null {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.statement !== undefined) {
      updates.push('statement = ?');
      values.push(input.statement);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }
    if (input.test_count !== undefined) {
      updates.push('test_count = ?');
      values.push(input.test_count);
    }
    if (input.pass_count !== undefined) {
      updates.push('pass_count = ?');
      values.push(input.pass_count);
    }
    if (input.fail_count !== undefined) {
      updates.push('fail_count = ?');
      values.push(input.fail_count);
    }
    if (input.evidence !== undefined) {
      updates.push('evidence = ?');
      values.push(JSON.stringify(input.evidence));
    }
    if (input.conclusion !== undefined) {
      updates.push('conclusion = ?');
      values.push(input.conclusion);
    }
    if (input.confidence !== undefined) {
      updates.push('confidence = ?');
      values.push(input.confidence);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE hypotheses
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  },

  /**
   * Add evidence to a hypothesis
   */
  addEvidence(id: string, evidence: HypothesisEvidence): Hypothesis | null {
    const hypothesis = this.getById(id);
    if (!hypothesis) return null;

    const currentEvidence = hypothesis.evidence || [];
    currentEvidence.push(evidence);

    return this.update(id, { evidence: currentEvidence });
  },

  /**
   * Mark hypothesis as tested
   */
  markTested(id: string, status: HypothesisStatus, conclusion: string): Hypothesis | null {
    const db = getConnection();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE hypotheses
      SET status = ?, conclusion = ?, tested_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, conclusion, now, now, id);
    return this.getById(id);
  },

  /**
   * Delete a hypothesis
   */
  delete(id: string): boolean {
    const db = getConnection();
    const stmt = db.prepare('DELETE FROM hypotheses WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get high-priority untested hypotheses
   */
  getPrioritizedUntested(projectId: string, limit: number = 10): Hypothesis[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM hypotheses
      WHERE project_id = ? AND status = 'proposed'
      ORDER BY priority DESC, confidence DESC, created_at ASC
      LIMIT ?
    `);
    const rows = stmt.all(projectId, limit) as unknown as DbHypothesis[];
    return rows.map(parseHypothesis);
  },
};

// ============== Invariant Repository ==============

export const invariantRepository = {
  /**
   * Get all invariants for a project
   */
  getAllByProject(projectId: string): Invariant[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM invariants
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbInvariant[];
    return rows.map(parseInvariant);
  },

  /**
   * Get invariants by hypothesis
   */
  getByHypothesis(hypothesisId: string): Invariant[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM invariants
      WHERE hypothesis_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(hypothesisId) as unknown as DbInvariant[];
    return rows.map(parseInvariant);
  },

  /**
   * Get invariant by ID
   */
  getById(id: string): Invariant | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM invariants WHERE id = ?');
    const row = stmt.get(id) as DbInvariant | undefined;
    return row ? parseInvariant(row) : null;
  },

  /**
   * Get validated invariants
   */
  getValidated(projectId: string): Invariant[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM invariants
      WHERE project_id = ? AND validated = 1
      ORDER BY validation_count DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbInvariant[];
    return rows.map(parseInvariant);
  },

  /**
   * Get violated invariants
   */
  getViolated(projectId: string): Invariant[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM invariants
      WHERE project_id = ? AND violation_count > 0
      ORDER BY violation_count DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbInvariant[];
    return rows.map(parseInvariant);
  },

  /**
   * Create a new invariant
   */
  create(input: CreateInvariantInput): Invariant {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO invariants (
        id, project_id, hypothesis_id, name, description, category,
        scope, target_code, expression, confidence, auto_generated,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.project_id,
      input.hypothesis_id || null,
      input.name,
      input.description,
      input.category,
      input.scope,
      input.target_code,
      input.expression,
      input.confidence || 50,
      input.auto_generated ? 1 : 0,
      now,
      now
    );

    const created = this.getById(id);
    if (!created) {
      throw new Error('Failed to create invariant');
    }
    return created;
  },

  /**
   * Record a validation
   */
  recordValidation(id: string, passed: boolean): Invariant | null {
    const db = getConnection();
    const now = new Date().toISOString();

    if (passed) {
      const stmt = db.prepare(`
        UPDATE invariants
        SET validated = 1, validation_count = validation_count + 1, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(now, id);
    } else {
      const stmt = db.prepare(`
        UPDATE invariants
        SET violation_count = violation_count + 1, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(now, id);
    }

    return this.getById(id);
  },

  /**
   * Record a violation with details
   */
  recordViolation(id: string, violation: InvariantViolation): Invariant | null {
    const db = getConnection();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE invariants
      SET violation_count = violation_count + 1, last_violation = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(violation), now, id);

    return this.getById(id);
  },

  /**
   * Delete an invariant
   */
  delete(id: string): boolean {
    const db = getConnection();
    const stmt = db.prepare('DELETE FROM invariants WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// ============== Fuzz Session Repository ==============

export const fuzzSessionRepository = {
  /**
   * Get all fuzz sessions for a project
   */
  getAllByProject(projectId: string): FuzzSession[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM fuzz_sessions
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbFuzzSession[];
    return rows.map(parseFuzzSession);
  },

  /**
   * Get fuzz session by ID
   */
  getById(id: string): FuzzSession | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM fuzz_sessions WHERE id = ?');
    const row = stmt.get(id) as DbFuzzSession | undefined;
    return row ? parseFuzzSession(row) : null;
  },

  /**
   * Get running sessions
   */
  getRunning(projectId: string): FuzzSession[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM fuzz_sessions
      WHERE project_id = ? AND status = 'running'
      ORDER BY started_at ASC
    `);
    const rows = stmt.all(projectId) as unknown as DbFuzzSession[];
    return rows.map(parseFuzzSession);
  },

  /**
   * Get sessions with findings
   */
  getWithFindings(projectId: string): FuzzSession[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM fuzz_sessions
      WHERE project_id = ? AND (crashes_found > 0 OR hangs_found > 0)
      ORDER BY crashes_found DESC, hangs_found DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbFuzzSession[];
    return rows.map(parseFuzzSession);
  },

  /**
   * Create a new fuzz session
   */
  create(input: CreateFuzzSessionInput): FuzzSession {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO fuzz_sessions (
        id, project_id, hypothesis_id, target_function, target_file,
        input_schema, strategy, vulnerability_targets, max_iterations,
        timeout_ms, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.project_id,
      input.hypothesis_id || null,
      input.target_function,
      input.target_file,
      JSON.stringify(input.input_schema),
      input.strategy || 'random',
      input.vulnerability_targets ? JSON.stringify(input.vulnerability_targets) : null,
      input.max_iterations || 10000,
      input.timeout_ms || 5000,
      now,
      now
    );

    const created = this.getById(id);
    if (!created) {
      throw new Error('Failed to create fuzz session');
    }
    return created;
  },

  /**
   * Update session progress
   */
  updateProgress(
    id: string,
    data: {
      status?: string;
      iterations_completed?: number;
      crashes_found?: number;
      hangs_found?: number;
      coverage_increase?: number;
    }
  ): FuzzSession | null {
    const db = getConnection();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
      if (data.status === 'running') {
        updates.push('started_at = ?');
        values.push(new Date().toISOString());
      } else if (data.status === 'completed' || data.status === 'stopped' || data.status === 'crashed') {
        updates.push('completed_at = ?');
        values.push(new Date().toISOString());
      }
    }
    if (data.iterations_completed !== undefined) {
      updates.push('iterations_completed = ?');
      values.push(data.iterations_completed);
    }
    if (data.crashes_found !== undefined) {
      updates.push('crashes_found = ?');
      values.push(data.crashes_found);
    }
    if (data.hangs_found !== undefined) {
      updates.push('hangs_found = ?');
      values.push(data.hangs_found);
    }
    if (data.coverage_increase !== undefined) {
      updates.push('coverage_increase = ?');
      values.push(data.coverage_increase);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE fuzz_sessions
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  },

  /**
   * Add a finding to a session
   */
  addFinding(id: string, finding: FuzzFinding): FuzzSession | null {
    const session = this.getById(id);
    if (!session) return null;

    const findings = session.findings || [];
    findings.push(finding);

    const db = getConnection();
    const stmt = db.prepare(`
      UPDATE fuzz_sessions
      SET findings = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(JSON.stringify(findings), new Date().toISOString(), id);

    return this.getById(id);
  },

  /**
   * Delete a fuzz session
   */
  delete(id: string): boolean {
    const db = getConnection();
    const stmt = db.prepare('DELETE FROM fuzz_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// ============== Property Test Repository ==============

export const propertyTestRepository = {
  /**
   * Get all property tests for a project
   */
  getAllByProject(projectId: string): PropertyTest[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM property_tests
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbPropertyTest[];
    return rows.map(parsePropertyTest);
  },

  /**
   * Get property test by ID
   */
  getById(id: string): PropertyTest | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM property_tests WHERE id = ?');
    const row = stmt.get(id) as DbPropertyTest | undefined;
    return row ? parsePropertyTest(row) : null;
  },

  /**
   * Get tests by hypothesis
   */
  getByHypothesis(hypothesisId: string): PropertyTest[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM property_tests
      WHERE hypothesis_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(hypothesisId) as unknown as DbPropertyTest[];
    return rows.map(parsePropertyTest);
  },

  /**
   * Get tests by invariant
   */
  getByInvariant(invariantId: string): PropertyTest[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM property_tests
      WHERE invariant_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(invariantId) as unknown as DbPropertyTest[];
    return rows.map(parsePropertyTest);
  },

  /**
   * Get failed tests
   */
  getFailed(projectId: string): PropertyTest[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM property_tests
      WHERE project_id = ? AND status = 'failed'
      ORDER BY last_run_at DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbPropertyTest[];
    return rows.map(parsePropertyTest);
  },

  /**
   * Create a new property test
   */
  create(input: CreatePropertyTestInput): PropertyTest {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO property_tests (
        id, project_id, hypothesis_id, invariant_id, name, description,
        property_type, target_function, target_file, generator_code,
        predicate_code, shrink_code, num_tests, seed, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.project_id,
      input.hypothesis_id || null,
      input.invariant_id || null,
      input.name,
      input.description,
      input.property_type,
      input.target_function,
      input.target_file,
      input.generator_code,
      input.predicate_code,
      input.shrink_code || null,
      input.num_tests || 100,
      input.seed || null,
      now,
      now
    );

    const created = this.getById(id);
    if (!created) {
      throw new Error('Failed to create property test');
    }
    return created;
  },

  /**
   * Update test results
   */
  updateResults(
    id: string,
    data: {
      status: 'pending' | 'running' | 'passed' | 'failed';
      tests_run?: number;
      counterexamples?: unknown[];
      shrunk_example?: unknown;
      execution_time_ms?: number;
    }
  ): PropertyTest | null {
    const db = getConnection();
    const now = new Date().toISOString();

    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const values: (string | number | null)[] = [data.status, now];

    if (data.tests_run !== undefined) {
      updates.push('tests_run = ?');
      values.push(data.tests_run);
    }
    if (data.counterexamples !== undefined) {
      updates.push('counterexamples = ?');
      values.push(JSON.stringify(data.counterexamples));
    }
    if (data.shrunk_example !== undefined) {
      updates.push('shrunk_example = ?');
      values.push(JSON.stringify(data.shrunk_example));
    }
    if (data.execution_time_ms !== undefined) {
      updates.push('execution_time_ms = ?');
      values.push(data.execution_time_ms);
    }

    updates.push('last_run_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE property_tests
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getById(id);
  },

  /**
   * Delete a property test
   */
  delete(id: string): boolean {
    const db = getConnection();
    const stmt = db.prepare('DELETE FROM property_tests WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// ============== Test Knowledge Repository ==============

export const testKnowledgeRepository = {
  /**
   * Get all knowledge for a project
   */
  getAllByProject(projectId: string): TestKnowledge[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM test_knowledge
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbTestKnowledge[];
    return rows.map(parseTestKnowledge);
  },

  /**
   * Get knowledge by ID
   */
  getById(id: string): TestKnowledge | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM test_knowledge WHERE id = ?');
    const row = stmt.get(id) as DbTestKnowledge | undefined;
    return row ? parseTestKnowledge(row) : null;
  },

  /**
   * Get knowledge by hypothesis
   */
  getByHypothesis(hypothesisId: string): TestKnowledge[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM test_knowledge
      WHERE hypothesis_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(hypothesisId) as unknown as DbTestKnowledge[];
    return rows.map(parseTestKnowledge);
  },

  /**
   * Get unresolved issues
   */
  getUnresolved(projectId: string): TestKnowledge[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM test_knowledge
      WHERE project_id = ? AND resolved = 0 AND knowledge_type IN ('bug_found', 'security_issue')
      ORDER BY confidence DESC, created_at DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbTestKnowledge[];
    return rows.map(parseTestKnowledge);
  },

  /**
   * Get unacknowledged knowledge
   */
  getUnacknowledged(projectId: string): TestKnowledge[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM test_knowledge
      WHERE project_id = ? AND acknowledged = 0
      ORDER BY confidence DESC, created_at DESC
    `);
    const rows = stmt.all(projectId) as unknown as DbTestKnowledge[];
    return rows.map(parseTestKnowledge);
  },

  /**
   * Create new test knowledge
   */
  create(input: CreateTestKnowledgeInput): TestKnowledge {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO test_knowledge (
        id, project_id, hypothesis_id, knowledge_type, title, description,
        related_files, related_functions, source_test_id, evidence_summary,
        confidence, impact_assessment, recommendations, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.project_id,
      input.hypothesis_id || null,
      input.knowledge_type,
      input.title,
      input.description,
      JSON.stringify(input.related_files),
      input.related_functions ? JSON.stringify(input.related_functions) : null,
      input.source_test_id || null,
      input.evidence_summary,
      input.confidence || 50,
      input.impact_assessment || null,
      input.recommendations ? JSON.stringify(input.recommendations) : null,
      now,
      now
    );

    const created = this.getById(id);
    if (!created) {
      throw new Error('Failed to create test knowledge');
    }
    return created;
  },

  /**
   * Acknowledge knowledge
   */
  acknowledge(id: string): TestKnowledge | null {
    const db = getConnection();
    const stmt = db.prepare(`
      UPDATE test_knowledge
      SET acknowledged = 1, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), id);
    return this.getById(id);
  },

  /**
   * Mark as resolved
   */
  resolve(id: string, notes?: string): TestKnowledge | null {
    const db = getConnection();
    const stmt = db.prepare(`
      UPDATE test_knowledge
      SET resolved = 1, resolution_notes = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(notes || null, new Date().toISOString(), id);
    return this.getById(id);
  },

  /**
   * Delete test knowledge
   */
  delete(id: string): boolean {
    const db = getConnection();
    const stmt = db.prepare('DELETE FROM test_knowledge WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// ============== Summary Repository ==============

export const hypothesisTestingSummaryRepository = {
  /**
   * Get comprehensive testing summary for a project
   */
  getSummary(projectId: string): HypothesisTestingSummary {
    const db = getConnection();

    // Hypothesis stats
    const hypothesisStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'proposed' THEN 1 ELSE 0 END) as proposed,
        SUM(CASE WHEN status = 'testing' THEN 1 ELSE 0 END) as testing,
        SUM(CASE WHEN status = 'proven' THEN 1 ELSE 0 END) as proven,
        SUM(CASE WHEN status = 'disproven' THEN 1 ELSE 0 END) as disproven,
        SUM(CASE WHEN status = 'inconclusive' THEN 1 ELSE 0 END) as inconclusive,
        SUM(CASE WHEN status = 'refined' THEN 1 ELSE 0 END) as refined
      FROM hypotheses
      WHERE project_id = ?
    `).get(projectId) as unknown as Record<string, number>;

    const hypothesisTypeStats = db.prepare(`
      SELECT hypothesis_type, COUNT(*) as count
      FROM hypotheses
      WHERE project_id = ?
      GROUP BY hypothesis_type
    `).all(projectId) as Array<{ hypothesis_type: string; count: number }>;

    // Invariant stats
    const invariantStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN validated = 1 THEN 1 ELSE 0 END) as validated,
        SUM(CASE WHEN violation_count > 0 THEN 1 ELSE 0 END) as violated
      FROM invariants
      WHERE project_id = ?
    `).get(projectId) as unknown as Record<string, number>;

    // Fuzz stats
    const fuzzStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(crashes_found) as crashes,
        SUM(hangs_found) as hangs
      FROM fuzz_sessions
      WHERE project_id = ?
    `).get(projectId) as unknown as Record<string, number>;

    // Property test stats
    const propertyTestStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed
      FROM property_tests
      WHERE project_id = ?
    `).get(projectId) as unknown as Record<string, number>;

    // Knowledge stats
    const knowledgeStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN resolved = 0 AND knowledge_type IN ('bug_found', 'security_issue') THEN 1 ELSE 0 END) as unresolved
      FROM test_knowledge
      WHERE project_id = ?
    `).get(projectId) as unknown as Record<string, number>;

    const byType: Record<HypothesisType, number> = {
      complexity: 0,
      behavior: 0,
      invariant: 0,
      boundary: 0,
      performance: 0,
      security: 0,
      concurrency: 0,
      state: 0,
      integration: 0,
    };

    for (const stat of hypothesisTypeStats) {
      byType[stat.hypothesis_type as HypothesisType] = stat.count;
    }

    const testedCount = (hypothesisStats.proven || 0) + (hypothesisStats.disproven || 0);
    const provenRate = testedCount > 0 ? ((hypothesisStats.proven || 0) / testedCount) * 100 : 0;

    return {
      total_hypotheses: hypothesisStats.total || 0,
      by_status: {
        proposed: hypothesisStats.proposed || 0,
        testing: hypothesisStats.testing || 0,
        proven: hypothesisStats.proven || 0,
        disproven: hypothesisStats.disproven || 0,
        inconclusive: hypothesisStats.inconclusive || 0,
        refined: hypothesisStats.refined || 0,
      },
      by_type: byType,
      proven_rate: Math.round(provenRate * 100) / 100,

      total_invariants: invariantStats.total || 0,
      validated_invariants: invariantStats.validated || 0,
      violated_invariants: invariantStats.violated || 0,

      total_fuzz_sessions: fuzzStats.total || 0,
      total_findings: (fuzzStats.crashes || 0) + (fuzzStats.hangs || 0),
      critical_findings: fuzzStats.crashes || 0,

      total_property_tests: propertyTestStats.total || 0,
      passing_tests: propertyTestStats.passed || 0,

      knowledge_items: knowledgeStats.total || 0,
      unresolved_issues: knowledgeStats.unresolved || 0,
    };
  },
};
