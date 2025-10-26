#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECTS_DB = path.join(__dirname, '..', 'database', 'projects.db');
const GOALS_DB = path.join(__dirname, '..', 'database', 'goals.db');

const projectsDb = new Database(PROJECTS_DB);
const goalsDb = new Database(GOALS_DB);

const projects = projectsDb.prepare('SELECT id, name FROM projects').all();
const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));

const CONTEXT_IDS = [
  'ctx_1761330592434_6isjjcqxh',
  'ctx_1761330064950_eo1bqu1al'
];

console.log('=== Checking Ideas for Contexts ===\n');

for (const contextId of CONTEXT_IDS) {
  const context = goalsDb.prepare('SELECT id, name, project_id FROM contexts WHERE id = ?').get(contextId);

  if (!context) {
    console.log(`Context ${contextId} not found!\n`);
    continue;
  }

  console.log(`Context: ${context.name}`);
  console.log(`Context project: ${projectMap[context.project_id]} (${context.project_id})\n`);

  const ideas = goalsDb.prepare(`
    SELECT id, title, project_id, context_id
    FROM ideas
    WHERE context_id = ?
    LIMIT 5
  `).all(contextId);

  console.log(`Found ${ideas.length} ideas (showing first 5):`);

  // Group ideas by project
  const ideaProjects = {};
  goalsDb.prepare(`
    SELECT project_id, COUNT(*) as count
    FROM ideas
    WHERE context_id = ?
    GROUP BY project_id
  `).all(contextId).forEach(row => {
    ideaProjects[row.project_id] = row.count;
  });

  console.log('\nIdeas grouped by project:');
  Object.entries(ideaProjects).forEach(([projectId, count]) => {
    console.log(`  ${projectMap[projectId] || 'Unknown'} (${projectId}): ${count} ideas`);
  });

  console.log('\n' + '='.repeat(60) + '\n');
}

projectsDb.close();
goalsDb.close();
