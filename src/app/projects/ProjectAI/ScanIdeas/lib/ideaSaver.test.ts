/**
 * Save-time dedup + age-based archival tests.
 *
 * Exercises createScanAndSaveIdeas and ideaRepository.archiveStalePendingIdeas
 * against an isolated in-memory database (via __setTestDatabase).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { __setTestDatabase } from '@/app/db/connection';
import {
  ideaRepository,
  STALE_ARCHIVE_FEEDBACK,
} from '@/app/db/repositories/idea.repository';
import { createScanAndSaveIdeas } from './ideaSaver';
import type { GeneratedIdea } from '../generateIdeas';

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE scans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_type TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      summary TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      provider TEXT,
      model TEXT,
      context_id TEXT,
      content_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE ideas (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      context_id TEXT,
      scan_type TEXT DEFAULT 'overall',
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      reasoning TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      user_feedback TEXT,
      user_pattern INTEGER DEFAULT 0,
      effort INTEGER,
      impact INTEGER,
      risk INTEGER,
      requirement_id TEXT,
      goal_id TEXT,
      provider TEXT,
      model TEXT,
      detailed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      implemented_at TEXT
    );
  `);
}

const PROJECT = 'proj-1';
const CTX = 'ctx-1';

function idea(title: string, extra: Partial<GeneratedIdea> = {}): GeneratedIdea {
  return { title, category: 'general', ...extra };
}

function saveBatch(parsedIdeas: GeneratedIdea[]) {
  return createScanAndSaveIdeas({
    parsedIdeas,
    projectId: PROJECT,
    projectName: 'Proj',
    contextId: CTX,
    context: { name: 'Ctx' },
    effectiveScanType: 'zen_architect' as never,
    actualProvider: 'anthropic',
    validGoalIds: new Set<string>(),
    detailed: false,
  });
}

describe('ideaSaver — save-time dedup', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    createSchema(db);
    __setTestDatabase(db);
  });

  afterEach(() => {
    __setTestDatabase(null);
    db.close();
  });

  it('saves all novel ideas on a first scan', () => {
    const res = saveBatch([idea('Add a caching layer'), idea('Improve error handling')]);
    expect(res.savedIdeas).toHaveLength(2);
    expect(res.skippedDuplicates).toBe(0);
    expect(ideaRepository.getIdeasByContext(CTX)).toHaveLength(2);
  });

  it('does not accrete near-identical rows when the same context is re-scanned', () => {
    saveBatch([idea('Add a caching layer'), idea('Improve error handling')]);

    // Re-scan surfaces one near-duplicate ("Add caching layer" ≈ "Add a caching
    // layer") and one genuinely new idea.
    const res = saveBatch([idea('Add caching layer'), idea('Add rate limiting to uploads')]);

    expect(res.skippedDuplicates).toBe(1);
    expect(res.savedIdeas).toHaveLength(1);
    expect(res.savedIdeas[0].title).toBe('Add rate limiting to uploads');

    // Total is 3 (2 original + 1 new), NOT 4 — the duplicate never landed.
    expect(ideaRepository.getIdeasByContext(CTX)).toHaveLength(3);
  });

  it('dedups duplicates that appear within a single batch', () => {
    const res = saveBatch([idea('Add caching'), idea('Add caching!')]);
    expect(res.savedIdeas).toHaveLength(1);
    expect(res.skippedDuplicates).toBe(1);
  });
});

describe('ideaRepository — archiveStalePendingIdeas', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    createSchema(db);
    __setTestDatabase(db);
  });

  afterEach(() => {
    __setTestDatabase(null);
    db.close();
  });

  function insertIdea(id: string, status: string, updatedAt: string) {
    db.prepare(
      `INSERT INTO ideas (id, scan_id, project_id, context_id, scan_type, category, title, status, created_at, updated_at)
       VALUES (?, 's1', ?, ?, 'zen_architect', 'general', ?, ?, ?, ?)`
    ).run(id, PROJECT, CTX, `Idea ${id}`, status, updatedAt, updatedAt);
  }

  it('archives pending ideas older than the age threshold, leaving fresh ones', () => {
    insertIdea('old', 'pending', new Date(Date.now() - 90 * 86400000).toISOString());
    insertIdea('fresh', 'pending', new Date().toISOString());

    const archived = ideaRepository.archiveStalePendingIdeas(PROJECT, 30, CTX);
    expect(archived).toBe(1);

    const old = ideaRepository.getIdeaById('old')!;
    const fresh = ideaRepository.getIdeaById('fresh')!;
    expect(old.status).toBe('rejected');
    expect(old.user_feedback).toBe(STALE_ARCHIVE_FEEDBACK);
    expect(fresh.status).toBe('pending');
  });

  it('is reversible — an archived idea can return to pending', () => {
    insertIdea('old', 'pending', new Date(Date.now() - 90 * 86400000).toISOString());
    ideaRepository.archiveStalePendingIdeas(PROJECT, 30, CTX);

    const reopened = ideaRepository.updateIdea('old', { status: 'pending' });
    expect(reopened?.status).toBe('pending');
  });

  it('never touches accepted/implemented ideas', () => {
    insertIdea('acc', 'accepted', new Date(Date.now() - 90 * 86400000).toISOString());
    const archived = ideaRepository.archiveStalePendingIdeas(PROJECT, 30, CTX);
    expect(archived).toBe(0);
    expect(ideaRepository.getIdeaById('acc')!.status).toBe('accepted');
  });

  it('falls back to the default age for a non-positive threshold (does not nuke the backlog)', () => {
    insertIdea('recent', 'pending', new Date().toISOString());
    const archived = ideaRepository.archiveStalePendingIdeas(PROJECT, 0, CTX);
    expect(archived).toBe(0);
    expect(ideaRepository.getIdeaById('recent')!.status).toBe('pending');
  });
});
