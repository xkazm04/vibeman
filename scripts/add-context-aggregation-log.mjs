import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'database', 'goals.db');

try {
  const db = new Database(dbPath);

  const id = randomUUID();
  const projectId = 'c32769af-72ed-4764-bd27-550d46f14bc5';
  const requirementName = 'context-aggregation-api-endpoint';
  const title = 'Context Aggregation API';
  const overview = `Implemented server-side API route /api/goal-contexts/[id] that fetches a goal with all related data in a single transaction. The endpoint aggregates goal details, associated contexts, scans, and ideas into a nested JSON payload. Created complete TypeScript interface (GoalContextAggregation) for the response structure with typed sub-objects for goal, contexts array, scans array, and ideas array. The implementation uses existing database repositories (goalDb, contextDb, scanDb, ideaDb) and leverages the shared SQLite connection for efficient queries. Key features include: intelligent context filtering (specific context if goal.context_id exists, all project contexts otherwise), scan filtering by relevant ideas, proper JSON parsing of file_paths arrays, boolean conversion for SQLite integers (has_context_file, user_pattern), comprehensive error handling with detailed error messages, and proper HTTP status codes (200, 400, 404, 500). The endpoint reduces round-trips for the Annette Voicebot and eliminates client-side joins, improving performance and developer ergonomics. Response includes complete data hierarchy with all timestamps, metadata, and relationships preserved.`;
  const tested = 1;

  const stmt = db.prepare(`
    INSERT INTO implementation_log (
      id,
      project_id,
      requirement_name,
      title,
      overview,
      tested,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const result = stmt.run(id, projectId, requirementName, title, overview, tested);

  console.log('✅ Implementation log entry created successfully!');
  console.log(`   ID: ${id}`);
  console.log(`   Title: ${title}`);
  console.log(`   Rows affected: ${result.changes}`);

  db.close();
} catch (error) {
  console.error('❌ Error creating implementation log:', error);
  process.exit(1);
}
