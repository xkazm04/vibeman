-- ==============================================
-- Goals Table Schema for Supabase
-- ==============================================
-- Run this in Supabase SQL Editor to create the goals table
-- This creates the full table with all extended Goal Hub columns
-- ==============================================

-- Drop existing table if needed (uncomment if you want to recreate)
-- DROP TABLE IF EXISTS goals;

-- Goals table with all columns
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    context_id TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'done', 'rejected', 'undecided')),
    -- Extended Goal Hub columns for progress tracking
    progress INTEGER DEFAULT 0,
    hypotheses_total INTEGER DEFAULT 0,
    hypotheses_verified INTEGER DEFAULT 0,
    target_date TEXT,
    started_at TEXT,
    completed_at TEXT,
    -- GitHub sync integration
    github_item_id TEXT,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_goals_project_id ON goals(project_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_updated_at ON goals(updated_at);
CREATE INDEX IF NOT EXISTS idx_goals_order_index ON goals(project_id, order_index);

-- ==============================================
-- Optional: Enable Row Level Security (RLS)
-- ==============================================
-- Uncomment if you want to add multi-tenant security
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- Optional: Add to sync_metadata tracking
-- ==============================================
-- INSERT INTO sync_metadata (table_name, sync_status)
-- VALUES ('goals', 'pending')
-- ON CONFLICT (table_name) DO NOTHING;
