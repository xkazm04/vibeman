# Remote Message Broker Setup Guide

This guide explains how to set up the Supabase-based Remote Message Broker for third-party app integration with Vibeman.

## Overview

The Remote Message Broker enables external applications (mobile apps, CLI tools, IoT devices) to:
- **GET events**: Query app events via Supabase or REST API
- **POST commands**: Submit commands for Vibeman to execute

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  External App   │────▶│    Supabase      │◀────│     Vibeman      │
│  (Mobile/CLI)   │◀────│  Message Broker  │────▶│   (localhost)    │
└─────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │
        │   Events (query)       │   Events (publish)
        │   Commands (insert)    │   Commands (poll & execute)
        └────────────────────────┘
```

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Note your project credentials from **Settings → API**:
   - `Project URL` (e.g., `https://xxxx.supabase.co`)
   - `anon/public` key
   - `service_role` key (keep this secret!)

## Step 2: Run SQL Schema

Open **SQL Editor** in your Supabase Dashboard and run:

```sql
-- =============================================================================
-- Vibeman Remote Message Broker Schema
-- Version: 1.0.0
-- =============================================================================

-- Table 1: API Clients (registered third-party applications)
CREATE TABLE IF NOT EXISTS vibeman_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '["read_events"]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vibeman_clients_api_key ON vibeman_clients(api_key);
CREATE INDEX idx_vibeman_clients_active ON vibeman_clients(is_active) WHERE is_active = true;

-- Table 2: Events (outbound from Vibeman)
CREATE TABLE IF NOT EXISTS vibeman_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'vibeman',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vibeman_events_project ON vibeman_events(project_id);
CREATE INDEX idx_vibeman_events_type ON vibeman_events(event_type);
CREATE INDEX idx_vibeman_events_created ON vibeman_events(created_at DESC);
CREATE INDEX idx_vibeman_events_project_created ON vibeman_events(project_id, created_at DESC);

-- Table 3: Commands (inbound to Vibeman)
CREATE TABLE IF NOT EXISTS vibeman_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES vibeman_clients(id) ON DELETE SET NULL,
  project_id TEXT NOT NULL,
  command_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  result JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vibeman_commands_status ON vibeman_commands(status);
CREATE INDEX idx_vibeman_commands_project ON vibeman_commands(project_id);
CREATE INDEX idx_vibeman_commands_pending ON vibeman_commands(created_at) WHERE status = 'pending';

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE vibeman_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibeman_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibeman_commands ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_clients" ON vibeman_clients FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_events" ON vibeman_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_commands" ON vibeman_commands FOR ALL USING (auth.role() = 'service_role');

-- Anon can read events and insert commands (API key validation at app level)
CREATE POLICY "anon_read_events" ON vibeman_events FOR SELECT USING (true);
CREATE POLICY "anon_insert_commands" ON vibeman_commands FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_read_commands" ON vibeman_commands FOR SELECT USING (true);

-- =============================================================================
-- Realtime (for command notifications)
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE vibeman_commands;

-- =============================================================================
-- Cleanup Function (optional - for old events)
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_vibeman_events(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM vibeman_events
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Helper: Generate API Key
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
  RETURN 'vbm_' || encode(gen_random_bytes(24), 'base64');
END;
$$ LANGUAGE plpgsql;
```

## Step 3: Enable Realtime

1. Go to **Table Editor** in Supabase Dashboard
2. Select `vibeman_commands` table
3. Click the **Replication** tab
4. Enable realtime for the table

## Step 4: Configure Vibeman

### Option A: Via API

```bash
curl -X POST http://localhost:3000/api/remote/setup \
  -H "Content-Type: application/json" \
  -d '{
    "supabase_url": "https://YOUR_PROJECT.supabase.co",
    "supabase_anon_key": "eyJ...",
    "supabase_service_role_key": "eyJ..."
  }'
```

### Option B: Via Environment Variables

Add to `.env.local`:

