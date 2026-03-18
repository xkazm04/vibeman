# Context Update Skill

## Purpose

Manage project contexts after implementing changes. This skill enables you to:
- **Update** existing contexts with new/removed files
- **Create** new contexts for new feature areas
- **Split** large contexts (15+ files) into smaller, focused contexts
- **Assign** contexts to appropriate context groups
- **Create** new context groups when needed

## When to Use

Use this skill **ONLY** when you have **created or deleted files** during implementation.

**DO use when:**
- You created new files
- You deleted files
- You moved/renamed files

**DO NOT use when:**
- You only modified existing files (no file additions/deletions)
- Changes are trivial (typo fixes, small refactors)
- Tests fail and you're still debugging

**Non-blocking**: If any step fails, log the error and continue. Context updates should never block task completion.

## Decision Tree

```
Did you CREATE or DELETE any files?
│
├─ NO → Skip context update entirely
│
└─ YES → Continue with context update
         │
         ├─ New files belong to EXISTING context → Update Context (Step 4)
         │   └─ Context now has 15+ files? → Consider Split (Step 6)
         │
         └─ New files are NEW feature area → Create Context (Step 5)
             └─ Assign to group (Step 7) or Create group (Step 8)
```

## Instructions

### Step 1: Check If Update Needed

List files you **created** or **deleted**:

```
Created:
- src/app/features/NewFeature/Component.tsx

Deleted:
- src/app/features/Old/deprecated.ts
```

**If this list is empty (only modifications) → STOP. No context update needed.**

### Step 2: Fetch Current State

```bash
curl -X GET "http://localhost:3000/api/contexts?projectId={{PROJECT_ID}}"
```

```bash
curl -X GET "http://localhost:3000/api/context-groups?projectId={{PROJECT_ID}}"
```

If either request fails, log error and continue without context update.

### Step 3: Determine Action

For each created/deleted file, check if it belongs to an existing context:

- **Created file matches existing context** → Update that context (Step 4)
- **Deleted file was in a context** → Update that context (Step 4)
- **Created files form new feature area** → Create new context (Step 5)

---

### Step 4: Update Existing Context

#### 4.1 Update File Paths

- Add newly created files
- Remove deleted files
- Use relative paths (e.g., `src/app/goals/page.tsx`)

#### 4.2 Update Description

Follow this structure:

```markdown
## Overview
[2-3 sentences describing the feature]

## Key Capabilities
- Capability 1
- Capability 2
- Capability 3

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| `file1.tsx` | Description | UI |
| `file2.ts` | Description | Service |

### Data Flow
[How data flows through the system]

### Key Dependencies
- External: [packages]
- Internal: [other contexts]

## Technical Details

### State Management
[Zustand, hooks, etc.]

### API Endpoints
[If applicable]

### Database Tables
[If applicable]
```

#### 4.3 Execute Update

```bash
curl -X PUT "http://localhost:3000/api/contexts" \
  -H "Content-Type: application/json" \
  -d '{"contextId":"<id>","updates":{"description":"...","filePaths":["..."]}}'
```

If update fails, log error and continue.

---

### Step 5: Create New Context

When created files form a new feature area with no matching context:

#### 5.1 Context Details

- **Name**: 2-4 words (e.g., "User Authentication")
- **Files**: All files for this feature (aim for 5-15)
- **Description**: Follow structure from Step 4.2

#### 5.2 Find Group

Match to existing group:

| Group Pattern | Context Type |
|---------------|--------------|
| "Features" / "Core" | Main functionality |
| "Components" / "UI" | Reusable UI |
| "Backend" / "API" | API routes |
| "Data" / "Database" | Data layer |
| "State" / "Stores" | State management |
| "Utilities" / "Lib" | Helpers |

No match? → Go to Step 8 first.

#### 5.3 Create Context

```bash
curl -X POST "http://localhost:3000/api/contexts" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"{{PROJECT_ID}}","groupId":"<id-or-null>","name":"Feature Name","description":"...","filePaths":["..."],"testScenario":null}'
```

If creation fails, log error and continue.

---

### Step 6: Split Large Context (Optional)

If a context exceeds 15 files after update, **consider** splitting.

**Only split if:**
- Context has 15+ files
- Clear logical boundaries exist
- Files serve distinctly different purposes

**How to split:**
1. Group files by purpose (UI / Logic / API / Data)
2. Update original context with first group
3. Create new contexts for remaining groups
4. Each context: 5-15 files, same group as original

**Naming**: "Original - Specific Area" (e.g., "Goals - Core", "Goals - Analytics")

If splitting fails at any step, log error and continue.

---

### Step 7: Assign Context to Group

If context has no group (`groupId: null`), assign to appropriate group:

```bash
curl -X PUT "http://localhost:3000/api/contexts" \
  -H "Content-Type: application/json" \
  -d '{"contextId":"<id>","updates":{"groupId":"<group-id>"}}'
```

If no group matches, go to Step 8.

---

### Step 8: Create New Context Group

When no existing group fits:

```bash
curl -X POST "http://localhost:3000/api/context-groups" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"{{PROJECT_ID}}","name":"Group Name","color":"#3b82f6","icon":"layers"}'
```

**Colors:**
- `#3b82f6` Blue: Core features
- `#10b981` Green: Backend/data
- `#8b5cf6` Purple: UI/frontend
- `#f97316` Orange: Utilities
- `#ec4899` Pink: Integrations

**Icons:** `layers`, `layout`, `server`, `database`, `code`, `settings`, `users`, `chart`, `shield`, `zap`

If creation fails, proceed with `groupId: null`.

---

### Step 9: Verify (Optional)

```bash
curl -X GET "http://localhost:3000/api/contexts?projectId={{PROJECT_ID}}"
```

Quick check that updates applied. If verification fails, log and continue.

---

## Test Scenario Format (UI Features Only)

For contexts with visible UI, optionally include:

```json
[
  {"type":"navigate","url":"http://localhost:{{PORT}}"},
  {"type":"wait","delay":3000},
  {"type":"click","selector":"[data-testid='feature-btn']"},
  {"type":"wait","delay":1500}
]
```

Set to `null` for backend-only contexts.

---

## Error Handling

**All errors are non-blocking.** If any API call fails:
1. Log the error message
2. Continue with next step
3. Complete the implementation task

Context updates are helpful but not critical to task success.

---

## Quick Reference

| Situation | Action |
|-----------|--------|
| Only modified files | Skip context update |
| Created files in existing feature | Update existing context |
| Created new feature area | Create new context |
| Context has 15+ files | Consider splitting |
| No matching group | Create new group |
| API call fails | Log error, continue |
