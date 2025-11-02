import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database', 'goals.db');
const db = new Database(dbPath);

const stmt = db.prepare(`
  SELECT id, requirement_name, title, created_at 
  FROM implementation_log 
  WHERE requirement_name = 'centralize-context-colors-in-constants'
`);

const log = stmt.get();
if (log) {
  console.log('✓ Implementation log verified:');
  console.log('  ID:', log.id);
  console.log('  Requirement:', log.requirement_name);
  console.log('  Title:', log.title);
  console.log('  Created:', log.created_at);
} else {
  console.log('✗ Implementation log not found');
}

db.close();
