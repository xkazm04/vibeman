import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database', 'goals.db');
const db = new Database(dbPath);

// Check if implementation_log table exists
const tableExists = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='implementation_log'
`).get();

if (!tableExists) {
  console.error('❌ implementation_log table does not exist in database');
  db.close();
  process.exit(1);
}

// Create log entry
const id = randomUUID();
const projectId = 'c32769af-72ed-4764-bd27-550d46f14bc5';
const requirementName = 'enhanced-queue-visualization';
const title = 'Enhanced Queue Visualization';
const overview = `Implemented a comprehensive queue visualization system for the Task Runner feature. Created a new QueueVisualization component (src/app/features/TaskRunner/components/QueueVisualization.tsx) that displays a horizontal scrollable list of execution queue items with real-time status indicators. The visualization shows queued, running, completed, and failed tasks with distinct color-coded borders and icons. Each queue item displays the requirement name, project name, and status badge. Running items have an animated pulse effect. Integrated the component into TaskRunnerHeader.tsx to appear above the main header when there are active queue items. The visualization includes summary counts for each status type and supports displaying up to 8 items with an overflow indicator. The design matches the existing glassmorphism theme with gradient backgrounds, backdrop blur, and smooth animations using Framer Motion.`;
const tested = 0;

try {
  const insert = db.prepare(`
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

  const result = insert.run(id, projectId, requirementName, title, overview, tested);

  console.log('✅ Implementation log entry created successfully!');
  console.log('ID:', id);
  console.log('Project ID:', projectId);
  console.log('Requirement Name:', requirementName);
  console.log('Title:', title);
  console.log('Rows affected:', result.changes);
} catch (error) {
  console.error('❌ Failed to create implementation log entry:', error);
  db.close();
  process.exit(1);
}

db.close();
