-- ============================================================================
-- Vibeman External Requirements Schema
-- Run this in Supabase SQL Editor to create the required tables.
-- 3rd-party apps use SUPABASE_POOLER_URL to INSERT into vibeman_requirements.
-- Vibeman reads/writes via Supabase JS REST client.
-- ============================================================================

-- Projects table: Vibeman syncs its local projects here so 3rd-party apps
-- can discover available project_id/project_name values.
CREATE TABLE IF NOT EXISTS vibeman_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_path TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_vp_device ON vibeman_projects(device_id);

-- Requirements table: 3rd-party apps INSERT proposals here.
-- Vibeman polls for status='open' rows and processes them automatically.
CREATE TABLE IF NOT EXISTS vibeman_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  device_id TEXT,                                 -- target device (NULL = any device can claim)
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,                                 -- why this requirement matters
  category TEXT DEFAULT 'feature',                -- feature, bugfix, refactor, test, docs
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  effort INTEGER CHECK (effort BETWEEN 1 AND 10),
  impact INTEGER CHECK (impact BETWEEN 1 AND 10),
  risk INTEGER CHECK (risk BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'claimed', 'in_progress', 'implemented', 'discarded', 'failed')),
  source_app TEXT NOT NULL DEFAULT 'unknown',     -- which 3rd-party app created this
  source_ref TEXT,                                -- external reference ID or URL
  context_hints TEXT,                             -- JSON: suggested context names or file paths
  metadata JSONB DEFAULT '{}',                    -- extensible key-value metadata
  claimed_by TEXT,                                -- device_id that claimed this requirement
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  implementation_log_id TEXT,                     -- links back to Vibeman's implementation_log
  error_message TEXT,                             -- populated when status = 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vr_project_status ON vibeman_requirements(project_id, status);
CREATE INDEX IF NOT EXISTS idx_vr_device ON vibeman_requirements(device_id, status);
CREATE INDEX IF NOT EXISTS idx_vr_priority ON vibeman_requirements(priority DESC);

-- ============================================================================
-- Example: 3rd-party app inserts a requirement
-- ============================================================================
-- INSERT INTO vibeman_requirements (project_id, title, description, category, priority, source_app)
-- VALUES (
--   'my-project-id',
--   'Add dark mode toggle',
--   'Implement a dark/light mode toggle in the settings page. Should persist preference in localStorage.',
--   'feature',
--   8,
--   'mobile-app'
-- );
