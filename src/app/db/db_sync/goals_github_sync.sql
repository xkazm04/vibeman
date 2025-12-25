-- ==============================================
-- Goals GitHub Sync Migration for Supabase
-- ==============================================
-- Run this AFTER goals_extended_migration.sql
-- Adds GitHub Project integration fields
-- ==============================================

-- Add GitHub item ID column for tracking linked GitHub Project items
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS github_item_id TEXT;

-- Index for querying goals by their GitHub item ID
CREATE INDEX IF NOT EXISTS idx_goals_github_item_id ON goals(github_item_id);
