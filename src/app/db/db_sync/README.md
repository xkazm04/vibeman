# Supabase Database Sync

This directory contains the SQL scripts and utilities for syncing the local SQLite database to Supabase (PostgreSQL cloud database).

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Wait for the project to be provisioned

### 2. Run the Schema Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase_schema.sql`
4. Paste and run the SQL script
5. Verify all tables are created successfully

### 3. Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these values:**
- **SUPABASE_URL**: Project Settings → API → Project URL
- **ANON_KEY**: Project Settings → API → anon public key
- **SERVICE_ROLE_KEY**: Project Settings → API → service_role secret key (⚠️ Keep this secret!)

### 4. Test the Connection

The sync UI will automatically detect if Supabase is configured. Look for the green indicator in the Scan Modal left panel.

## Sync Behavior

- **One-way sync**: SQLite → Supabase (local data is the source of truth)
- **Replace mode**: Each sync replaces all data in Supabase tables
- **Idempotent**: Safe to run multiple times
- **All or nothing**: If one table fails, the entire sync is rolled back

## Tables Synced

The following tables are synced to Supabase:

1. **projects** - Project configurations
2. **goals** - Development goals
3. **context_groups** - Context group organization
4. **contexts** - File contexts and documentation
5. **events** - System events and logs
6. **scans** - Scan history with token tracking
7. **ideas** - AI-generated ideas
8. **backlog_items** - Backlog and proposals
9. **implementation_log** - Implementation history

## Monitoring

The sync status is tracked in the `sync_metadata` table in Supabase, which stores:
- Last sync timestamp for each table
- Record count
- Sync status (success/failed/in_progress)
- Error messages if any

## Troubleshooting

### Sync fails with foreign key errors
**Solution**: Ensure tables are synced in the correct order (projects first, then dependent tables)

### Connection timeout
**Solution**: Check your internet connection and Supabase service status

### Authentication errors
**Solution**: Verify your environment variables are correct and the service role key has sufficient permissions

## Security Notes

⚠️ **Important**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS). Keep it secret and never commit it to version control!

For production use, consider:
1. Enabling RLS on all tables
2. Creating specific API keys with limited permissions
3. Implementing user authentication
4. Adding audit logging for sync operations