```bash
REMOTE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
REMOTE_SUPABASE_ANON_KEY=eyJ...
REMOTE_SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Step 5: Create API Client

Create a client for your external app:

```bash
curl -X POST http://localhost:3000/api/remote/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Mobile App",
    "description": "Flutter app for remote control",
    "permissions": ["read_events", "write_commands"]
  }'
```

Response (save the API key - shown only once!):

```json
{
  "success": true,
  "client": {
    "id": "uuid-here",
    "api_key": "vbm_xxxxxxxxxxxx",
    "name": "My Mobile App",
    "permissions": ["read_events", "write_commands"]
  }
}
```

## API Reference

### Events

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/remote/events` | GET | Query events |

Query parameters:
- `project_id` - Filter by project
- `event_type` - Filter by type
- `since` - ISO timestamp
- `until` - ISO timestamp
- `limit` - Max results (default 100, max 1000)
- `offset` - Pagination offset

### Commands

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/remote/commands` | GET | List commands |
| `/api/remote/commands` | POST | Submit command |
| `/api/remote/commands/:id` | GET | Get command status |
| `/api/remote/commands/:id` | DELETE | Cancel pending command |

Submit command:

```bash
curl -X POST http://localhost:3000/api/remote/commands \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "my-project",
    "command_type": "accept_idea",
    "payload": { "ideaId": "idea-123" },
    "api_key": "vbm_xxxxxxxxxxxx"
  }'
```

### Command Types

| Command | Payload | Description |
|---------|---------|-------------|
| `create_goal` | `{ name, projectId, description?, contextId? }` | Create a new goal |
| `update_goal` | `{ goalId, name?, description?, status? }` | Update goal |
| `delete_goal` | `{ goalId }` | Delete goal |
| `accept_idea` | `{ ideaId }` | Accept an idea |
| `reject_idea` | `{ ideaId }` | Reject an idea |
| `skip_idea` | `{ ideaId }` | Skip an idea |
| `start_batch` | `{ batchId }` | Start batch execution |
| `pause_batch` | `{ batchId }` | Pause batch |
| `resume_batch` | `{ batchId }` | Resume batch |
| `stop_batch` | `{ batchId }` | Stop batch |
| `trigger_scan` | `{ projectId, scanTypes[], contextIds[]? }` | Trigger scan |

### Event Types

| Event | Description |
|-------|-------------|
| `idea_generated` | New idea created |
| `idea_accepted` | Idea was accepted |
| `idea_rejected` | Idea was rejected |
| `goal_created` | New goal created |
| `goal_completed` | Goal marked complete |
| `task_started` | Task execution started |
| `task_completed` | Task finished successfully |
| `task_failed` | Task execution failed |
| `batch_progress` | Batch progress update |
| `scan_completed` | Scan finished |

### Clients

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/remote/clients` | GET | List clients |
| `/api/remote/clients` | POST | Create client |
| `/api/remote/clients/:id` | GET | Get client |
| `/api/remote/clients/:id` | PUT | Update client |
| `/api/remote/clients/:id` | DELETE | Delete client |

### Setup

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/remote/setup` | POST | Configure Supabase |
| `/api/remote/setup` | DELETE | Remove configuration |
| `/api/remote/setup/status` | GET | Check connection status |

## Direct Supabase Access

External apps can also query Supabase directly:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'your-anon-key'
);

// Query recent events
const { data: events } = await supabase
  .from('vibeman_events')
  .select('*')
  .eq('project_id', 'my-project')
  .order('created_at', { ascending: false })
  .limit(50);

// Subscribe to command status changes
supabase
  .channel('commands')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'vibeman_commands',
    filter: `client_id=eq.${myClientId}`
  }, (payload) => {
    console.log('Command updated:', payload.new);
  })
  .subscribe();
```

## Permissions

| Permission | Description |
|------------|-------------|
| `read_events` | Can query events |
| `write_commands` | Can submit commands |
| `admin` | Full access |

## Troubleshooting

### "Remote not configured"
Run the setup API or set environment variables.

### "Missing required tables"
Run the SQL schema in Supabase SQL Editor.

### "Invalid API key"
Check that the client exists and is active.

### Events not appearing
Verify Vibeman is configured and the event publisher is initialized.
