/**
 * @route /api/backlinks
 * GET - Aggregate reverse FK references for a given entity
 *
 * Query params:
 *   entity_type: 'context' | 'goal' | 'idea' | 'knowledge_entry'
 *   entity_id:   UUID of the entity
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';
import { withObservability } from '@/lib/observability/middleware';

export interface BacklinkItem {
  entity_type: 'idea' | 'goal' | 'context' | 'knowledge_entry';
  entity_id: string;
  title: string;
  status: string | null;
  relationship: string; // e.g. "references this context", "blocks this idea"
}

const VALID_ENTITY_TYPES = ['context', 'goal', 'idea', 'knowledge_entry'] as const;
type EntityType = (typeof VALID_ENTITY_TYPES)[number];

function getBacklinksForContext(db: ReturnType<typeof getDatabase>, entityId: string): BacklinkItem[] {
  const ideas = db.prepare(`
    SELECT id, title, status FROM ideas WHERE context_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(entityId) as Array<{ id: string; title: string; status: string }>;

  const goals = db.prepare(`
    SELECT id, title, status FROM goals WHERE context_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(entityId) as Array<{ id: string; title: string; status: string }>;

  return [
    ...goals.map(g => ({
      entity_type: 'goal' as const,
      entity_id: g.id,
      title: g.title,
      status: g.status,
      relationship: 'scoped to this context',
    })),
    ...ideas.map(i => ({
      entity_type: 'idea' as const,
      entity_id: i.id,
      title: i.title,
      status: i.status,
      relationship: 'assigned to this context',
    })),
  ];
}

function getBacklinksForGoal(db: ReturnType<typeof getDatabase>, entityId: string): BacklinkItem[] {
  const ideas = db.prepare(`
    SELECT id, title, status FROM ideas WHERE goal_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(entityId) as Array<{ id: string; title: string; status: string }>;

  // Check if goal is linked to a context
  const goal = db.prepare(`
    SELECT context_id FROM goals WHERE id = ?
  `).get(entityId) as { context_id: string | null } | undefined;

  const backlinks: BacklinkItem[] = ideas.map(i => ({
    entity_type: 'idea' as const,
    entity_id: i.id,
    title: i.title,
    status: i.status,
    relationship: 'targets this goal',
  }));

  if (goal?.context_id) {
    const ctx = db.prepare(`
      SELECT id, name FROM contexts WHERE id = ?
    `).get(goal.context_id) as { id: string; name: string } | undefined;
    if (ctx) {
      backlinks.push({
        entity_type: 'context',
        entity_id: ctx.id,
        title: ctx.name,
        status: null,
        relationship: 'linked context',
      });
    }
  }

  return backlinks;
}

function getBacklinksForIdea(db: ReturnType<typeof getDatabase>, entityId: string): BacklinkItem[] {
  const backlinks: BacklinkItem[] = [];

  // Ideas that depend on this idea (incoming dependencies)
  const deps = db.prepare(`
    SELECT d.relationship_type, d.source_id, i.title, i.status
    FROM idea_dependencies d
    JOIN ideas i ON i.id = d.source_id
    WHERE d.target_id = ?
    ORDER BY d.created_at DESC LIMIT 30
  `).all(entityId) as Array<{ relationship_type: string; source_id: string; title: string; status: string }>;

  for (const dep of deps) {
    backlinks.push({
      entity_type: 'idea',
      entity_id: dep.source_id,
      title: dep.title,
      status: dep.status,
      relationship: dep.relationship_type === 'blocks' ? 'blocked by this idea'
        : dep.relationship_type === 'enables' ? 'enabled by this idea'
        : 'conflicts with this idea',
    });
  }

  // Parent context and goal for this idea
  const idea = db.prepare(`
    SELECT context_id, goal_id FROM ideas WHERE id = ?
  `).get(entityId) as { context_id: string | null; goal_id: string | null } | undefined;

  if (idea?.context_id) {
    const ctx = db.prepare(`SELECT id, name FROM contexts WHERE id = ?`).get(idea.context_id) as { id: string; name: string } | undefined;
    if (ctx) {
      backlinks.push({
        entity_type: 'context',
        entity_id: ctx.id,
        title: ctx.name,
        status: null,
        relationship: 'parent context',
      });
    }
  }

  if (idea?.goal_id) {
    const goal = db.prepare(`SELECT id, title, status FROM goals WHERE id = ?`).get(idea.goal_id) as { id: string; title: string; status: string } | undefined;
    if (goal) {
      backlinks.push({
        entity_type: 'goal',
        entity_id: goal.id,
        title: goal.title,
        status: goal.status,
        relationship: 'parent goal',
      });
    }
  }

  return backlinks;
}

function getBacklinksForKnowledgeEntry(db: ReturnType<typeof getDatabase>, entityId: string): BacklinkItem[] {
  const backlinks: BacklinkItem[] = [];

  // Hub entries that link TO this entry (this entry appears as a linked child)
  const hubParents = db.prepare(`
    SELECT ke.id, ke.title, ke.status, l.note
    FROM kb_entry_links l
    JOIN knowledge_entries ke ON ke.id = l.hub_entry_id
    WHERE l.linked_entry_id = ?
    ORDER BY l.created_at DESC LIMIT 30
  `).all(entityId) as Array<{ id: string; title: string; status: string; note: string | null }>;

  for (const h of hubParents) {
    backlinks.push({
      entity_type: 'knowledge_entry',
      entity_id: h.id,
      title: h.title,
      status: h.status,
      relationship: h.note ? `hub: ${h.note}` : 'included in hub',
    });
  }

  // Entries linked FROM this entry if it is a hub
  const hubChildren = db.prepare(`
    SELECT ke.id, ke.title, ke.status, l.note
    FROM kb_entry_links l
    JOIN knowledge_entries ke ON ke.id = l.linked_entry_id
    WHERE l.hub_entry_id = ?
    ORDER BY l.sort_order ASC, l.created_at DESC LIMIT 50
  `).all(entityId) as Array<{ id: string; title: string; status: string; note: string | null }>;

  for (const c of hubChildren) {
    backlinks.push({
      entity_type: 'knowledge_entry',
      entity_id: c.id,
      title: c.title,
      status: c.status,
      relationship: c.note ? `linked: ${c.note}` : 'linked from this hub',
    });
  }

  return backlinks;
}

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entity_type') as EntityType | null;
  const entityId = searchParams.get('entity_id');

  if (!entityType || !VALID_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json(
      { success: false, error: 'entity_type must be one of: context, goal, idea, knowledge_entry' },
      { status: 400 }
    );
  }

  if (!entityId) {
    return NextResponse.json(
      { success: false, error: 'entity_id is required' },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();
    let backlinks: BacklinkItem[];

    switch (entityType) {
      case 'context':
        backlinks = getBacklinksForContext(db, entityId);
        break;
      case 'goal':
        backlinks = getBacklinksForGoal(db, entityId);
        break;
      case 'idea':
        backlinks = getBacklinksForIdea(db, entityId);
        break;
      case 'knowledge_entry':
        backlinks = getBacklinksForKnowledgeEntry(db, entityId);
        break;
    }

    return NextResponse.json({ success: true, backlinks });
  } catch (error) {
    console.error('[API] Backlinks GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch backlinks' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/backlinks');
