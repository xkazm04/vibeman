import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { join } from 'path';
import type { StateMachineConfig } from '@/app/features/Onboarding/sub_Blueprint/lib/stateMachineTypes';

const DB_PATH = join(process.cwd(), 'database', 'goals.db');

function getDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create state_machine_configs table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS state_machine_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      project_type TEXT NOT NULL,
      version TEXT NOT NULL,
      initial_state TEXT NOT NULL,
      completion_states TEXT NOT NULL,
      states TEXT NOT NULL,
      transitions TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_state_machine_project_type
    ON state_machine_configs(project_type);
  `);

  return db;
}

/**
 * GET - Retrieve state machine configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectType = searchParams.get('projectType');
    const configId = searchParams.get('id');

    const db = getDatabase();

    if (configId) {
      // Get specific config by ID
      const row = db
        .prepare('SELECT * FROM state_machine_configs WHERE id = ?')
        .get(configId) as any;

      if (!row) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }

      const config: StateMachineConfig = {
        id: row.id,
        name: row.name,
        description: row.description,
        projectType: row.project_type,
        version: row.version,
        initialState: row.initial_state,
        completionStates: JSON.parse(row.completion_states),
        states: JSON.parse(row.states),
        transitions: JSON.parse(row.transitions),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      db.close();
      return NextResponse.json({ success: true, config });
    } else if (projectType) {
      // Get config by project type
      const row = db
        .prepare('SELECT * FROM state_machine_configs WHERE project_type = ? ORDER BY updated_at DESC LIMIT 1')
        .get(projectType) as any;

      db.close();

      if (!row) {
        return NextResponse.json(
          { success: true, config: null },
          { status: 200 }
        );
      }

      const config: StateMachineConfig = {
        id: row.id,
        name: row.name,
        description: row.description,
        projectType: row.project_type,
        version: row.version,
        initialState: row.initial_state,
        completionStates: JSON.parse(row.completion_states),
        states: JSON.parse(row.states),
        transitions: JSON.parse(row.transitions),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      return NextResponse.json({ success: true, config });
    } else {
      // Get all configs
      const rows = db
        .prepare('SELECT * FROM state_machine_configs ORDER BY project_type, updated_at DESC')
        .all() as any[];

      db.close();

      const configs: StateMachineConfig[] = rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        projectType: row.project_type,
        version: row.version,
        initialState: row.initial_state,
        completionStates: JSON.parse(row.completion_states),
        states: JSON.parse(row.states),
        transitions: JSON.parse(row.transitions),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return NextResponse.json({ success: true, configs });
    }
  } catch (error) {
    console.error('Error retrieving state machine config:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configuration', details: error },
      { status: 500 }
    );
  }
}

/**
 * POST - Create or update state machine configuration
 */
export async function POST(request: NextRequest) {
  try {
    const config: StateMachineConfig = await request.json();

    // Validate required fields
    if (!config.id || !config.projectType || !config.states || !config.transitions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Check if config exists
    const existing = db
      .prepare('SELECT id FROM state_machine_configs WHERE id = ?')
      .get(config.id);

    if (existing) {
      // Update existing config
      db.prepare(`
        UPDATE state_machine_configs
        SET name = ?,
            description = ?,
            project_type = ?,
            version = ?,
            initial_state = ?,
            completion_states = ?,
            states = ?,
            transitions = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        config.name,
        config.description,
        config.projectType,
        config.version,
        config.initialState,
        JSON.stringify(config.completionStates),
        JSON.stringify(config.states),
        JSON.stringify(config.transitions),
        new Date().toISOString(),
        config.id
      );
    } else {
      // Insert new config
      db.prepare(`
        INSERT INTO state_machine_configs (
          id, name, description, project_type, version,
          initial_state, completion_states, states, transitions,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        config.id,
        config.name,
        config.description,
        config.projectType,
        config.version,
        config.initialState,
        JSON.stringify(config.completionStates),
        JSON.stringify(config.states),
        JSON.stringify(config.transitions),
        config.createdAt,
        config.updatedAt
      );
    }

    db.close();

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
    });
  } catch (error) {
    console.error('Error saving state machine config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration', details: error },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete state machine configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');

    if (!configId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    db.prepare('DELETE FROM state_machine_configs WHERE id = ?').run(configId);

    db.close();

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting state machine config:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration', details: error },
      { status: 500 }
    );
  }
}
