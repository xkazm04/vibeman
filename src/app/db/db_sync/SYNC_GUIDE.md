# Supabase Sync Guide

This guide explains how to use the bidirectional sync between SQLite and Supabase.

## Overview

Vibeman now supports syncing data between your local SQLite database and Supabase cloud database. This allows you to:

- **Push to Cloud**: Sync all data from SQLite to Supabase (one-way sync)
- **Pull from Cloud**: Sync ideas from Supabase back to SQLite (reverse sync)
- **Share Data**: Access your data from multiple devices or share with team members

## Sync Directions

### 1. Push to Cloud (SQLite → Supabase)

**Location**: Scan Modal → Left Panel → "Supabase Sync" card

**What it does**:
- Syncs **all tables** from SQLite to Supabase
- Replaces all data in Supabase with local SQLite data
- Syncs: projects, goals, contexts, context_groups, events, scans, ideas, backlog_items, implementation_log

**When to use**:
- You want to backup your local data to the cloud
- You've made changes locally and want to share them
- You want to make your data accessible from other locations

**How it works**:
1. Deletes all existing data in each Supabase table
2. Inserts all data from local SQLite database
3. Updates sync metadata with timestamps and record counts

### 2. Pull from Cloud (Supabase → SQLite)

**Location**: Idea Tinder → Header → Cloud download button (left of project filter)

**What it does**:
- Syncs **ideas table only** from Supabase to SQLite
- Replaces all local ideas with Supabase data
- Preserves other local data (goals, contexts, etc.)

**When to use**:
- Someone else has pushed new ideas to Supabase
- You want to get the latest ideas from the cloud
- You're switching devices and want to pull shared ideas

**How it works**:
1. Fetches all ideas from Supabase
2. Deletes all existing ideas in local SQLite
3. Inserts all ideas from Supabase into SQLite
4. Refreshes the Tinder UI automatically

## Setup Instructions

### Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Run Schema Migration**: Execute `supabase_schema.sql` in Supabase SQL Editor
3. **Environment Variables**: Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find these values in **Supabase Dashboard → Project Settings → API**

### Verification

Once configured, you should see:
- ✅ Green cloud icon in Scan Modal → Supabase Sync card
- ✅ Cloud download button in Idea Tinder header

If not configured, these UI elements will be hidden.

## API Endpoints

### Push to Cloud

```http
POST /api/db-sync/sync
```

**Request Body** (optional):
```json
{
  "stopOnError": false
}
```

**Response**:
```json
{
  "success": true,
  "timestamp": "2025-01-30T12:34:56.789Z",
  "totalRecords": 1234,
  "results": [
    {
      "success": true,
      "tableName": "ideas",
      "recordCount": 456
    }
  ],
  "failedTables": []
}
```

### Pull from Cloud (Ideas)

```http
POST /api/db-sync/pull-ideas
```

**Response**:
```json
{
  "success": true,
  "message": "Ideas synced successfully from Supabase",
  "recordCount": 456,
  "deletedCount": 123
}
```

### Check Status

```http
GET /api/db-sync/status
```

**Response**:
```json
{
  "configured": true,
  "connected": true,
  "syncMetadata": [
    {
      "table_name": "ideas",
      "last_sync_at": "2025-01-30T12:34:56.789Z",
      "record_count": 456,
      "sync_status": "success",
      "error_message": null
    }
  ]
}
```

## Workflow Examples

### Scenario 1: Sharing Ideas with Team

**Person A** (creates ideas):
1. Generate ideas using AI scans
2. Click "Push to Cloud" in Scan Modal
3. All ideas are now in Supabase

**Person B** (receives ideas):
1. Go to Idea Tinder page
2. Click cloud download button in header
3. All ideas from Person A appear locally

### Scenario 2: Multi-Device Workflow

**On Device 1**:
1. Work on project, create goals and ideas
2. Push all data to cloud before leaving

**On Device 2**:
1. Pull ideas from cloud to start reviewing
2. Accept/reject ideas in Tinder
3. Push updated data back to cloud

**Back on Device 1**:
1. Pull ideas to get latest decisions
2. Continue working with synchronized data

### Scenario 3: Backup and Restore

**Backup**:
1. Click "Push to Cloud" periodically
2. All data safely stored in Supabase

**Restore** (after reinstall/data loss):
1. Configure Supabase env vars
2. Pull ideas from cloud
3. (Future: Add pull for other tables as needed)

## Important Notes

⚠️ **Data Replacement**
- Both push and pull perform **full replacement**
- All existing data in the target is deleted
- This ensures consistency but means you can't merge changes
- Always sync in one direction at a time

⚠️ **Ideas Only for Pull**
- Currently, only the ideas table supports pull sync
- Other tables (goals, contexts, etc.) are push-only
- This is by design to prevent accidental data loss

⚠️ **No Conflict Resolution**
- Last sync wins (no merge logic)
- If two people push different data, the last push overwrites
- Coordinate with team to avoid conflicts

⚠️ **Service Role Key Security**
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Never commit it to version control
- It bypasses Row Level Security (RLS)

## Troubleshooting

### Button Not Showing

**Problem**: Cloud download button doesn't appear in Tinder header

**Solution**:
1. Check `.env.local` has correct Supabase credentials
2. Restart dev server after adding env vars
3. Check browser console for connection errors

### Sync Fails

**Problem**: "Failed to sync ideas" error

**Solution**:
1. Verify Supabase project is active
2. Check internet connection
3. Verify SQL schema was run in Supabase
4. Check browser console for detailed error

### Empty Results

**Problem**: Pull sync completes but shows 0 ideas

**Solution**:
1. Check if Supabase actually has ideas (use Supabase Dashboard → Table Editor)
2. Try pushing from another device first
3. Verify API endpoint is returning data (check Network tab)

### Schema Mismatch

**Problem**: Errors about missing columns or tables

**Solution**:
1. Re-run `supabase_schema.sql` in Supabase SQL Editor
2. Check that SQLite migrations have run locally
3. Verify both databases have the same schema version

## Future Enhancements

Potential improvements to the sync system:

- [ ] Pull sync for other tables (goals, contexts, etc.)
- [ ] Incremental sync (only changed records)
- [ ] Conflict resolution and merge logic
- [ ] Sync history and rollback capability
- [ ] Multi-user collaboration features
- [ ] Real-time sync with Supabase Realtime
- [ ] Selective table sync (choose which tables to sync)
- [ ] Automatic periodic background sync
- [ ] Sync status notifications

## Technical Details

### Sync Order (Push)

Tables are synced in dependency order to respect foreign keys:

1. `projects` (no dependencies)
2. `context_groups` (depends on projects)
3. `contexts` (depends on context_groups)
4. `goals` (depends on contexts)
5. `events` (depends on projects)
6. `scans` (depends on projects)
7. `ideas` (depends on scans, contexts)
8. `backlog_items` (depends on goals)
9. `implementation_log` (depends on projects)

### Batch Processing

- Large datasets are synced in batches of 1000 records
- Prevents timeout and memory issues
- Progress logged to console

### Error Handling

- Each table sync is independent
- Failed tables don't stop the entire sync (unless `stopOnError: true`)
- Errors are logged to `sync_metadata` table
- Client receives detailed error information

## Support

For issues or questions:
1. Check browser console for detailed errors
2. Review Supabase logs in Dashboard
3. Verify environment variables are set correctly
4. Restart dev server and try again
