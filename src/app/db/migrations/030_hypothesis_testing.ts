/**
 * Migration 030: Hypothesis-Driven Testing Tables
 *
 * Creates tables for:
 * - hypotheses: AI-generated hypotheses about code behavior
 * - invariants: Discovered code invariants
 * - fuzz_sessions: Fuzzing test sessions
 * - property_tests: Property-based tests
 * - test_knowledge: Test-derived knowledge artifacts
 */

import { getConnection } from '../drivers';
import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';

export function migrateHypothesisTestingTables(logger: MigrationLogger) {
  const db = getConnection();

  // Create hypotheses table
  safeMigration('hypothesesTable', () => {
    const created = createTableIfNotExists(db, 'hypotheses', `
      CREATE TABLE hypotheses (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_id TEXT,

        -- Hypothesis definition
        title TEXT NOT NULL,
        statement TEXT NOT NULL,
        hypothesis_type TEXT NOT NULL CHECK (hypothesis_type IN (
          'complexity', 'behavior', 'invariant', 'boundary', 'performance',
          'security', 'concurrency', 'state', 'integration'
        )),
        target_code TEXT NOT NULL,
        target_lines TEXT,

        -- AI reasoning
        reasoning TEXT,
        confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
        discovery_source TEXT NOT NULL,

        -- Testing metadata
        verification_method TEXT NOT NULL CHECK (verification_method IN (
          'unit_test', 'property_test', 'fuzz_test', 'benchmark',
          'static_analysis', 'runtime_check', 'integration_test'
        )),
        status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
          'proposed', 'testing', 'proven', 'disproven', 'inconclusive', 'refined'
        )),
        priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
        risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

        -- Results
        test_count INTEGER NOT NULL DEFAULT 0,
        pass_count INTEGER NOT NULL DEFAULT 0,
        fail_count INTEGER NOT NULL DEFAULT 0,
        evidence TEXT,
        conclusion TEXT,

        -- Metadata
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        tested_at TEXT
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_hypotheses_project ON hypotheses(project_id);
        CREATE INDEX idx_hypotheses_context ON hypotheses(context_id);
        CREATE INDEX idx_hypotheses_type ON hypotheses(hypothesis_type);
        CREATE INDEX idx_hypotheses_status ON hypotheses(status);
        CREATE INDEX idx_hypotheses_priority ON hypotheses(priority DESC);
        CREATE INDEX idx_hypotheses_target ON hypotheses(target_code);
      `);
      logger.info('hypotheses table created successfully');
    }
  }, logger);

  // Create invariants table
  safeMigration('invariantsTable', () => {
    const created = createTableIfNotExists(db, 'invariants', `
      CREATE TABLE invariants (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        hypothesis_id TEXT,

        -- Invariant definition
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'null_safety', 'range_bounds', 'type_constraints', 'relationship',
          'ordering', 'uniqueness', 'immutability', 'idempotence', 'custom'
        )),
        scope TEXT NOT NULL CHECK (scope IN ('function', 'class', 'module', 'global')),

        -- Target code
        target_code TEXT NOT NULL,
        expression TEXT NOT NULL,

        -- Validation
        validated INTEGER NOT NULL DEFAULT 0,
        validation_count INTEGER NOT NULL DEFAULT 0,
        violation_count INTEGER NOT NULL DEFAULT 0,
        last_violation TEXT,

        -- Metadata
        confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
        auto_generated INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE SET NULL
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_invariants_project ON invariants(project_id);
        CREATE INDEX idx_invariants_hypothesis ON invariants(hypothesis_id);
        CREATE INDEX idx_invariants_category ON invariants(category);
        CREATE INDEX idx_invariants_target ON invariants(target_code);
        CREATE INDEX idx_invariants_validated ON invariants(validated);
      `);
      logger.info('invariants table created successfully');
    }
  }, logger);

  // Create fuzz_sessions table
  safeMigration('fuzzSessionsTable', () => {
    const created = createTableIfNotExists(db, 'fuzz_sessions', `
      CREATE TABLE fuzz_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        hypothesis_id TEXT,

        -- Target
        target_function TEXT NOT NULL,
        target_file TEXT NOT NULL,
        input_schema TEXT NOT NULL,

        -- Strategy
        strategy TEXT NOT NULL DEFAULT 'random' CHECK (strategy IN (
          'random', 'mutation', 'grammar', 'coverage', 'property', 'vulnerability'
        )),
        vulnerability_targets TEXT,
        max_iterations INTEGER NOT NULL DEFAULT 10000,
        timeout_ms INTEGER NOT NULL DEFAULT 5000,

        -- Progress
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'running', 'completed', 'stopped', 'crashed'
        )),
        iterations_completed INTEGER NOT NULL DEFAULT 0,
        crashes_found INTEGER NOT NULL DEFAULT 0,
        hangs_found INTEGER NOT NULL DEFAULT 0,
        coverage_increase REAL,

        -- Results
        findings TEXT,
        best_inputs TEXT,

        -- Metadata
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE SET NULL
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_fuzz_sessions_project ON fuzz_sessions(project_id);
        CREATE INDEX idx_fuzz_sessions_hypothesis ON fuzz_sessions(hypothesis_id);
        CREATE INDEX idx_fuzz_sessions_status ON fuzz_sessions(status);
        CREATE INDEX idx_fuzz_sessions_target ON fuzz_sessions(target_file);
      `);
      logger.info('fuzz_sessions table created successfully');
    }
  }, logger);

  // Create property_tests table
  safeMigration('propertyTestsTable', () => {
    const created = createTableIfNotExists(db, 'property_tests', `
      CREATE TABLE property_tests (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        hypothesis_id TEXT,
        invariant_id TEXT,

        -- Property definition
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        property_type TEXT NOT NULL CHECK (property_type IN (
          'for_all', 'there_exists', 'commutative', 'associative',
          'idempotent', 'inverse', 'monotonic', 'bounded', 'custom'
        )),

        -- Target
        target_function TEXT NOT NULL,
        target_file TEXT NOT NULL,

        -- Property expression
        generator_code TEXT NOT NULL,
        predicate_code TEXT NOT NULL,
        shrink_code TEXT,

        -- Execution
        num_tests INTEGER NOT NULL DEFAULT 100,
        seed INTEGER,

        -- Results
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'running', 'passed', 'failed'
        )),
        tests_run INTEGER NOT NULL DEFAULT 0,
        counterexamples TEXT,
        shrunk_example TEXT,
        execution_time_ms INTEGER,

        -- Metadata
        last_run_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE SET NULL,
        FOREIGN KEY (invariant_id) REFERENCES invariants(id) ON DELETE SET NULL
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_property_tests_project ON property_tests(project_id);
        CREATE INDEX idx_property_tests_hypothesis ON property_tests(hypothesis_id);
        CREATE INDEX idx_property_tests_invariant ON property_tests(invariant_id);
        CREATE INDEX idx_property_tests_status ON property_tests(status);
        CREATE INDEX idx_property_tests_target ON property_tests(target_file);
      `);
      logger.info('property_tests table created successfully');
    }
  }, logger);

  // Create test_knowledge table
  safeMigration('testKnowledgeTable', () => {
    const created = createTableIfNotExists(db, 'test_knowledge', `
      CREATE TABLE test_knowledge (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        hypothesis_id TEXT,

        -- Knowledge classification
        knowledge_type TEXT NOT NULL CHECK (knowledge_type IN (
          'invariant_discovered', 'bug_found', 'performance_baseline',
          'security_issue', 'behavior_documented', 'edge_case_identified'
        )),
        title TEXT NOT NULL,
        description TEXT NOT NULL,

        -- Related code
        related_files TEXT NOT NULL,
        related_functions TEXT,

        -- Evidence
        source_test_id TEXT,
        evidence_summary TEXT NOT NULL,
        confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),

        -- Impact
        impact_assessment TEXT,
        recommendations TEXT,

        -- Status
        acknowledged INTEGER NOT NULL DEFAULT 0,
        resolved INTEGER NOT NULL DEFAULT 0,
        resolution_notes TEXT,

        -- Metadata
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        FOREIGN KEY (hypothesis_id) REFERENCES hypotheses(id) ON DELETE SET NULL
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_test_knowledge_project ON test_knowledge(project_id);
        CREATE INDEX idx_test_knowledge_hypothesis ON test_knowledge(hypothesis_id);
        CREATE INDEX idx_test_knowledge_type ON test_knowledge(knowledge_type);
        CREATE INDEX idx_test_knowledge_acknowledged ON test_knowledge(acknowledged);
        CREATE INDEX idx_test_knowledge_resolved ON test_knowledge(resolved);
      `);
      logger.info('test_knowledge table created successfully');
    }
  }, logger);

  logger.success('Hypothesis-driven testing tables migration completed');
}
