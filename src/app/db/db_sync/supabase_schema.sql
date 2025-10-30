-- Vibeman Supabase Schema Migration
-- This script creates all tables from the SQLite schema in Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor to set up the cloud database

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================
-- Projects Table
-- ======================
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  port INTEGER NOT NULL UNIQUE,
  type TEXT DEFAULT 'other',
  related_project_id TEXT,
  git_repository TEXT,
  git_branch TEXT DEFAULT 'main',
  run_script TEXT DEFAULT 'npm run dev',
  allow_multiple_instances INTEGER DEFAULT 0,
  base_port INTEGER,
  instance_of TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (related_project_id) REFERENCES projects(id)
);

-- ======================
-- Context Groups Table
-- ======================
CREATE TABLE IF NOT EXISTS context_groups (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ======================
-- Contexts Table
-- ======================
CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  group_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  file_paths TEXT NOT NULL, -- JSON string of file paths array
  has_context_file INTEGER DEFAULT 0,
  context_file_path TEXT,
  preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (group_id) REFERENCES context_groups(id) ON DELETE SET NULL
);

-- ======================
-- Goals Table
-- ======================
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  context_id TEXT,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'done', 'rejected', 'undecided')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
);

-- ======================
-- Events Table
-- ======================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'proposal_accepted', 'proposal_rejected')),
  agent TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ======================
-- Scans Table
-- ======================
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scan_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  summary TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ======================
-- Ideas Table
-- ======================
CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  context_id TEXT,
  scan_type TEXT DEFAULT 'overall',
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'implemented')),
  user_feedback TEXT,
  user_pattern INTEGER DEFAULT 0,
  effort INTEGER CHECK (effort IS NULL OR (effort >= 1 AND effort <= 3)),
  impact INTEGER CHECK (impact IS NULL OR (impact >= 1 AND impact <= 3)),
  implemented_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
  FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
);

-- ======================
-- Backlog Items Table
-- ======================
CREATE TABLE IF NOT EXISTS backlog_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  goal_id TEXT,
  agent TEXT NOT NULL CHECK (agent IN ('developer', 'mastermind', 'tester', 'artist', 'custom')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress')),
  type TEXT NOT NULL CHECK (type IN ('proposal', 'custom')),
  impacted_files TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
);

-- ======================
-- Implementation Log Table
-- ======================
CREATE TABLE IF NOT EXISTS implementation_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  requirement_name TEXT NOT NULL,
  title TEXT NOT NULL,
  overview TEXT NOT NULL,
  tested INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ======================
-- Indexes for Performance
-- ======================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
CREATE INDEX IF NOT EXISTS idx_projects_port ON projects(port);
CREATE INDEX IF NOT EXISTS idx_projects_instance_of ON projects(instance_of);

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
CREATE INDEX IF NOT EXISTS idx_goals_order_index ON goals(project_id, order_index);

-- Backlog items indexes
CREATE INDEX IF NOT EXISTS idx_backlog_items_project_id ON backlog_items(project_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_goal_id ON backlog_items(goal_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON backlog_items(project_id, status);

-- Context groups indexes
CREATE INDEX IF NOT EXISTS idx_context_groups_project_id ON context_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_context_groups_position ON context_groups(project_id, position);

-- Contexts indexes
CREATE INDEX IF NOT EXISTS idx_contexts_project_id ON contexts(project_id);
CREATE INDEX IF NOT EXISTS idx_contexts_group_id ON contexts(group_id);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(project_id, type);

-- Scans indexes
CREATE INDEX IF NOT EXISTS idx_scans_project_id ON scans(project_id);
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(project_id, timestamp);

-- Ideas indexes
CREATE INDEX IF NOT EXISTS idx_ideas_scan_id ON ideas(scan_id);
CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id);
CREATE INDEX IF NOT EXISTS idx_ideas_context_id ON ideas(context_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(project_id, status);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);

-- Implementation log indexes
CREATE INDEX IF NOT EXISTS idx_implementation_log_project_id ON implementation_log(project_id);
CREATE INDEX IF NOT EXISTS idx_implementation_log_created_at ON implementation_log(project_id, created_at);

-- ======================
-- Row Level Security (RLS)
-- ======================
-- Note: Enable RLS if you want to add authentication and multi-user support
-- For now, we'll leave RLS disabled for simplicity

-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- etc.

-- ======================
-- Sync Metadata Table
-- ======================
-- Tracks when the last sync occurred for each table
CREATE TABLE IF NOT EXISTS sync_metadata (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL UNIQUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  record_count INTEGER DEFAULT 0,
  sync_status TEXT CHECK (sync_status IN ('success', 'failed', 'in_progress')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
