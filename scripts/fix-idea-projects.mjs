#!/usr/bin/env node
/**
 * Script to fix ideas that have wrong project_id
 * Updates ideas to match their context's project_id
 *
 * Usage: node scripts/fix-idea-projects.mjs
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECTS_DB = path.join(__dirname, '..', 'database', 'projects.db');
const GOALS_DB = path.join(__dirname, '..', 'database', 'goals.db');

// Contexts to fix
const CONTEXT_IDS = [
  'ctx_1761330592434_6isjjcqxh',
  'ctx_1761330064950_eo1bqu1al'
];

async function main() {
  console.log('=== Fix Idea Projects Script ===\n');

  // Open databases
  const projectsDb = new Database(PROJECTS_DB);
  const goalsDb = new Database(GOALS_DB);

  try {
    // Get project names for display
    const projects = projectsDb.prepare('SELECT id, name FROM projects').all();
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

    console.log('Available projects:');
    projects.forEach(p => console.log(`  - ${p.name}: ${p.id}`));
    console.log('');

    // Check current state
    console.log('=== Current State ===\n');

    for (const contextId of CONTEXT_IDS) {
      const context = goalsDb.prepare(`
        SELECT id, name, project_id FROM contexts WHERE id = ?
      `).get(contextId);

      if (!context) {
        console.log(`⚠ Context ${contextId} not found, skipping...`);
        continue;
      }

      // Count ideas by project
      const ideaStats = goalsDb.prepare(`
        SELECT project_id, COUNT(*) as count
        FROM ideas
        WHERE context_id = ?
        GROUP BY project_id
      `).all(contextId);

      console.log(`Context: ${context.name}`);
      console.log(`  Correct project: ${projectMap[context.project_id]} (${context.project_id})`);
      console.log(`  Ideas distribution:`);

      let totalIdeas = 0;
      let correctIdeas = 0;
      let wrongIdeas = 0;

      ideaStats.forEach(stat => {
        totalIdeas += stat.count;
        if (stat.project_id === context.project_id) {
          correctIdeas += stat.count;
          console.log(`    ✓ ${projectMap[stat.project_id]}: ${stat.count} ideas (correct)`);
        } else {
          wrongIdeas += stat.count;
          console.log(`    ✗ ${projectMap[stat.project_id]}: ${stat.count} ideas (WRONG)`);
        }
      });

      console.log(`  Summary: ${correctIdeas} correct, ${wrongIdeas} wrong, ${totalIdeas} total\n`);
    }

    // Ask for confirmation (in a real interactive script, you'd use readline)
    console.log('=== Migration Plan ===');
    console.log('Will update ideas to match their context\'s project_id\n');

    // Begin transaction
    goalsDb.prepare('BEGIN TRANSACTION').run();

    try {
      let totalUpdated = 0;

      for (const contextId of CONTEXT_IDS) {
        const context = goalsDb.prepare(`
          SELECT id, name, project_id FROM contexts WHERE id = ?
        `).get(contextId);

        if (!context) continue;

        // Update ideas to match context's project
        const result = goalsDb.prepare(`
          UPDATE ideas
          SET project_id = ?,
              updated_at = datetime('now')
          WHERE context_id = ?
            AND project_id != ?
        `).run(context.project_id, contextId, context.project_id);

        if (result.changes > 0) {
          console.log(`✓ Updated ${result.changes} ideas for context: ${context.name}`);
          console.log(`  Moved to project: ${projectMap[context.project_id]}`);
          totalUpdated += result.changes;
        }
      }

      // Commit transaction
      goalsDb.prepare('COMMIT').run();

      console.log(`\n✅ Migration completed successfully!`);
      console.log(`Total ideas updated: ${totalUpdated}\n`);

      // Verify
      console.log('=== Verification ===\n');

      for (const contextId of CONTEXT_IDS) {
        const context = goalsDb.prepare(`
          SELECT id, name, project_id FROM contexts WHERE id = ?
        `).get(contextId);

        if (!context) continue;

        const ideaStats = goalsDb.prepare(`
          SELECT project_id, COUNT(*) as count
          FROM ideas
          WHERE context_id = ?
          GROUP BY project_id
        `).all(contextId);

        console.log(`Context: ${context.name}`);
        ideaStats.forEach(stat => {
          const status = stat.project_id === context.project_id ? '✓' : '✗';
          console.log(`  ${status} ${projectMap[stat.project_id]}: ${stat.count} ideas`);
        });
        console.log('');
      }

    } catch (error) {
      // Rollback on error
      goalsDb.prepare('ROLLBACK').run();
      console.error('\n❌ Migration failed, rolled back changes');
      throw error;
    }

  } finally {
    projectsDb.close();
    goalsDb.close();
    console.log('Database connections closed.');
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
