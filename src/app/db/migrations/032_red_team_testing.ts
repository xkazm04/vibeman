/**
 * Migration 032: Adversarial Red Team Testing Tables
 *
 * Creates tables for:
 * - red_team_sessions: Testing sessions with agent configuration
 * - red_team_attacks: Planned and executed attacks
 * - red_team_vulnerabilities: Discovered vulnerabilities
 * - vulnerability_debates: Parliament debates on findings
 */

import { getConnection } from '../drivers';
import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';

export function migrateRedTeamTestingTables(logger: MigrationLogger) {
  const db = getConnection();

  // Create red_team_sessions table
  safeMigration('redTeamSessionsTable', () => {
    const created = createTableIfNotExists(db, 'red_team_sessions', `
      CREATE TABLE red_team_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        context_id TEXT,

        -- Session definition
        name TEXT NOT NULL,
        description TEXT,
        target_scope TEXT NOT NULL,
        attack_categories TEXT NOT NULL,

        -- Agent configuration
        participating_agents TEXT NOT NULL,
        agent_roles TEXT NOT NULL,

        -- Progress
        status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN (
          'planning', 'attacking', 'debating', 'validating', 'reporting', 'completed'
        )),
        current_phase TEXT,
        progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

        -- Results summary
        total_attacks INTEGER NOT NULL DEFAULT 0,
        successful_attacks INTEGER NOT NULL DEFAULT 0,
        vulnerabilities_found INTEGER NOT NULL DEFAULT 0,
        critical_count INTEGER NOT NULL DEFAULT 0,
        high_count INTEGER NOT NULL DEFAULT 0,
        medium_count INTEGER NOT NULL DEFAULT 0,
        low_count INTEGER NOT NULL DEFAULT 0,

        -- Risk assessment
        overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
        risk_summary TEXT,

        -- Token tracking
        input_tokens INTEGER,
        output_tokens INTEGER,

        -- Metadata
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_red_team_sessions_project ON red_team_sessions(project_id);
        CREATE INDEX idx_red_team_sessions_context ON red_team_sessions(context_id);
        CREATE INDEX idx_red_team_sessions_status ON red_team_sessions(status);
        CREATE INDEX idx_red_team_sessions_created ON red_team_sessions(created_at DESC);
      `);
      logger.info('red_team_sessions table created successfully');
    }
  }, logger);

  // Create red_team_attacks table
  safeMigration('redTeamAttacksTable', () => {
    const created = createTableIfNotExists(db, 'red_team_attacks', `
      CREATE TABLE red_team_attacks (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        project_id TEXT NOT NULL,

        -- Attack definition
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'security', 'performance', 'accessibility', 'edge_case',
          'state', 'concurrency', 'input', 'integration'
        )),
        agent_type TEXT NOT NULL,
        target_component TEXT NOT NULL,
        target_code TEXT,

        -- Attack strategy
        attack_vector TEXT NOT NULL,
        payloads TEXT,
        prerequisites TEXT,
        expected_outcome TEXT NOT NULL,

        -- Execution
        status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
          'planned', 'executing', 'succeeded', 'failed', 'blocked', 'error'
        )),
        severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN (
          'info', 'low', 'medium', 'high', 'critical'
        )),
        executed_at TEXT,
        execution_time_ms INTEGER,

        -- Results
        vulnerability_found INTEGER NOT NULL DEFAULT 0,
        actual_outcome TEXT,
        error_message TEXT,
        stack_trace TEXT,
        evidence TEXT,

        -- AI confidence
        success_probability INTEGER NOT NULL DEFAULT 50 CHECK (success_probability >= 0 AND success_probability <= 100),
        impact_score INTEGER NOT NULL DEFAULT 5 CHECK (impact_score >= 1 AND impact_score <= 10),

        -- Metadata
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        FOREIGN KEY (session_id) REFERENCES red_team_sessions(id) ON DELETE CASCADE
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_red_team_attacks_session ON red_team_attacks(session_id);
        CREATE INDEX idx_red_team_attacks_project ON red_team_attacks(project_id);
        CREATE INDEX idx_red_team_attacks_category ON red_team_attacks(category);
        CREATE INDEX idx_red_team_attacks_status ON red_team_attacks(status);
        CREATE INDEX idx_red_team_attacks_severity ON red_team_attacks(severity);
        CREATE INDEX idx_red_team_attacks_agent ON red_team_attacks(agent_type);
      `);
      logger.info('red_team_attacks table created successfully');
    }
  }, logger);

  // Create red_team_vulnerabilities table
  safeMigration('redTeamVulnerabilitiesTable', () => {
    const created = createTableIfNotExists(db, 'red_team_vulnerabilities', `
      CREATE TABLE red_team_vulnerabilities (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        attack_id TEXT,
        project_id TEXT NOT NULL,

        -- Vulnerability definition
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'injection', 'broken_auth', 'sensitive_exposure', 'xxe',
          'broken_access', 'misconfig', 'xss', 'deserialization',
          'components', 'logging', 'dos', 'a11y', 'logic', 'race_condition'
        )),
        cwe_id TEXT,
        owasp_category TEXT,

        -- Location
        affected_component TEXT NOT NULL,
        affected_file TEXT,
        affected_lines TEXT,
        code_snippet TEXT,

        -- Severity assessment
        severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN (
          'info', 'low', 'medium', 'high', 'critical'
        )),
        cvss_score REAL CHECK (cvss_score >= 0 AND cvss_score <= 10),
        exploitability INTEGER CHECK (exploitability >= 1 AND exploitability <= 10),
        business_impact INTEGER CHECK (business_impact >= 1 AND business_impact <= 10),

        -- Reproduction
        reproduction_steps TEXT NOT NULL,
        proof_of_concept TEXT,

        -- Status
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
          'open', 'confirmed', 'disputed', 'fixed', 'wont_fix', 'false_positive'
        )),
        confirmed_by TEXT,
        disputed_by TEXT,

        -- Remediation
        remediation_suggestion TEXT,
        fix_effort INTEGER CHECK (fix_effort >= 1 AND fix_effort <= 10),
        fix_priority INTEGER CHECK (fix_priority >= 1 AND fix_priority <= 10),

        -- Metadata
        discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
        confirmed_at TEXT,
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        FOREIGN KEY (session_id) REFERENCES red_team_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (attack_id) REFERENCES red_team_attacks(id) ON DELETE SET NULL
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_red_team_vulns_session ON red_team_vulnerabilities(session_id);
        CREATE INDEX idx_red_team_vulns_attack ON red_team_vulnerabilities(attack_id);
        CREATE INDEX idx_red_team_vulns_project ON red_team_vulnerabilities(project_id);
        CREATE INDEX idx_red_team_vulns_category ON red_team_vulnerabilities(category);
        CREATE INDEX idx_red_team_vulns_severity ON red_team_vulnerabilities(severity);
        CREATE INDEX idx_red_team_vulns_status ON red_team_vulnerabilities(status);
      `);
      logger.info('red_team_vulnerabilities table created successfully');
    }
  }, logger);

  // Create vulnerability_debates table
  safeMigration('vulnerabilityDebatesTable', () => {
    const created = createTableIfNotExists(db, 'vulnerability_debates', `
      CREATE TABLE vulnerability_debates (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        vulnerability_id TEXT NOT NULL,
        project_id TEXT NOT NULL,

        -- Debate configuration
        participating_agents TEXT NOT NULL,
        max_rounds INTEGER NOT NULL DEFAULT 3,
        consensus_threshold REAL NOT NULL DEFAULT 0.7,

        -- Debate progress
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'in_progress', 'completed'
        )),
        current_round INTEGER NOT NULL DEFAULT 0,
        turns TEXT NOT NULL DEFAULT '[]',

        -- Outcome
        outcome TEXT CHECK (outcome IN (
          'vulnerability_confirmed', 'vulnerability_disputed',
          'false_positive', 'needs_more_evidence', 'escalated'
        )),
        consensus_level REAL CHECK (consensus_level >= 0 AND consensus_level <= 1),
        final_severity TEXT CHECK (final_severity IN (
          'info', 'low', 'medium', 'high', 'critical'
        )),
        reasoning_summary TEXT,

        -- Token tracking
        input_tokens INTEGER,
        output_tokens INTEGER,

        -- Metadata
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        FOREIGN KEY (session_id) REFERENCES red_team_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (vulnerability_id) REFERENCES red_team_vulnerabilities(id) ON DELETE CASCADE
      )
    `, logger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_vuln_debates_session ON vulnerability_debates(session_id);
        CREATE INDEX idx_vuln_debates_vulnerability ON vulnerability_debates(vulnerability_id);
        CREATE INDEX idx_vuln_debates_project ON vulnerability_debates(project_id);
        CREATE INDEX idx_vuln_debates_status ON vulnerability_debates(status);
        CREATE INDEX idx_vuln_debates_outcome ON vulnerability_debates(outcome);
      `);
      logger.info('vulnerability_debates table created successfully');
    }
  }, logger);

  logger.success('Red Team Testing tables migration completed');
}
