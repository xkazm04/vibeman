# Butler-Vibeman Remote Integration Guide

## Prerequisites

- **Vibeman** running on desktop (Next.js at localhost:3000)
- **Butler** installed on mobile device (Flutter app)
- **Supabase** project with anon key

---

## Step 1: Supabase Setup

Open **SQL Editor** in your Supabase Dashboard and run this complete schema:

```sql
-- =============================================================================
-- Vibeman Remote Message Broker Schema
-- =============================================================================

-- Table 1: API Clients (registered applications)
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

-- Table 2: Events (outbound from Vibeman to Butler)
CREATE TABLE IF NOT EXISTS vibeman_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'vibeman',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Commands (inbound from Butler to Vibeman)
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  target_device_id TEXT  -- For mesh network routing (null = any device)
);

-- Table 4: Devices (mesh network presence)
CREATE TABLE IF NOT EXISTS vibeman_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT DEFAULT 'desktop',
  hostname TEXT,
  capabilities JSONB DEFAULT '{"can_execute": true, "session_slots": 4}'::jsonb,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'busy', 'idle')),
  active_sessions INTEGER DEFAULT 0,
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vibeman_clients_api_key ON vibeman_clients(api_key);
CREATE INDEX IF NOT EXISTS idx_vibeman_events_project ON vibeman_events(project_id);
CREATE INDEX IF NOT EXISTS idx_vibeman_events_created ON vibeman_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vibeman_commands_status ON vibeman_commands(status);
CREATE INDEX IF NOT EXISTS idx_vibeman_commands_pending ON vibeman_commands(created_at) WHERE status = 'pending';

-- =============================================================================
-- Row Level Security (REQUIRED for service role access)
-- =============================================================================

ALTER TABLE vibeman_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibeman_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibeman_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibeman_devices ENABLE ROW LEVEL SECURITY;

-- Service role full access (Vibeman server-side)
CREATE POLICY "service_role_clients" ON vibeman_clients FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_events" ON vibeman_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_commands" ON vibeman_commands FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_devices" ON vibeman_devices FOR ALL USING (auth.role() = 'service_role');

-- Anon access (Butler mobile app and Emulator mode)
CREATE POLICY "anon_read_events" ON vibeman_events FOR SELECT USING (true);
CREATE POLICY "anon_insert_commands" ON vibeman_commands FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_read_commands" ON vibeman_commands FOR SELECT USING (true);
CREATE POLICY "anon_read_devices" ON vibeman_devices FOR SELECT USING (true);

-- =============================================================================
-- Enable Realtime
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE vibeman_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE vibeman_events;
ALTER PUBLICATION supabase_realtime ADD TABLE vibeman_devices;
```

**Important:** Make sure ALL the SQL runs successfully. The RLS policies are required for the service role key to work properly.

---

## Step 2: Configure Vibeman

1. Open Vibeman → navigate to `/zen` page
2. Switch to **Online** mode using the toggle
3. Expand the **Multi-Device Sync Setup** panel
4. Enter Supabase credentials:
   - Project URL: `https://your-project.supabase.co`
   - Anon Key: `your-anon-key`
   - Service Role Key: for table validation (required)
5. Click **Test Connection** → should show "Connection successful! All required tables found."
6. Configuration is saved automatically on successful test

---

## Step 3: Configure Butler

1. Open Butler → **Settings** (gear icon)
2. Navigate to **Supabase Configuration**
3. Enter same credentials as Vibeman
4. Connection indicator should turn green (live)
5. Select your project from the dropdown

---

## Emulator Mode (Butler Replacement)

The Emulator mode allows any Vibeman instance to act as a controller for other Vibeman instances in the mesh network. This provides Butler-like functionality directly in the browser.

### Using Emulator Mode

1. Open Vibeman → navigate to `/zen` page
2. Configure Supabase in **Online** mode (if not done)
3. Switch to **Emulator** mode
4. Click **Connect** to join the mesh network
5. Other online Vibeman instances will appear in the device grid
6. Select a target device to send commands

### Mesh Network Architecture

- Each Vibeman instance registers itself with a unique device ID
- Heartbeats are sent every 30 seconds to indicate online status
- Devices are marked offline if no heartbeat for 2 minutes
- Commands can be targeted to specific devices or broadcast (any device processes)

### Multi-PC Workflow

1. **PC 1**: Run Vibeman, go to `/zen` → Emulator mode → Connect
2. **PC 2**: Run Vibeman, go to `/zen` → Emulator mode → Connect
3. Both PCs will see each other in the device grid
4. Select a target device and send commands
5. Commands execute on the target PC

---

## Testing Checklist

### Phase 1: Connection

