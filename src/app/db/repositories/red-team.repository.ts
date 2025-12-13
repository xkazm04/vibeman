/**
 * Red Team Testing Repository
 *
 * Handles CRUD operations for:
 * - Red team sessions
 * - Attacks
 * - Vulnerabilities
 * - Vulnerability debates
 */

import { v4 as uuidv4 } from 'uuid';
import { getConnection } from '../drivers';
import type {
  DbRedTeamSession,
  DbRedTeamAttack,
  DbRedTeamVulnerability,
  DbVulnerabilityDebate,
  CreateSessionInput,
  UpdateSessionInput,
  CreateAttackInput,
  UpdateAttackInput,
  CreateVulnerabilityInput,
  CreateDebateInput,
  RedTeamSummary,
  AttackSeverity,
  VulnerabilityCategory,
  SessionStatus,
  AttackStatus,
  VulnerabilityDebateTurn,
  DebateOutcome,
} from '../models/red-team.types';
import { DEFAULT_RED_TEAM_CONFIG } from '../models/red-team.types';

// ============== Session Repository ==============

export const redTeamSessionRepository = {
  /**
   * Get all sessions for a project
   */
  getAllByProject(projectId: string): DbRedTeamSession[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_sessions
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as unknown as DbRedTeamSession[];
  },

  /**
   * Get session by ID
   */
  getById(id: string): DbRedTeamSession | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM red_team_sessions WHERE id = ?');
    const row = stmt.get(id) as unknown as DbRedTeamSession | undefined;
    return row || null;
  },

  /**
   * Get active sessions
   */
  getActive(projectId: string): DbRedTeamSession[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_sessions
      WHERE project_id = ? AND status NOT IN ('completed', 'reporting')
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as unknown as DbRedTeamSession[];
  },

  /**
   * Create a new session
   */
  create(input: CreateSessionInput): DbRedTeamSession {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const attackCategories = input.attack_categories || DEFAULT_RED_TEAM_CONFIG.defaultAttackCategories;
    const participatingAgents = input.participating_agents || DEFAULT_RED_TEAM_CONFIG.defaultAgents;

    // Build default role assignments
    const agentRoles: Record<string, string> = {};
    participatingAgents.forEach((agent, index) => {
      agentRoles[agent] = index === 0 ? 'attacker' : index === 1 ? 'validator' : 'attacker';
    });

    const stmt = db.prepare(`
      INSERT INTO red_team_sessions (
        id, project_id, context_id, name, description,
        target_scope, attack_categories, participating_agents, agent_roles,
        status, progress, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planning', 0, ?, ?)
    `);

    stmt.run(
      id,
      input.project_id,
      input.context_id || null,
      input.name,
      input.description || null,
      JSON.stringify(input.target_scope),
      JSON.stringify(attackCategories),
      JSON.stringify(participatingAgents),
      JSON.stringify(agentRoles),
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Update a session
   */
  update(id: string, input: UpdateSessionInput): DbRedTeamSession | null {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
      if (input.status === 'attacking' && !existing.started_at) {
        updates.push('started_at = ?');
        values.push(new Date().toISOString());
      }
      if (input.status === 'completed') {
        updates.push('completed_at = ?');
        values.push(new Date().toISOString());
      }
    }

    if (input.current_phase !== undefined) {
      updates.push('current_phase = ?');
      values.push(input.current_phase);
    }

    if (input.progress !== undefined) {
      updates.push('progress = ?');
      values.push(input.progress);
    }

    if (input.total_attacks !== undefined) {
      updates.push('total_attacks = ?');
      values.push(input.total_attacks);
    }

    if (input.successful_attacks !== undefined) {
      updates.push('successful_attacks = ?');
      values.push(input.successful_attacks);
    }

    if (input.vulnerabilities_found !== undefined) {
      updates.push('vulnerabilities_found = ?');
      values.push(input.vulnerabilities_found);
    }

    if (input.critical_count !== undefined) {
      updates.push('critical_count = ?');
      values.push(input.critical_count);
    }

    if (input.high_count !== undefined) {
      updates.push('high_count = ?');
      values.push(input.high_count);
    }

    if (input.medium_count !== undefined) {
      updates.push('medium_count = ?');
      values.push(input.medium_count);
    }

    if (input.low_count !== undefined) {
      updates.push('low_count = ?');
      values.push(input.low_count);
    }

    if (input.overall_risk_score !== undefined) {
      updates.push('overall_risk_score = ?');
      values.push(input.overall_risk_score);
    }

    if (input.risk_summary !== undefined) {
      updates.push('risk_summary = ?');
      values.push(input.risk_summary);
    }

    if (input.input_tokens !== undefined) {
      updates.push('input_tokens = COALESCE(input_tokens, 0) + ?');
      values.push(input.input_tokens);
    }

    if (input.output_tokens !== undefined) {
      updates.push('output_tokens = COALESCE(output_tokens, 0) + ?');
      values.push(input.output_tokens);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE red_team_sessions
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Delete a session
   */
  delete(id: string): boolean {
    const db = getConnection();
    const stmt = db.prepare('DELETE FROM red_team_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Recalculate session statistics
   */
  recalculateStats(sessionId: string): void {
    const db = getConnection();

    // Get attack stats
    const attackStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as succeeded
      FROM red_team_attacks
      WHERE session_id = ?
    `).get(sessionId) as unknown as { total: number; succeeded: number };

    // Get vulnerability stats
    const vulnStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low_count
      FROM red_team_vulnerabilities
      WHERE session_id = ?
    `).get(sessionId) as unknown as {
      total: number;
      critical_count: number;
      high_count: number;
      medium_count: number;
      low_count: number;
    };

    // Calculate risk score (weighted by severity)
    const riskScore = Math.min(100, Math.round(
      (vulnStats.critical_count * 25) +
      (vulnStats.high_count * 15) +
      (vulnStats.medium_count * 7) +
      (vulnStats.low_count * 2)
    ));

    // Update session
    const stmt = db.prepare(`
      UPDATE red_team_sessions
      SET total_attacks = ?,
          successful_attacks = ?,
          vulnerabilities_found = ?,
          critical_count = ?,
          high_count = ?,
          medium_count = ?,
          low_count = ?,
          overall_risk_score = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      attackStats.total,
      attackStats.succeeded,
      vulnStats.total,
      vulnStats.critical_count,
      vulnStats.high_count,
      vulnStats.medium_count,
      vulnStats.low_count,
      riskScore,
      new Date().toISOString(),
      sessionId
    );
  }
};

// ============== Attack Repository ==============

export const redTeamAttackRepository = {
  /**
   * Get all attacks for a session
   */
  getAllBySession(sessionId: string): DbRedTeamAttack[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_attacks
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId) as unknown as DbRedTeamAttack[];
  },

  /**
   * Get attack by ID
   */
  getById(id: string): DbRedTeamAttack | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM red_team_attacks WHERE id = ?');
    const row = stmt.get(id) as unknown as DbRedTeamAttack | undefined;
    return row || null;
  },

  /**
   * Get attacks by status
   */
  getByStatus(sessionId: string, status: AttackStatus): DbRedTeamAttack[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_attacks
      WHERE session_id = ? AND status = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId, status) as unknown as DbRedTeamAttack[];
  },

  /**
   * Get attacks by agent type
   */
  getByAgentType(sessionId: string, agentType: string): DbRedTeamAttack[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_attacks
      WHERE session_id = ? AND agent_type = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(sessionId, agentType) as unknown as DbRedTeamAttack[];
  },

  /**
   * Create a new attack
   */
  create(input: CreateAttackInput): DbRedTeamAttack {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO red_team_attacks (
        id, session_id, project_id, name, description, category,
        agent_type, target_component, target_code, attack_vector,
        payloads, prerequisites, expected_outcome, status, severity,
        success_probability, impact_score, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.session_id,
      input.project_id,
      input.name,
      input.description,
      input.category,
      input.agent_type,
      input.target_component,
      input.target_code || null,
      input.attack_vector,
      input.payloads ? JSON.stringify(input.payloads) : null,
      input.prerequisites ? JSON.stringify(input.prerequisites) : null,
      input.expected_outcome,
      input.severity || 'medium',
      input.success_probability || 50,
      input.impact_score || 5,
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Update an attack
   */
  update(id: string, input: UpdateAttackInput): DbRedTeamAttack | null {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
      if (input.status === 'executing') {
        updates.push('executed_at = ?');
        values.push(new Date().toISOString());
      }
    }

    if (input.severity !== undefined) {
      updates.push('severity = ?');
      values.push(input.severity);
    }

    if (input.vulnerability_found !== undefined) {
      updates.push('vulnerability_found = ?');
      values.push(input.vulnerability_found ? 1 : 0);
    }

    if (input.actual_outcome !== undefined) {
      updates.push('actual_outcome = ?');
      values.push(input.actual_outcome);
    }

    if (input.error_message !== undefined) {
      updates.push('error_message = ?');
      values.push(input.error_message);
    }

    if (input.stack_trace !== undefined) {
      updates.push('stack_trace = ?');
      values.push(input.stack_trace);
    }

    if (input.evidence !== undefined) {
      updates.push('evidence = ?');
      values.push(JSON.stringify(input.evidence));
    }

    if (input.execution_time_ms !== undefined) {
      updates.push('execution_time_ms = ?');
      values.push(input.execution_time_ms);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE red_team_attacks
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    // Recalculate session stats
    redTeamSessionRepository.recalculateStats(existing.session_id);

    return this.getById(id);
  },

  /**
   * Delete an attack
   */
  delete(id: string): boolean {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return false;

    const stmt = db.prepare('DELETE FROM red_team_attacks WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      redTeamSessionRepository.recalculateStats(existing.session_id);
    }

    return result.changes > 0;
  },

  /**
   * Get next planned attack
   */
  getNextPlanned(sessionId: string): DbRedTeamAttack | null {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_attacks
      WHERE session_id = ? AND status = 'planned'
      ORDER BY impact_score DESC, success_probability DESC
      LIMIT 1
    `);
    const row = stmt.get(sessionId) as unknown as DbRedTeamAttack | undefined;
    return row || null;
  }
};

// ============== Vulnerability Repository ==============

export const redTeamVulnerabilityRepository = {
  /**
   * Get all vulnerabilities for a session
   */
  getAllBySession(sessionId: string): DbRedTeamVulnerability[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_vulnerabilities
      WHERE session_id = ?
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
    `);
    return stmt.all(sessionId) as unknown as DbRedTeamVulnerability[];
  },

  /**
   * Get all vulnerabilities for a project
   */
  getAllByProject(projectId: string): DbRedTeamVulnerability[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_vulnerabilities
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as unknown as DbRedTeamVulnerability[];
  },

  /**
   * Get vulnerability by ID
   */
  getById(id: string): DbRedTeamVulnerability | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM red_team_vulnerabilities WHERE id = ?');
    const row = stmt.get(id) as unknown as DbRedTeamVulnerability | undefined;
    return row || null;
  },

  /**
   * Get vulnerabilities by status
   */
  getByStatus(projectId: string, status: string): DbRedTeamVulnerability[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_vulnerabilities
      WHERE project_id = ? AND status = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, status) as unknown as DbRedTeamVulnerability[];
  },

  /**
   * Get open vulnerabilities
   */
  getOpen(projectId: string): DbRedTeamVulnerability[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM red_team_vulnerabilities
      WHERE project_id = ? AND status IN ('open', 'confirmed')
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END
    `);
    return stmt.all(projectId) as unknown as DbRedTeamVulnerability[];
  },

  /**
   * Create a new vulnerability
   */
  create(input: CreateVulnerabilityInput): DbRedTeamVulnerability {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO red_team_vulnerabilities (
        id, session_id, attack_id, project_id, title, description,
        category, cwe_id, owasp_category, affected_component,
        affected_file, affected_lines, code_snippet, severity,
        cvss_score, exploitability, business_impact,
        reproduction_steps, proof_of_concept, status,
        remediation_suggestion, fix_effort, fix_priority,
        discovered_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.session_id,
      input.attack_id || null,
      input.project_id,
      input.title,
      input.description,
      input.category,
      input.cwe_id || null,
      input.owasp_category || null,
      input.affected_component,
      input.affected_file || null,
      input.affected_lines ? JSON.stringify(input.affected_lines) : null,
      input.code_snippet || null,
      input.severity,
      input.cvss_score || null,
      input.exploitability || 5,
      input.business_impact || 5,
      JSON.stringify(input.reproduction_steps),
      input.proof_of_concept || null,
      input.remediation_suggestion || null,
      input.fix_effort || null,
      input.fix_priority || null,
      now,
      now,
      now
    );

    // Recalculate session stats
    redTeamSessionRepository.recalculateStats(input.session_id);

    return this.getById(id)!;
  },

  /**
   * Update vulnerability status
   */
  updateStatus(
    id: string,
    status: 'open' | 'confirmed' | 'disputed' | 'fixed' | 'wont_fix' | 'false_positive',
    agentType?: string
  ): DbRedTeamVulnerability | null {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return null;

    const updates: string[] = ['status = ?', 'updated_at = ?'];
    const values: (string | number | boolean | null)[] = [status, new Date().toISOString()];

    if (status === 'confirmed') {
      updates.push('confirmed_at = ?');
      values.push(new Date().toISOString());

      if (agentType) {
        const confirmedBy = existing.confirmed_by
          ? JSON.parse(existing.confirmed_by)
          : [];
        if (!confirmedBy.includes(agentType)) {
          confirmedBy.push(agentType);
        }
        updates.push('confirmed_by = ?');
        values.push(JSON.stringify(confirmedBy));
      }
    }

    if (status === 'disputed' && agentType) {
      const disputedBy = existing.disputed_by
        ? JSON.parse(existing.disputed_by)
        : [];
      if (!disputedBy.includes(agentType)) {
        disputedBy.push(agentType);
      }
      updates.push('disputed_by = ?');
      values.push(JSON.stringify(disputedBy));
    }

    if (status === 'fixed') {
      updates.push('resolved_at = ?');
      values.push(new Date().toISOString());
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE red_team_vulnerabilities
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    // Recalculate session stats
    redTeamSessionRepository.recalculateStats(existing.session_id);

    return this.getById(id);
  },

  /**
   * Update severity after debate
   */
  updateSeverity(id: string, severity: AttackSeverity): DbRedTeamVulnerability | null {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE red_team_vulnerabilities
      SET severity = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(severity, new Date().toISOString(), id);

    // Recalculate session stats
    redTeamSessionRepository.recalculateStats(existing.session_id);

    return this.getById(id);
  },

  /**
   * Delete a vulnerability
   */
  delete(id: string): boolean {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return false;

    const stmt = db.prepare('DELETE FROM red_team_vulnerabilities WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      redTeamSessionRepository.recalculateStats(existing.session_id);
    }

    return result.changes > 0;
  }
};

// ============== Debate Repository ==============

export const vulnerabilityDebateRepository = {
  /**
   * Get all debates for a session
   */
  getAllBySession(sessionId: string): DbVulnerabilityDebate[] {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM vulnerability_debates
      WHERE session_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(sessionId) as unknown as DbVulnerabilityDebate[];
  },

  /**
   * Get debate by ID
   */
  getById(id: string): DbVulnerabilityDebate | null {
    const db = getConnection();
    const stmt = db.prepare('SELECT * FROM vulnerability_debates WHERE id = ?');
    const row = stmt.get(id) as unknown as DbVulnerabilityDebate | undefined;
    return row || null;
  },

  /**
   * Get debate for a vulnerability
   */
  getByVulnerability(vulnerabilityId: string): DbVulnerabilityDebate | null {
    const db = getConnection();
    const stmt = db.prepare(`
      SELECT * FROM vulnerability_debates
      WHERE vulnerability_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(vulnerabilityId) as unknown as DbVulnerabilityDebate | undefined;
    return row || null;
  },

  /**
   * Create a new debate
   */
  create(input: CreateDebateInput): DbVulnerabilityDebate {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    const participatingAgents = input.participating_agents || DEFAULT_RED_TEAM_CONFIG.defaultAgents;

    const stmt = db.prepare(`
      INSERT INTO vulnerability_debates (
        id, session_id, vulnerability_id, project_id,
        participating_agents, max_rounds, consensus_threshold,
        status, current_round, turns, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, '[]', ?, ?)
    `);

    stmt.run(
      id,
      input.session_id,
      input.vulnerability_id,
      input.project_id,
      JSON.stringify(participatingAgents),
      input.max_rounds || DEFAULT_RED_TEAM_CONFIG.maxDebateRounds,
      input.consensus_threshold || DEFAULT_RED_TEAM_CONFIG.consensusThreshold,
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Add a debate turn
   */
  addTurn(id: string, turn: VulnerabilityDebateTurn): DbVulnerabilityDebate | null {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return null;

    const turns = JSON.parse(existing.turns) as VulnerabilityDebateTurn[];
    turns.push(turn);

    const stmt = db.prepare(`
      UPDATE vulnerability_debates
      SET turns = ?,
          current_round = ?,
          status = 'in_progress',
          started_at = COALESCE(started_at, ?),
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      JSON.stringify(turns),
      turn.round,
      new Date().toISOString(),
      new Date().toISOString(),
      id
    );

    return this.getById(id);
  },

  /**
   * Complete a debate
   */
  complete(
    id: string,
    outcome: DebateOutcome,
    consensusLevel: number,
    finalSeverity: AttackSeverity | null,
    reasoningSummary: string,
    inputTokens?: number,
    outputTokens?: number
  ): DbVulnerabilityDebate | null {
    const db = getConnection();
    const existing = this.getById(id);
    if (!existing) return null;

    const stmt = db.prepare(`
      UPDATE vulnerability_debates
      SET status = 'completed',
          outcome = ?,
          consensus_level = ?,
          final_severity = ?,
          reasoning_summary = ?,
          input_tokens = COALESCE(input_tokens, 0) + COALESCE(?, 0),
          output_tokens = COALESCE(output_tokens, 0) + COALESCE(?, 0),
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      outcome,
      consensusLevel,
      finalSeverity,
      reasoningSummary,
      inputTokens || 0,
      outputTokens || 0,
      new Date().toISOString(),
      new Date().toISOString(),
      id
    );

    // Update vulnerability based on debate outcome
    if (outcome === 'vulnerability_confirmed' || outcome === 'vulnerability_disputed') {
      const newStatus = outcome === 'vulnerability_confirmed' ? 'confirmed' : 'disputed';
      redTeamVulnerabilityRepository.updateStatus(existing.vulnerability_id, newStatus);
      if (finalSeverity) {
        redTeamVulnerabilityRepository.updateSeverity(existing.vulnerability_id, finalSeverity);
      }
    } else if (outcome === 'false_positive') {
      redTeamVulnerabilityRepository.updateStatus(existing.vulnerability_id, 'false_positive');
    }

    return this.getById(id);
  },

  /**
   * Delete a debate
   */
  delete(id: string): boolean {
    const db = getConnection();
    const stmt = db.prepare('DELETE FROM vulnerability_debates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};

// ============== Summary Repository ==============

export const redTeamSummaryRepository = {
  /**
   * Get summary for a project
   */
  getProjectSummary(projectId: string): RedTeamSummary {
    const db = getConnection();

    // Session stats
    const sessionStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status NOT IN ('completed', 'reporting') THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM red_team_sessions
      WHERE project_id = ?
    `).get(projectId) as unknown as { total: number; active: number; completed: number };

    // Attack stats
    const attackStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as succeeded
      FROM red_team_attacks
      WHERE project_id = ?
    `).get(projectId) as unknown as { total: number; succeeded: number };

    // Vulnerability counts by severity
    const vulnBySeverity = db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM red_team_vulnerabilities
      WHERE project_id = ?
      GROUP BY severity
    `).all(projectId) as unknown as { severity: AttackSeverity; count: number }[];

    const bySeverity: Record<AttackSeverity, number> = {
      info: 0, low: 0, medium: 0, high: 0, critical: 0
    };
    vulnBySeverity.forEach(row => {
      bySeverity[row.severity] = row.count;
    });

    // Vulnerability counts by category
    const vulnByCategory = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM red_team_vulnerabilities
      WHERE project_id = ?
      GROUP BY category
    `).all(projectId) as unknown as { category: VulnerabilityCategory; count: number }[];

    const byCategory: Record<VulnerabilityCategory, number> = {} as Record<VulnerabilityCategory, number>;
    vulnByCategory.forEach(row => {
      byCategory[row.category] = row.count;
    });

    // Vulnerability status counts
    const vulnStatus = db.prepare(`
      SELECT
        SUM(CASE WHEN status IN ('open', 'confirmed') THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN status = 'fixed' THEN 1 ELSE 0 END) as fixed_count
      FROM red_team_vulnerabilities
      WHERE project_id = ?
    `).get(projectId) as unknown as { open_count: number; confirmed_count: number; fixed_count: number };

    // Average risk score
    const riskScore = db.prepare(`
      SELECT AVG(overall_risk_score) as avg_risk
      FROM red_team_sessions
      WHERE project_id = ? AND overall_risk_score IS NOT NULL
    `).get(projectId) as unknown as { avg_risk: number | null };

    // Highest risk session
    const highestRisk = db.prepare(`
      SELECT id
      FROM red_team_sessions
      WHERE project_id = ? AND overall_risk_score IS NOT NULL
      ORDER BY overall_risk_score DESC
      LIMIT 1
    `).get(projectId) as unknown as { id: string } | undefined;

    // Agent stats
    const agentStatsRows = db.prepare(`
      SELECT
        agent_type,
        COUNT(*) as attacks_planned,
        SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as attacks_succeeded,
        SUM(CASE WHEN vulnerability_found = 1 THEN 1 ELSE 0 END) as vulnerabilities_found
      FROM red_team_attacks
      WHERE project_id = ?
      GROUP BY agent_type
    `).all(projectId) as unknown as {
      agent_type: string;
      attacks_planned: number;
      attacks_succeeded: number;
      vulnerabilities_found: number;
    }[];

    const agentStats: Record<string, {
      attacks_planned: number;
      attacks_succeeded: number;
      vulnerabilities_found: number;
      success_rate: number;
    }> = {};

    agentStatsRows.forEach(row => {
      agentStats[row.agent_type] = {
        attacks_planned: row.attacks_planned,
        attacks_succeeded: row.attacks_succeeded,
        vulnerabilities_found: row.vulnerabilities_found,
        success_rate: row.attacks_planned > 0
          ? (row.attacks_succeeded / row.attacks_planned) * 100
          : 0
      };
    });

    const totalVulnerabilities = Object.values(bySeverity).reduce((a, b) => a + b, 0);

    return {
      total_sessions: sessionStats.total,
      active_sessions: sessionStats.active,
      completed_sessions: sessionStats.completed,
      total_attacks: attackStats.total,
      successful_attacks: attackStats.succeeded,
      attack_success_rate: attackStats.total > 0
        ? (attackStats.succeeded / attackStats.total) * 100
        : 0,
      total_vulnerabilities: totalVulnerabilities,
      by_severity: bySeverity,
      by_category: byCategory,
      open_vulnerabilities: vulnStatus.open_count || 0,
      confirmed_vulnerabilities: vulnStatus.confirmed_count || 0,
      fixed_vulnerabilities: vulnStatus.fixed_count || 0,
      average_risk_score: riskScore.avg_risk || 0,
      highest_risk_session_id: highestRisk?.id || null,
      agent_stats: agentStats
    };
  }
};
