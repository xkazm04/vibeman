# Butler-Vibeman Remote Integration Guide

## Prerequisites

- **Vibeman** running on desktop (Next.js at localhost:3000)
- **Butler** installed on mobile device (Flutter app)
- **Supabase** project with anon key

---

## Step 1: Supabase Setup

Create these tables in your Supabase project:

```sql
-- Events from Vibeman to Butler
CREATE TABLE vibeman_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commands from Butler to Vibeman
CREATE TABLE vibeman_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  command_type TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE vibeman_events;
ALTER PUBLICATION supabase_realtime ADD TABLE vibeman_commands;
```

---

## Step 2: Configure Vibeman

1. Open Vibeman → **Integrations** module
2. Enter Supabase credentials:
   - Project URL: `https://your-project.supabase.co`
   - Anon Key: `your-anon-key`
   - Service Role Key (optional): for table validation
3. Click **Test Connection** → should show success
4. Save configuration

---

## Step 3: Configure Butler

1. Open Butler → **Settings** (gear icon)
2. Navigate to **Supabase Configuration**
3. Enter same credentials as Vibeman
4. Connection indicator should turn green (live)
5. Select your project from the dropdown

---

## Testing Checklist

### Phase 1: Connection

| Test | Steps | Expected |
|------|-------|----------|
| Vibeman connection | Click "Test Connection" in Integrations | Success message |
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

---

## Quick E2E Test

**Full workflow in 5 minutes:**

1. **Vibeman**: Sync directions → Sync requirements
2. **Butler**: Swipe to accept 2-3 directions
3. **Vibeman**: Enter Zen mode (/zen)
4. **Butler**: Select 1 requirement → Start Batch
5. **Watch**: Execution starts in Vibeman, notifications arrive in Butler
6. **Verify**: Batch completes, summary notification received

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Butler shows "disconnected" | Verify Supabase URL and anon key match |
| No directions in Butler | Click "Sync Directions" in Vibeman first |
| "Start Batch" always disabled | Ensure Vibeman is on /zen page with mode "online" |
| No notifications | Check iOS notification permissions in device settings |
| Decisions not syncing back | Decision poller runs every 60s, wait or check Vibeman logs |

---

## Success Criteria

All items below should pass:

- [ ] Vibeman connects to Supabase
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
