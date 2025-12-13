/**
 * Migration 46: Create Goal Hub tables
 *
 * Goal Hub is the central orchestration system for goal-driven development:
 * - Extends goals with hypotheses (testable conditions for goal completion)
 * - Stores goal breakdowns from multi-agent analysis
 * - Tracks hypothesis verification status and evidence
 */

import { getConnection } from '../drivers';
import { createTableIfNotExists, addColumnsIfNotExist } from './migration.utils';

/**
 * Create goal_hypotheses table
 * Stores testable conditions that prove goal completion
 */
export function createGoalHypothesesTable() {
  const db = getConnection();

  createTableIfNotExists(db, 'goal_hypotheses', `
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    project_id TEXT NOT NULL,

    -- Hypothesis content
    title TEXT NOT NULL,
    statement TEXT NOT NULL,
    reasoning TEXT,

    -- Classification
    category TEXT NOT NULL DEFAULT 'behavior',
    priority INTEGER NOT NULL DEFAULT 5,
    agent_source TEXT,

    -- Verification
    status TEXT NOT NULL DEFAULT 'unverified',
    verification_method TEXT DEFAULT 'manual',
    evidence TEXT,
    evidence_type TEXT,
    verified_at TEXT,

    -- Metadata
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
  `);
}

/**
 * Create goal_breakdowns table
 * Stores multi-agent analysis results for goal decomposition
 */
export function createGoalBreakdownsTable() {
  const db = getConnection();

  createTableIfNotExists(db, 'goal_breakdowns', `
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    project_id TEXT NOT NULL,

    -- Analysis metadata
    prompt_used TEXT,
    model_used TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,

    -- Agent responses stored as JSON
    agent_responses TEXT NOT NULL,

    -- Generated hypotheses count
    hypotheses_generated INTEGER DEFAULT 0,

    -- Timestamps
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
  `);
}

/**
 * Add new columns to goals table for Goal Hub
 */
export function extendGoalsTable() {
  const db = getConnection();

  addColumnsIfNotExist(db, 'goals', [
    { name: 'progress', definition: 'INTEGER DEFAULT 0' },
    { name: 'hypotheses_total', definition: 'INTEGER DEFAULT 0' },
    { name: 'hypotheses_verified', definition: 'INTEGER DEFAULT 0' },
    { name: 'target_date', definition: 'TEXT' },
    { name: 'started_at', definition: 'TEXT' },
    { name: 'completed_at', definition: 'TEXT' },
  ]);
}

/**
 * Run all Goal Hub migrations
 */
export function migrateGoalHub() {
  createGoalHypothesesTable();
  createGoalBreakdownsTable();
  extendGoalsTable();
}
