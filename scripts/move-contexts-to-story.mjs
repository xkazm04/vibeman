#!/usr/bin/env node
/**
 * Script to move specific contexts and their associated ideas from GOAT project to story project
 *
 * Usage: node scripts/move-contexts-to-story.mjs
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = path.join(__dirname, '..', 'database', 'goals.db');

// Context IDs to move
const CONTEXT_IDS = [
  'ctx_1761330592434_6isjjcqxh',
  'ctx_1761330064950_eo1bqu1al'
];

async function main() {
  console.log('Opening database:', DB_PATH);
  const db = new Database(DB_PATH);

  try {
    // Find project IDs
    console.log('\n=== Checking Projects ===');
    const projects = db.prepare(`
      SELECT DISTINCT project_id FROM contexts
    `).all();

    console.log('Projects found in contexts table:', projects.map(p => p.project_id));

    // Check if contexts exist
    console.log('\n=== Checking Contexts ===');
    for (const contextId of CONTEXT_IDS) {
      const context = db.prepare(`
        SELECT id, project_id, name FROM contexts WHERE id = ?
      `).get(contextId);

      if (context) {
        console.log(`✓ Found context: ${context.name} (${context.id}) in project: ${context.project_id}`);
      } else {
        console.log(`✗ Context not found: ${contextId}`);
      }
    }

    // Find GOAT and story project IDs
    console.log('\n=== Finding Project IDs ===');
    const goatContext = db.prepare(`
      SELECT project_id FROM contexts WHERE id = ?
    `).get(CONTEXT_IDS[0]);

    if (!goatContext) {
      console.error('Cannot find source project (GOAT). Exiting.');
      return;
    }

    const sourceProjectId = goatContext.project_id;
    console.log('Source project ID (GOAT):', sourceProjectId);

    // You need to specify the story project ID
    // Let's check all available projects
    const allProjects = db.prepare(`
      SELECT id, name, path FROM projects
    `).all();

    console.log('\nAvailable projects:');
    allProjects.forEach(p => {
      console.log(`  - ${p.name} (${p.id}): ${p.path}`);
    });

    // Try to find story project
    const storyProject = allProjects.find(p =>
      p.name.toLowerCase().includes('story') || p.path.toLowerCase().includes('story')
    );

    if (!storyProject) {
      console.error('\nCannot find story project. Please check project names.');
      return;
    }

    const targetProjectId = storyProject.id;
    console.log('\nTarget project ID (story):', targetProjectId, '-', storyProject.name);

    // Confirm before proceeding
    console.log('\n=== Migration Plan ===');
    console.log(`Will move ${CONTEXT_IDS.length} contexts from ${sourceProjectId} to ${targetProjectId}`);
    console.log('Contexts to move:');
    CONTEXT_IDS.forEach(id => console.log(`  - ${id}`));

    // Count associated ideas
    const ideasToMove = db.prepare(`
      SELECT COUNT(*) as count FROM ideas WHERE context_id IN (${CONTEXT_IDS.map(() => '?').join(',')})
    `).get(...CONTEXT_IDS);

    console.log(`\nAssociated ideas to move: ${ideasToMove.count}`);

    // Begin transaction
    console.log('\n=== Executing Migration ===');
    db.prepare('BEGIN TRANSACTION').run();

    try {
      // Update contexts
      const updateContextStmt = db.prepare(`
        UPDATE contexts SET project_id = ? WHERE id = ?
      `);

      for (const contextId of CONTEXT_IDS) {
        const result = updateContextStmt.run(targetProjectId, contextId);
        console.log(`✓ Updated context ${contextId}: ${result.changes} row(s)`);
      }

      // Update ideas
      const updateIdeasStmt = db.prepare(`
        UPDATE ideas SET project_id = ? WHERE context_id = ?
      `);

      for (const contextId of CONTEXT_IDS) {
        const result = updateIdeasStmt.run(targetProjectId, contextId);
        console.log(`✓ Updated ideas for context ${contextId}: ${result.changes} row(s)`);
      }

      // Commit transaction
      db.prepare('COMMIT').run();
      console.log('\n✅ Migration completed successfully!');

      // Verify the changes
      console.log('\n=== Verification ===');
      for (const contextId of CONTEXT_IDS) {
        const context = db.prepare(`
          SELECT id, project_id, name FROM contexts WHERE id = ?
        `).get(contextId);

        const ideas = db.prepare(`
          SELECT COUNT(*) as count FROM ideas WHERE context_id = ?
        `).get(contextId);

        console.log(`Context: ${context.name} (${context.id})`);
        console.log(`  - Now in project: ${context.project_id}`);
        console.log(`  - Associated ideas: ${ideas.count}`);
      }

    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      console.error('\n❌ Migration failed, rolled back changes');
      throw error;
    }

  } finally {
    db.close();
    console.log('\nDatabase closed.');
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
