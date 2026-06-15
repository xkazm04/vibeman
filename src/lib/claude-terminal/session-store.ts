/**
 * SQLite-backed SessionStore for the Claude Agent SDK transcript mirror.
 *
 * The SDK already writes transcripts to disk under CLAUDE_CONFIG_DIR; this
 * adapter receives a secondary stream so the app's own SQLite is the
 * authoritative store. Mirror writes are POST-disk so durability is already
 * guaranteed by the time `append()` is called.
 *
 * `uuid` is used as the SDK's idempotency key — INSERT OR IGNORE on the
 * UNIQUE(project_key, session_id, subpath, uuid) constraint silently drops
 * retries and importSessionToStore() replays. Entries without a uuid
 * (titles, tags, mode markers) are appended without dedup, per SDK contract.
 */

import type {
  SessionStore,
  SessionKey,
  SessionStoreEntry,
} from '@anthropic-ai/claude-agent-sdk';
import { getDatabase } from '@/app/db/connection';

const NO_SUBPATH = '';

let cachedStore: SessionStore | null = null;

export function getSqliteSessionStore(): SessionStore {
  if (cachedStore) return cachedStore;

  cachedStore = {
    async append(key: SessionKey, entries: SessionStoreEntry[]): Promise<void> {
      if (entries.length === 0) return;
      const db = getDatabase();

      const insertWithUuid = db.prepare(`
        INSERT OR IGNORE INTO cli_transcript_mirror
          (project_key, session_id, subpath, uuid, entry_type, payload, appended_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      const insertNoUuid = db.prepare(`
        INSERT INTO cli_transcript_mirror
          (project_key, session_id, subpath, uuid, entry_type, payload, appended_at)
        VALUES (?, ?, ?, NULL, ?, ?, datetime('now'))
      `);

      const subpath = key.subpath ?? NO_SUBPATH;

      const tx = db.transaction((batch: SessionStoreEntry[]) => {
        for (const entry of batch) {
          const payload = JSON.stringify(entry);
          if (typeof entry.uuid === 'string' && entry.uuid.length > 0) {
            insertWithUuid.run(
              key.projectKey,
              key.sessionId,
              subpath,
              entry.uuid,
              entry.type,
              payload
            );
          } else {
            insertNoUuid.run(
              key.projectKey,
              key.sessionId,
              subpath,
              entry.type,
              payload
            );
          }
        }
      });

      tx(entries);
    },

    async load(key: SessionKey): Promise<SessionStoreEntry[] | null> {
      const db = getDatabase();
      const rows = db
        .prepare(
          `SELECT payload FROM cli_transcript_mirror
           WHERE project_key = ? AND session_id = ? AND subpath = ?
           ORDER BY id ASC`
        )
        .all(key.projectKey, key.sessionId, key.subpath ?? NO_SUBPATH) as Array<{
        payload: string;
      }>;

      if (rows.length === 0) return null;
      return rows.map((r) => JSON.parse(r.payload) as SessionStoreEntry);
    },

    async listSessions(projectKey: string): Promise<Array<{ sessionId: string; mtime: number }>> {
      const db = getDatabase();
      const rows = db
        .prepare(
          `SELECT session_id, MAX(appended_at) AS last_seen
           FROM cli_transcript_mirror
           WHERE project_key = ? AND subpath = ''
           GROUP BY session_id`
        )
        .all(projectKey) as Array<{ session_id: string; last_seen: string }>;

      return rows.map((r) => ({
        sessionId: r.session_id,
        mtime: new Date(r.last_seen + 'Z').getTime(),
      }));
    },

    async listSubkeys(key: { projectKey: string; sessionId: string }): Promise<string[]> {
      const db = getDatabase();
      const rows = db
        .prepare(
          `SELECT DISTINCT subpath FROM cli_transcript_mirror
           WHERE project_key = ? AND session_id = ? AND subpath != ''`
        )
        .all(key.projectKey, key.sessionId) as Array<{ subpath: string }>;
      return rows.map((r) => r.subpath);
    },

    async delete(key: SessionKey): Promise<void> {
      const db = getDatabase();
      if (key.subpath != null) {
        db.prepare(
          `DELETE FROM cli_transcript_mirror
           WHERE project_key = ? AND session_id = ? AND subpath = ?`
        ).run(key.projectKey, key.sessionId, key.subpath);
      } else {
        db.prepare(
          `DELETE FROM cli_transcript_mirror
           WHERE project_key = ? AND session_id = ?`
        ).run(key.projectKey, key.sessionId);
      }
    },
  };

  return cachedStore;
}
