/**
 * Agent Reputation Repository
 * Database operations for tracking agent reputation in parliament debates
 */

import { getDatabase } from '@/app/db/connection';
import { getCurrentTimestamp, selectOne } from '@/app/db/repositories/repository.utils';
import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import type { AgentReputation, CritiqueValidation } from './types';

/**
 * Database types for agent reputation
 */
export interface DbAgentReputation {
  id: string;
  agent_type: string;
  project_id: string;
  total_critiques: number;
  validated_critiques: number;
  rejected_critiques: number;
  accuracy_rate: number;
  reputation_score: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface DbCritiqueValidation {
  id: string;
  debate_session_id: string;
  critique_id: string;
  agent_type: string;
  project_id: string;
  validated: number; // SQLite boolean
  feedback: string | null;
  validated_at: string;
  created_at: string;
}

export interface DbDebateSession {
  id: string;
  project_id: string;
  idea_ids: string; // JSON array
  status: string;
  selected_idea_id: string | null;
  consensus_level: number;
  total_tokens_used: number;
  debate_summary: string | null;
  trade_offs: string | null; // JSON array
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Ensure parliament tables exist
 */
export function ensureParliamentTables(): void {
  const db = getDatabase();

  // Agent reputation table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_reputation (
      id TEXT PRIMARY KEY,
      agent_type TEXT NOT NULL,
      project_id TEXT NOT NULL,
      total_critiques INTEGER DEFAULT 0,
      validated_critiques INTEGER DEFAULT 0,
      rejected_critiques INTEGER DEFAULT 0,
      accuracy_rate REAL DEFAULT 0.5,
      reputation_score INTEGER DEFAULT 50,
      last_updated TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(agent_type, project_id)
    )
  `);

  // Critique validation table
  db.exec(`
    CREATE TABLE IF NOT EXISTS critique_validations (
      id TEXT PRIMARY KEY,
      debate_session_id TEXT NOT NULL,
      critique_id TEXT NOT NULL,
      agent_type TEXT NOT NULL,
      project_id TEXT NOT NULL,
      validated INTEGER DEFAULT 0,
      feedback TEXT,
      validated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (debate_session_id) REFERENCES debate_sessions(id)
    )
  `);

  // Debate sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS debate_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      idea_ids TEXT NOT NULL,
      status TEXT NOT NULL,
      selected_idea_id TEXT,
      consensus_level REAL DEFAULT 0,
      total_tokens_used INTEGER DEFAULT 0,
      debate_summary TEXT,
      trade_offs TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_reputation_project ON agent_reputation(project_id);
    CREATE INDEX IF NOT EXISTS idx_critique_validations_session ON critique_validations(debate_session_id);
    CREATE INDEX IF NOT EXISTS idx_debate_sessions_project ON debate_sessions(project_id);
  `);
}

/**
 * Agent Reputation Repository
 */
