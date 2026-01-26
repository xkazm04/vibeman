/**
 * Migration 058: Annette Memory System - Persistent Memory & Knowledge Graph
 * Creates tables for:
 * - annette_memories: Stored memories with embeddings and consolidation
 * - annette_knowledge_nodes: Knowledge graph nodes (entities, concepts)
 * - annette_knowledge_edges: Knowledge graph relationships
 * - annette_memory_consolidations: Memory consolidation history
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate058AnnetteMemorySystem(db: Database.Database): void {
  // 1. Persistent memories with semantic indexing
  if (!tableExists(db, 'annette_memories')) {
    db.exec(`
      CREATE TABLE annette_memories (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        session_id TEXT,
        memory_type TEXT NOT NULL CHECK (memory_type IN (
          'conversation', 'decision', 'fact', 'preference', 'event', 'insight'
        )),
        content TEXT NOT NULL,
        summary TEXT,
        embedding TEXT,
        importance_score REAL DEFAULT 0.5,
        decay_factor REAL DEFAULT 1.0,
        access_count INTEGER DEFAULT 0,
        last_accessed_at TEXT,
        consolidated_into TEXT,
        source_message_ids TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES annette_sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (consolidated_into) REFERENCES annette_memories(id) ON DELETE SET NULL
      );

      CREATE INDEX idx_annette_memories_project ON annette_memories(project_id);
      CREATE INDEX idx_annette_memories_type ON annette_memories(memory_type);
      CREATE INDEX idx_annette_memories_importance ON annette_memories(importance_score DESC);
      CREATE INDEX idx_annette_memories_decay ON annette_memories(decay_factor);
      CREATE INDEX idx_annette_memories_accessed ON annette_memories(last_accessed_at DESC);
    `);
    console.log('[Migration 058] Created annette_memories table');
  }

  // 2. Knowledge graph nodes (entities, concepts, files, functions, etc.)
  if (!tableExists(db, 'annette_knowledge_nodes')) {
    db.exec(`
      CREATE TABLE annette_knowledge_nodes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        node_type TEXT NOT NULL CHECK (node_type IN (
          'entity', 'concept', 'file', 'function', 'component', 'api', 'decision', 'person', 'technology'
        )),
        name TEXT NOT NULL,
        description TEXT,
        properties TEXT,
        embedding TEXT,
        mention_count INTEGER DEFAULT 1,
        importance_score REAL DEFAULT 0.5,
        last_mentioned_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(project_id, node_type, name)
      );

      CREATE INDEX idx_annette_kn_project ON annette_knowledge_nodes(project_id);
      CREATE INDEX idx_annette_kn_type ON annette_knowledge_nodes(node_type);
      CREATE INDEX idx_annette_kn_name ON annette_knowledge_nodes(name);
      CREATE INDEX idx_annette_kn_importance ON annette_knowledge_nodes(importance_score DESC);
    `);
    console.log('[Migration 058] Created annette_knowledge_nodes table');
  }

  // 3. Knowledge graph edges (relationships between nodes)
  if (!tableExists(db, 'annette_knowledge_edges')) {
    db.exec(`
      CREATE TABLE annette_knowledge_edges (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_node_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        properties TEXT,
        evidence_count INTEGER DEFAULT 1,
        last_observed_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (source_node_id) REFERENCES annette_knowledge_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_node_id) REFERENCES annette_knowledge_nodes(id) ON DELETE CASCADE,
        UNIQUE(project_id, source_node_id, target_node_id, relationship_type)
      );

      CREATE INDEX idx_annette_ke_project ON annette_knowledge_edges(project_id);
      CREATE INDEX idx_annette_ke_source ON annette_knowledge_edges(source_node_id);
      CREATE INDEX idx_annette_ke_target ON annette_knowledge_edges(target_node_id);
      CREATE INDEX idx_annette_ke_type ON annette_knowledge_edges(relationship_type);
    `);
    console.log('[Migration 058] Created annette_knowledge_edges table');
  }

  // 4. Memory consolidation history
  if (!tableExists(db, 'annette_memory_consolidations')) {
    db.exec(`
      CREATE TABLE annette_memory_consolidations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_memory_ids TEXT NOT NULL,
        result_memory_id TEXT NOT NULL,
        consolidation_type TEXT NOT NULL CHECK (consolidation_type IN (
          'merge', 'summarize', 'compress', 'archive'
        )),
        tokens_before INTEGER,
        tokens_after INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (result_memory_id) REFERENCES annette_memories(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_annette_mc_project ON annette_memory_consolidations(project_id);
      CREATE INDEX idx_annette_mc_result ON annette_memory_consolidations(result_memory_id);
    `);
    console.log('[Migration 058] Created annette_memory_consolidations table');
  }

  console.log('[Migration 058] Annette Memory System migration complete');
}
