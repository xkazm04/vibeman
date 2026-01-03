-- ============================================================================
-- Supabase Realtime Migration for Cross-Device Zen Mode
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Device Sessions Table
-- Tracks online devices and their pairing state
-- ============================================================================
CREATE TABLE IF NOT EXISTS device_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    project_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('active', 'passive', 'observer')),
    pairing_code TEXT,
    partner_device_id TEXT,
    is_online BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    capabilities JSONB DEFAULT '{"canExecute": true, "hasClaudeCode": true}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for device_sessions
CREATE INDEX IF NOT EXISTS idx_device_sessions_project
    ON device_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_pairing_code
    ON device_sessions(pairing_code)
    WHERE pairing_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id
    ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_online
    ON device_sessions(is_online)
    WHERE is_online = TRUE;

-- Enable Realtime for presence tracking
ALTER TABLE device_sessions REPLICA IDENTITY FULL;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS device_sessions_updated ON device_sessions;
CREATE TRIGGER device_sessions_updated
    BEFORE UPDATE ON device_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_device_session_timestamp();


-- 2. Bridge Events Table
-- Persistent event log for external app queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS bridge_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    device_id TEXT,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bridge_events
CREATE INDEX IF NOT EXISTS idx_bridge_events_project_time
    ON bridge_events(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bridge_events_type
    ON bridge_events(event_type);
CREATE INDEX IF NOT EXISTS idx_bridge_events_device
    ON bridge_events(device_id)
    WHERE device_id IS NOT NULL;

-- Enable Realtime for live event streaming
ALTER TABLE bridge_events REPLICA IDENTITY FULL;


-- 3. Offload Tasks Table
-- Cross-device task queue
-- ============================================================================
CREATE TABLE IF NOT EXISTS offload_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    source_device_id TEXT NOT NULL,
    target_device_id TEXT,
    requirement_name TEXT NOT NULL,
    requirement_content TEXT NOT NULL,
    context_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'claimed', 'running', 'completed', 'failed', 'cancelled')),
    priority INTEGER NOT NULL DEFAULT 5,
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    result_summary TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for offload_tasks
CREATE INDEX IF NOT EXISTS idx_offload_tasks_project
    ON offload_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_offload_tasks_status
    ON offload_tasks(status);
CREATE INDEX IF NOT EXISTS idx_offload_tasks_source
    ON offload_tasks(source_device_id);
CREATE INDEX IF NOT EXISTS idx_offload_tasks_target
    ON offload_tasks(target_device_id)
    WHERE target_device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offload_tasks_priority
    ON offload_tasks(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_offload_tasks_pending
    ON offload_tasks(project_id, created_at)
    WHERE status = 'pending';

-- Enable Realtime for task updates
ALTER TABLE offload_tasks REPLICA IDENTITY FULL;

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS offload_tasks_updated ON offload_tasks;
CREATE TRIGGER offload_tasks_updated
    BEFORE UPDATE ON offload_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_device_session_timestamp();


-- 4. Row Level Security (RLS)
-- Permissive for now - will tighten with auth later
-- ============================================================================
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE offload_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for anon access (adjust for production)
DROP POLICY IF EXISTS "Allow all device_sessions" ON device_sessions;
CREATE POLICY "Allow all device_sessions"
    ON device_sessions FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow all bridge_events" ON bridge_events;
CREATE POLICY "Allow all bridge_events"
    ON bridge_events FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow all offload_tasks" ON offload_tasks;
CREATE POLICY "Allow all offload_tasks"
    ON offload_tasks FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);


-- 5. Enable Realtime in Supabase Dashboard
-- ============================================================================
-- After running this SQL, go to:
-- Supabase Dashboard > Database > Replication
-- Enable the following tables for realtime:
-- - device_sessions
-- - bridge_events
-- - offload_tasks
-- ============================================================================


-- 6. Cleanup Function for Stale Sessions
-- Run periodically to clean up offline devices
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_stale_device_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark sessions as offline if not seen in 5 minutes
    UPDATE device_sessions
    SET is_online = FALSE
    WHERE is_online = TRUE
      AND last_seen_at < NOW() - INTERVAL '5 minutes';

    -- Delete sessions offline for more than 1 hour
    DELETE FROM device_sessions
    WHERE is_online = FALSE
      AND last_seen_at < NOW() - INTERVAL '1 hour';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Can be called via: SELECT cleanup_stale_device_sessions();
-- Or scheduled via pg_cron extension


-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after migration to verify tables were created
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   AND table_name IN ('device_sessions', 'bridge_events', 'offload_tasks');
--
-- SELECT * FROM device_sessions LIMIT 1;
-- SELECT * FROM bridge_events LIMIT 1;
-- SELECT * FROM offload_tasks LIMIT 1;
