# Phase 1 Plan 1: Supabase Integration Enhancement Summary

**Status:** Complete
**Duration:** ~3 minutes
**Completed:** 2026-01-27

## One-liner

Service Role Key field + table validation for Supabase Remote Message Broker integration

## What Was Implemented

### Task 1: Add Service Role Key field to Supabase integration form

Added a new "Service Role Key (optional)" password input field in the Supabase case of `renderConfigFields()`. The field includes helper text explaining it's required to validate that remote message broker tables exist.

**Changes:**
- Wrapped existing Anon Key field in a React fragment with the new Service Role Key field
- Added explanatory helper text below the field

### Task 2: Implement table validation in Supabase connector

Added validation logic to check for required Vibeman Remote Message Broker tables before allowing connection.

**Changes:**
- Added `REQUIRED_TABLES` constant: `['vibeman_events', 'vibeman_commands', 'vibeman_clients']`
- Added `tableExists()` helper function that queries a table with `?limit=0` to check existence
- Added `validateRequiredTables()` function that checks all required tables
- Updated `testConnection()` to call table validation before the existing insert test
- Added `schemaRequired?: boolean` to the return type for UI to detect schema errors

### Task 3: Add schema display in error state

Enhanced the error message UI to show a "View Schema" button when the error contains "Missing required tables".

**Changes:**
- Added `ExternalLink` icon import
- Updated error message div to show additional UI when tables are missing
- Added link to `docs/REMOTE_MESSAGE_BROKER.md#step-2-run-sql-schema`
- Added helper text explaining users need to run SQL in Supabase SQL Editor

## Files Modified

| File | Changes |
|------|---------|
| `src/app/features/Integrations/components/IntegrationDetailPanel.tsx` | Added Service Role Key field, schema link in error state |
| `src/app/db/models/integration.types.ts` | Added `schemaRequired` to `IntegrationConnector.testConnection()` return type |
| `src/lib/integrations/connectors/supabase.ts` | Added `validateRequiredTables()`, `tableExists()`, updated `testConnection()` |

## Verification Results

1. `npx tsc --noEmit` - No type errors
2. `npm run lint` - No lint errors
3. All changes committed successfully

## Commits

| Hash | Message |
|------|---------|
| 830ec2f | feat(01-01): add Supabase table validation for remote message broker |

## Deviations from Plan

None - plan executed exactly as written.

## Must-Have Truths Verification

- [x] User can enter Supabase URL, Anon Key, and Service Role Key in Vibeman Integrations module
- [x] User can click 'Test Connection' and see success (green checkmark) or failure (red X with reason)
- [x] On save, Vibeman validates that required Supabase tables exist
- [x] If tables missing, user sees SQL schema link to copy and run in Supabase SQL Editor

## Next Steps

Ready for Plan 01-02: Remote Message Broker Setup API
