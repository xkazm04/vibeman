-- Flow Events Table
-- This table stores workflow/automation events for realtime monitoring

CREATE TABLE flow_events (
  id BIGSERIAL PRIMARY KEY,
  flow_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  flow_name TEXT NOT NULL,
  trigger_type TEXT,
  status TEXT NOT NULL,
  step TEXT,
  parameters JSONB DEFAULT '{}',
  input_data JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_flow_events_flow_id ON flow_events(flow_id);
CREATE INDEX idx_flow_events_session_id ON flow_events(session_id);
CREATE INDEX idx_flow_events_timestamp ON flow_events(timestamp DESC);
CREATE INDEX idx_flow_events_status ON flow_events(status);

-- Enable RLS (Row Level Security) if needed
-- ALTER TABLE flow_events ENABLE ROW LEVEL SECURITY;

-- Enable realtime for this table
-- This allows Supabase to send realtime updates
-- Run this in the Supabase dashboard or via SQL editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE flow_events;

-- Sample data for testing
INSERT INTO flow_events (
  flow_id, 
  session_id, 
  flow_name, 
  trigger_type, 
  status, 
  step, 
  parameters, 
  input_data, 
  result,
  duration_ms
) VALUES 
(
  'sample-flow-1',
  'session-123',
  'Data Processing Flow',
  'scheduled',
  'completed',
  'data-validation',
  '{"batch_size": 100, "timeout": 30}',
  '{"file_path": "/data/input.csv", "rows": 1000}',
  '{"processed_rows": 1000, "errors": 0}',
  1500
),
(
  'sample-flow-2',
  'session-123',
  'Email Notification Flow',
  'manual',
  'failed',
  'send-email',
  '{"retry_count": 3}',
  '{"recipients": ["user@example.com"], "template": "welcome"}',
  '{"error": "SMTP connection failed"}',
  500
); 