export const reputationDb = {
  /**
   * Get agent reputation for a specific agent and project
   */
  getAgentReputation: (agentType: ScanType, projectId: string): AgentReputation | null => {
    ensureParliamentTables();
    const db = getDatabase();
    const row = selectOne<DbAgentReputation>(
      db,
      'SELECT * FROM agent_reputation WHERE agent_type = ? AND project_id = ?',
      agentType,
      projectId
    );

    if (!row) return null;

    return {
      agentType: row.agent_type as ScanType,
      projectId: row.project_id,
      totalCritiques: row.total_critiques,
      validatedCritiques: row.validated_critiques,
      rejectedCritiques: row.rejected_critiques,
      accuracyRate: row.accuracy_rate,
      reputationScore: row.reputation_score,
      lastUpdated: row.last_updated,
    };
  },

  /**
   * Get all agent reputations for a project
   */
  getProjectReputations: (projectId: string): AgentReputation[] => {
    ensureParliamentTables();
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM agent_reputation
      WHERE project_id = ?
      ORDER BY reputation_score DESC
    `);
    const rows = stmt.all(projectId) as DbAgentReputation[];

    return rows.map(row => ({
      agentType: row.agent_type as ScanType,
      projectId: row.project_id,
      totalCritiques: row.total_critiques,
      validatedCritiques: row.validated_critiques,
      rejectedCritiques: row.rejected_critiques,
      accuracyRate: row.accuracy_rate,
      reputationScore: row.reputation_score,
      lastUpdated: row.last_updated,
    }));
  },

  /**
   * Create or update agent reputation
   */
  upsertAgentReputation: (reputation: AgentReputation): AgentReputation => {
    ensureParliamentTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const existing = selectOne<DbAgentReputation>(
      db,
      'SELECT * FROM agent_reputation WHERE agent_type = ? AND project_id = ?',
      reputation.agentType,
      reputation.projectId
    );

    if (existing) {
      // Update existing
      const stmt = db.prepare(`
        UPDATE agent_reputation SET
          total_critiques = ?,
          validated_critiques = ?,
          rejected_critiques = ?,
          accuracy_rate = ?,
          reputation_score = ?,
          last_updated = ?,
          updated_at = ?
        WHERE agent_type = ? AND project_id = ?
      `);

      stmt.run(
        reputation.totalCritiques,
        reputation.validatedCritiques,
        reputation.rejectedCritiques,
        reputation.accuracyRate,
        reputation.reputationScore,
        now,
        now,
        reputation.agentType,
        reputation.projectId
      );
    } else {
      // Insert new
      const id = crypto.randomUUID();
      const stmt = db.prepare(`
        INSERT INTO agent_reputation (
          id, agent_type, project_id, total_critiques, validated_critiques,
          rejected_critiques, accuracy_rate, reputation_score, last_updated,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        reputation.agentType,
        reputation.projectId,
        reputation.totalCritiques,
        reputation.validatedCritiques,
        reputation.rejectedCritiques,
        reputation.accuracyRate,
        reputation.reputationScore,
        now,
        now,
        now
      );
    }

    return {
      ...reputation,
      lastUpdated: now,
    };
  },

  /**
   * Record a critique validation and update reputation
   */
  validateCritique: (validation: CritiqueValidation): void => {
    ensureParliamentTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Get project ID from debate session
    const session = selectOne<DbDebateSession>(
      db,
      'SELECT project_id FROM debate_sessions WHERE id = ?',
      validation.debateSessionId
    );

    if (!session) {
      console.warn(`Debate session not found: ${validation.debateSessionId}`);
      return;
    }

    // Insert validation record
    const insertStmt = db.prepare(`
      INSERT INTO critique_validations (
        id, debate_session_id, critique_id, agent_type, project_id,
        validated, feedback, validated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      validation.id,
      validation.debateSessionId,
      validation.critiqueId,
      validation.agentType,
      session.project_id,
      validation.validated ? 1 : 0,
      validation.feedback || null,
      validation.validatedAt,
      now
    );

    // Update agent reputation
    reputationDb.updateReputationFromValidation(
      validation.agentType as ScanType,
      session.project_id,
      validation.validated
    );
  },

  /**
   * Update reputation based on critique validation
   */
  updateReputationFromValidation: (
    agentType: ScanType,
    projectId: string,
    validated: boolean
  ): void => {
    ensureParliamentTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Get current reputation or create default
    let reputation = reputationDb.getAgentReputation(agentType, projectId);

    if (!reputation) {
      reputation = {
        agentType,
        projectId,
        totalCritiques: 0,
        validatedCritiques: 0,
        rejectedCritiques: 0,
        accuracyRate: 0.5,
        reputationScore: 50,
        lastUpdated: now,
      };
    }

    // Update counts
    reputation.totalCritiques += 1;
    if (validated) {
      reputation.validatedCritiques += 1;
    } else {
      reputation.rejectedCritiques += 1;
    }

    // Calculate new accuracy rate
    reputation.accuracyRate = reputation.totalCritiques > 0
      ? reputation.validatedCritiques / reputation.totalCritiques
      : 0.5;

    // Calculate reputation score (0-100)
    // Base score + accuracy bonus + consistency bonus
    const baseScore = 50;
    const accuracyBonus = reputation.accuracyRate * 30; // Max 30 points
    const consistencyBonus = Math.min(reputation.totalCritiques / 10, 1) * 20; // Max 20 points for 10+ critiques
    reputation.reputationScore = Math.round(baseScore + accuracyBonus + consistencyBonus);

    // Save updated reputation
    reputationDb.upsertAgentReputation(reputation);
  },

  /**
   * Get critique validation history for an agent
   */
  getCritiqueHistory: (agentType: ScanType, projectId: string): CritiqueValidation[] => {
    ensureParliamentTables();
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM critique_validations
      WHERE agent_type = ? AND project_id = ?
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(agentType, projectId) as DbCritiqueValidation[];

    return rows.map(row => ({
      id: row.id,
      debateSessionId: row.debate_session_id,
      critiqueId: row.critique_id,
      agentType: row.agent_type as ScanType,
      validated: row.validated === 1,
      feedback: row.feedback ?? undefined,
      validatedAt: row.validated_at,
    }));
  },
};

/**
 * Debate Session Repository
 */
export const debateSessionDb = {
  /**
   * Save a debate session
   */
  saveSession: (session: {
    id: string;
    projectId: string;
    ideaIds: string[];
    status: string;
    selectedIdeaId: string | null;
    consensusLevel: number;
    totalTokensUsed: number;
    debateSummary: string | null;
    tradeOffs: object[];
    startedAt: string;
    completedAt: string | null;
  }): void => {
    ensureParliamentTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO debate_sessions (
        id, project_id, idea_ids, status, selected_idea_id,
        consensus_level, total_tokens_used, debate_summary, trade_offs,
        started_at, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.projectId,
      JSON.stringify(session.ideaIds),
      session.status,
      session.selectedIdeaId,
      session.consensusLevel,
      session.totalTokensUsed,
      session.debateSummary,
      JSON.stringify(session.tradeOffs),
      session.startedAt,
      session.completedAt,
      now,
      now
    );
  },

  /**
   * Get a debate session by ID
   */
  getSession: (sessionId: string): DbDebateSession | null => {
    ensureParliamentTables();
    const db = getDatabase();
    return selectOne<DbDebateSession>(
      db,
      'SELECT * FROM debate_sessions WHERE id = ?',
      sessionId
    );
  },

  /**
   * Get all debate sessions for a project
   */
  getProjectSessions: (projectId: string): DbDebateSession[] => {
    ensureParliamentTables();
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM debate_sessions
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbDebateSession[];
  },

  /**
   * Update debate session status
   */
  updateSessionStatus: (
    sessionId: string,
    status: string,
    selectedIdeaId?: string | null,
    completedAt?: string
  ): void => {
    ensureParliamentTables();
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE debate_sessions SET
        status = ?,
        selected_idea_id = COALESCE(?, selected_idea_id),
        completed_at = COALESCE(?, completed_at),
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, selectedIdeaId, completedAt, now, sessionId);
  },

  /**
   * Delete a debate session
   */
  deleteSession: (sessionId: string): boolean => {
    ensureParliamentTables();
    const db = getDatabase();

    // Delete related validations first
    const deleteValidations = db.prepare(
      'DELETE FROM critique_validations WHERE debate_session_id = ?'
    );
    deleteValidations.run(sessionId);

    // Delete session
    const deleteSession = db.prepare('DELETE FROM debate_sessions WHERE id = ?');
    const result = deleteSession.run(sessionId);
    return result.changes > 0;
  },
};

export default { reputationDb, debateSessionDb };