| Test | Steps | Expected |
|------|-------|----------|
| Vibeman connection | Click "Test Connection" in Zen → Multi-Device Sync Setup | Success message |
| Butler connection | Check status indicator | Green/live indicator |
| Project selection | Tap project dropdown in Butler | List of projects appears |

### Phase 2: Sync & Triage

| Test | Steps | Expected |
|------|-------|----------|
| Sync directions | In Vibeman, click "Sync Directions" | Directions appear in Supabase |
| View in Butler | Open Direction Tinder module | Swipeable cards with direction info |
| Accept direction | Swipe right on a card | Card animates right, status updates |
| Reject direction | Swipe left on a card | Card animates left, status updates |
| Skip direction | Swipe down on a card | Card dismissed, remains pending |
| Decision sync | Wait ~60 seconds | Vibeman SQLite reflects decisions |

### Phase 3: Remote Execution

| Test | Steps | Expected |
|------|-------|----------|
| Zen mode offline | Open Butler Batch module, Vibeman not in Zen | "Start Batch" disabled, status shows offline |
| Enter Zen mode | In Vibeman, go to /zen page | Command Center with 4 session panels |
| Healthcheck | Check Butler after Zen mode active | Status shows "ready", slots available |
| Browse requirements | In Butler Batch module | List of requirements with checkboxes |
| Select requirements | Tap checkboxes on 2-3 requirements | Selection count updates |
| Start batch | Tap "Start Batch" button | Vibeman auto-starts execution |
| Monitor execution | Watch Butler status bar | Shows running → completed/failed |
| Session slots | Check slot indicators in Butler | Busy slot shows as filled dot |

### Phase 4: Notifications

| Test | Steps | Expected |
|------|-------|----------|
| Task completion | Execute a batch with 1+ tasks | Push notification "Task Completed" |
| Task failure | Execute a batch that will fail | Push notification "Task Failed" |
| Batch summary | Wait for all tasks to finish | Push notification "Batch Complete" or "Batch Finished with Errors" |
| iOS foreground | Keep Butler open during batch | Notifications appear even in foreground |

### Phase 5: Emulator Mode

| Test | Steps | Expected |
|------|-------|----------|
| Emulator mode toggle | Click "Emulator" in mode selector | UI switches to emulator panel |
| Device registration | Click "Connect" in emulator mode | Device appears in mesh, status shows connected |
| Device discovery | Open Vibeman on second PC, connect | Both devices see each other in grid |
| Device selection | Click on a remote device | Device highlighted, "Target selected" message |
| Test command | Click "Send Test Ping" | Command sent successfully message |
| Heartbeat | Wait 30 seconds | Device status stays online |
| Disconnect | Click "Disconnect" | Device marked as offline |

---

## Quick E2E Test

**Full workflow in 5 minutes:**

1. **Vibeman**: Go to /zen → Online mode → Configure Supabase (if not done)
2. **Vibeman**: Sync directions → Sync requirements
3. **Butler**: Swipe to accept 2-3 directions
4. **Butler**: Select 1 requirement → Start Batch
5. **Watch**: Execution starts in Vibeman, notifications arrive in Butler
6. **Verify**: Batch completes, summary notification received

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Butler shows "disconnected" | Verify Supabase URL and anon key match in both apps |
| No "Multi-Device Sync Setup" panel | Switch to Online mode first using the toggle |
| Test Connection fails | Verify Supabase tables created (Step 1 SQL), check URL format |
| No directions in Butler | Click "Sync Directions" in Vibeman first |
| "Start Batch" always disabled | Ensure Vibeman is on /zen page with mode "online" |
| No notifications | Check iOS notification permissions in device settings |
| Decisions not syncing back | Decision poller runs every 60s, wait or check Vibeman logs |

---

## Success Criteria

All items below should pass:

### Core Functionality
- [ ] Vibeman connects to Supabase (via Zen → Multi-Device Sync Setup)
- [ ] Butler shows live connection status
- [ ] Directions sync from Vibeman → Supabase → Butler
- [ ] Swipe gestures update direction status
- [ ] Decisions sync back to Vibeman automatically
- [ ] Zen mode shows 4 CLI session panels
- [ ] Butler blocks batch start when Zen offline
- [ ] Butler enables batch start when Zen online
- [ ] Batch execution triggers automatically in Vibeman
- [ ] Push notifications arrive for task completion
- [ ] Push notifications arrive for task failure
- [ ] Batch summary notification shows final counts

### Emulator Mode (Mesh Network)
- [ ] Emulator mode shows device registration panel
- [ ] Device successfully registers with mesh network
- [ ] Multiple Vibeman instances discover each other
- [ ] Device selection works for targeting commands
- [ ] Test commands are sent and received successfully
- [ ] Heartbeat keeps device online status accurate
- [ ] Device properly unregisters on disconnect
