import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database', 'goals.db');
const db = new Database(dbPath);

const id = randomUUID();
const projectId = 'c32769af-72ed-4764-bd27-550d46f14bc5';
const requirementName = 'centralize-context-colors-in-constants';
const title = 'Centralize Context Colors';
const overview = `Implemented centralization of context group color palette into a single source of truth. Created src/lib/constants/contextColors.ts as the central location for the 3×3 color palette (9 colors). Updated all files that previously maintained their own copy of CONTEXT_GROUP_COLORS to import from the centralized constant. Key changes:

- Created src/lib/constants/contextColors.ts with CONTEXT_GROUP_COLORS constant, ContextColor type, and useContextColors hook
- Created src/lib/constants/index.ts to re-export constants from a single location
- Updated src/stores/contextStore.ts to import from constants (maintains re-export for backward compatibility)
- Updated src/lib/queries/contextQueries.ts to import from constants (removed duplicate declaration)
- Updated src/app/coder/Context/ContextGroups/ContextGroupManagement/CG_modal.tsx to import from constants
- Updated src/app/coder/Context/ContextGroups/ContextGroupManagement/CG_createSection.tsx to import from constants
- Fixed unrelated type error in src/app/api/annette/chat/route.ts (metadata should be object, not stringified JSON)

This eliminates duplicate color definitions, prevents accidental drift, simplifies palette updates, and makes the color scheme available to future features like theming.`;

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

try {
  stmt.run(id, projectId, requirementName, title, overview, 0);
  console.log('✓ Implementation log created successfully');
  console.log('  ID:', id);
  console.log('  Requirement:', requirementName);
  console.log('  Title:', title);
} catch (error) {
  console.error('✗ Failed to create implementation log:', error.message);
  process.exit(1);
} finally {
  db.close();
}
