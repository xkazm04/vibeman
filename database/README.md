# Database Setup

This directory contains the database schema and setup instructions for the Vibe project.

## Prerequisites

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Get your project URL and anon key from the Supabase dashboard

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Database Schema

Run the SQL commands in `schema.sql` in your Supabase SQL editor:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Run the query

This will create:
- `goals` table for project goals
- `backlog_items` table for backlog proposals and custom items
- `event_log` table for event logging
- Appropriate indexes and triggers
- Sample data for testing

### 3. Row Level Security (RLS)

The schema includes basic RLS policies that allow all operations. In production, you should:

1. Set up proper authentication
2. Update RLS policies to restrict access based on user roles
3. Consider adding user management tables

## Database Structure

### Goals Table
- Stores project goals with order, status, and descriptions
- Linked to projects via `project_id` (references local project config)

### Backlog Items Table
- Stores both AI proposals and custom backlog items
- Optional relationship to goals via `goal_id`
- Supports different agent types and statuses

### Event Log Table
- Tracks system events and user actions
- Useful for debugging and audit trails

## Testing

The schema includes sample data for the 'vibeman-app' project. You can:

1. Start the development server: `npm run dev`
2. Navigate to the Goals or Backlog sections
3. Verify that data loads from the database
4. Test creating, updating, and deleting items

## Troubleshooting

If you encounter issues:

1. Check that your environment variables are correctly set
2. Verify your Supabase project is active
3. Ensure the schema was applied successfully
4. Check the browser console for any network errors
5. Verify that RLS policies allow your operations 