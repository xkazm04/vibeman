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
  const requirementName = 'command-usage-analytics-voicebot';
  const title = 'Command Usage Analytics for Voicebot';
  const overview = `Implemented comprehensive command usage analytics system for Annette Voicebot. Enhanced existing analytics infrastructure with proper integration into voicebot commands. Key components: analyticsService.ts provides logCommandExecution() and getAnalyticsSummary() functions for logging and retrieving metrics; analyticsWrapper.ts exports trackCommand() and trackTTSPlayback() wrappers for non-blocking analytics tracking; AnalyticsDashboard.tsx component displays command metrics with collapsible panel showing total commands, success rate, average response time, most frequent commands, performance breakdown (STT/LLM/TTS), and recent failures. Updated AnnettePanel.tsx button handlers to wrap sendToAnnette calls with trackCommand() for proper execution time tracking. Added database migration (migrateVoicebotAnalyticsTable) that creates voicebot_analytics table with columns: id, project_id, command_name, command_type (button/voice/text), execution_time_ms, success flag, error_message, timing breakdowns (stt_ms, llm_ms, tts_ms, total_ms), provider, model, tools_used, and timestamp. API endpoint at /api/annette/analytics supports POST for logging and GET for querying with filters. Analytics are logged asynchronously to avoid blocking user interactions. Dashboard is already integrated into AnnettePanel and displays trends for product owners to inform feature prioritization and troubleshooting. All components follow existing design patterns with glassmorphism effects, Framer Motion animations, and monospace typography.`;
  const tested = 0;

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
