/**
 * Automation Session Event Repository
 * CRUD operations for automation session events (file reads, findings, progress, etc.)
 */

import { randomUUID } from 'crypto';
import { getDatabase } from '../connection';
import type {
  DbAutomationSessionEvent,
  AutomationSessionEvent,
  AutomationEventType,
  AutomationEventData,
} from '../models/automation-event.types';

// ============ Helper Functions ============

function parseEventData(data: string): AutomationEventData {
  try {
    return JSON.parse(data);
  } catch {
    return { message: data, recoverable: true } as AutomationEventData;
  }
}

function toEvent(row: DbAutomationSessionEvent): AutomationSessionEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type as AutomationEventType,
    timestamp: row.timestamp,
    data: parseEventData(row.data),
  };
}

// ============ Repository Functions ============

/**
 * Create a new automation session event
 */
export function createEvent(params: {
  sessionId: string;
  eventType: AutomationEventType;
  data: AutomationEventData;
}): AutomationSessionEvent {
  const db = getDatabase();
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  const dataJson = JSON.stringify(params.data);

  db.prepare(`
    INSERT INTO automation_session_events (id, session_id, event_type, timestamp, data)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, params.sessionId, params.eventType, timestamp, dataJson);

  return {
    id,
    sessionId: params.sessionId,
    eventType: params.eventType,
    timestamp,
    data: params.data,
  };
}

/**
 * Get events for a session, optionally filtered by type
 */
export function getEventsBySession(
  sessionId: string,
  options?: {
    eventType?: AutomationEventType;
    limit?: number;
    after?: string;  // Timestamp to get events after (for pagination/streaming)
  }
): AutomationSessionEvent[] {
  const db = getDatabase();
  let query = 'SELECT * FROM automation_session_events WHERE session_id = ?';
  const params: (string | number)[] = [sessionId];

  if (options?.eventType) {
    query += ' AND event_type = ?';
    params.push(options.eventType);
  }

  if (options?.after) {
    query += ' AND timestamp > ?';
    params.push(options.after);
  }

  query += ' ORDER BY timestamp ASC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const rows = db.prepare(query).all(...params) as DbAutomationSessionEvent[];
  return rows.map(toEvent);
}

/**
 * Get the most recent events for a session
 */
export function getRecentEvents(
  sessionId: string,
  limit: number = 50
): AutomationSessionEvent[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM automation_session_events
    WHERE session_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(sessionId, limit) as DbAutomationSessionEvent[];

  // Reverse to get chronological order
  return rows.map(toEvent).reverse();
}

/**
 * Get event count by type for a session
 */
export function getEventCounts(sessionId: string): Record<AutomationEventType, number> {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT event_type, COUNT(*) as count
    FROM automation_session_events
    WHERE session_id = ?
    GROUP BY event_type
  `).all(sessionId) as Array<{ event_type: string; count: number }>;

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.event_type] = row.count;
  }

  return counts as Record<AutomationEventType, number>;
}

/**
 * Get all files read during a session
 */
export function getFilesRead(sessionId: string): string[] {
  const events = getEventsBySession(sessionId, { eventType: 'file_read' });
  const files = new Set<string>();

  for (const event of events) {
    const data = event.data as { file?: string };
    if (data.file) {
      files.add(data.file);
    }
  }

  return Array.from(files);
}

/**
 * Get all findings from a session
 */
export function getFindings(sessionId: string): Array<{
  finding: string;
  file?: string;
  line?: number;
  category?: string;
  timestamp: string;
}> {
  const events = getEventsBySession(sessionId, { eventType: 'finding' });

  return events.map(event => {
    const data = event.data as {
      finding: string;
      file?: string;
      line?: number;
      category?: string;
    };
    return {
      finding: data.finding,
      file: data.file,
      line: data.line,
      category: data.category,
      timestamp: event.timestamp,
    };
  });
}

/**
 * Delete all events for a session
 */
export function deleteEventsBySession(sessionId: string): number {
  const db = getDatabase();
  const result = db.prepare(`
    DELETE FROM automation_session_events WHERE session_id = ?
  `).run(sessionId);

  return result.changes;
}

/**
 * Get the latest progress update for a session
 */
export function getLatestProgress(sessionId: string): {
  progress: number;
  message: string;
  timestamp: string;
} | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT * FROM automation_session_events
    WHERE session_id = ? AND event_type = 'progress'
    ORDER BY timestamp DESC
    LIMIT 1
  `).get(sessionId) as DbAutomationSessionEvent | undefined;

  if (!row) return null;

  const data = parseEventData(row.data) as { progress: number; message: string };
  return {
    progress: data.progress ?? 0,
    message: data.message ?? '',
    timestamp: row.timestamp,
  };
}

/**
 * Cleanup old events (older than specified days)
 */
export function cleanupOldEvents(daysOld: number = 30): number {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = db.prepare(`
    DELETE FROM automation_session_events
    WHERE timestamp < ?
  `).run(cutoffDate.toISOString());

  return result.changes;
}

// ============ Export Repository Object ============

export const automationSessionEventRepository = {
  create: createEvent,
  getBySession: getEventsBySession,
  getRecent: getRecentEvents,
  getCounts: getEventCounts,
  getFilesRead,
  getFindings,
  getLatestProgress,
  deleteBySession: deleteEventsBySession,
  cleanupOld: cleanupOldEvents,
};
