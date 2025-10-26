#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECTS_DB = path.join(__dirname, '..', 'database', 'projects.db');
const GOALS_DB = path.join(__dirname, '..', 'database', 'goals.db');

console.log('=== Projects Database ===');
const projectsDb = new Database(PROJECTS_DB);
const projects = projectsDb.prepare('SELECT id, name, path FROM projects').all();
projects.forEach(p => {
  console.log(`${p.name}:`);
  console.log(`  ID: ${p.id}`);
  console.log(`  Path: ${p.path}`);
  console.log('');
});
projectsDb.close();

console.log('\n=== Checking Contexts ===');
const goalsDb = new Database(GOALS_DB);

const CONTEXT_IDS = [
  'ctx_1761330592434_6isjjcqxh',
  'ctx_1761330064950_eo1bqu1al'
];

for (const contextId of CONTEXT_IDS) {
  const context = goalsDb.prepare(`
    SELECT c.id, c.project_id, c.name
    FROM contexts c
    WHERE c.id = ?
  `).get(contextId);

  if (context) {
    const project = projects.find(p => p.id === context.project_id);
    console.log(`Context: ${context.name} (${context.id})`);
    console.log(`  Current project: ${project ? project.name : 'Unknown'} (${context.project_id})`);

    const ideas = goalsDb.prepare('SELECT COUNT(*) as count FROM ideas WHERE context_id = ?').get(contextId);
    console.log(`  Ideas: ${ideas.count}`);
    console.log('');
  }
}

goalsDb.close();
