#!/usr/bin/env node
/**
 * Log batch 17 implementation to database
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database', 'goals.db');
const db = new Database(dbPath);

const logEntry = {
  id: randomUUID(),
  project_id: 'c32769af-72ed-4764-bd27-550d46f14bc5',
  requirement_name: 'refactor-batch-17',
  title: 'API Routes Code Quality Improvements',
  overview: `Implemented comprehensive code quality improvements across 8 API route files as part of batch 17 refactoring.

Key improvements:
- Removed 2 unused imports (scanDb from ideas/route.ts, contextDb from contexts/route.ts)
- Replaced 60+ console.log/error statements with structured logger calls across all routes
- Created reusable API helper functions (createErrorResponse, handleError, notFoundResponse) to eliminate code duplication
- Applied consistent error handling patterns across all refactored routes
- Added proper TypeScript error context wrapping for logger calls

Files modified:
- src/app/api/ideas/route.ts
- src/app/api/goals/route.ts
- src/app/api/file-watch/route.ts
- src/app/api/file-fixer/route.ts (15 console statements replaced)
- src/app/api/file-dependencies/route.ts
- src/app/api/contexts/route.ts
- src/app/api/context-groups/route.ts
- src/app/api/file-scanner/route.ts (33 console statements replaced, 735 line file)

New infrastructure:
- Created src/lib/api-helpers.ts with reusable error handling utilities
- Automated refactoring with scripts/refactor-batch-17.mjs
- Logger call fixes with scripts/fix-logger-calls.mjs

Benefits:
- Cleaner production code with no console statements
- Consistent error response formatting
- Reduced code duplication across routes
- Structured logging with context objects
- Better maintainability and debugging capabilities

This addresses issues 1-5, 9, 13, 16, 18-20 from the batch 17 requirement, focusing on high-impact, low-risk code quality improvements.`,
  tested: 0,
  created_at: new Date().toISOString()
};

try {
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

  stmt.run(
    logEntry.id,
    logEntry.project_id,
    logEntry.requirement_name,
    logEntry.title,
    logEntry.overview,
    logEntry.tested
  );

  console.log('✅ Implementation log entry created successfully');
  console.log(`   ID: ${logEntry.id}`);
  console.log(`   Title: ${logEntry.title}`);

} catch (error) {
  console.error('❌ Error creating implementation log:', error);
  process.exit(1);
} finally {
  db.close();
}
